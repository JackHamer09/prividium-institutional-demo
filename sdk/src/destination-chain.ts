import { ethers } from 'ethers';
import {
  DestinationChainStatus,
  BundleStatus,
  ExpectedRoot,
  WaitOptions,
  EventSearchOptions,
} from './types';
import { InteropHandlerAbi, InteropRootStorageAbi } from './abis';
import {
  L2_INTEROP_HANDLER_ADDRESS,
  L2_INTEROP_ROOT_STORAGE_ADDRESS,
  DEFAULT_POLL_INTERVAL,
  DEFAULT_TIMEOUT,
} from './constants';

// BundleExecuted event signature: keccak256("BundleExecuted(bytes32)")
const BUNDLE_EXECUTED_TOPIC = ethers.id('BundleExecuted(bytes32)');

/**
 * Check if the interop root is available on the destination chain
 * @param provider - The provider for the destination chain
 * @param chainId - The source chain ID
 * @param batchNumber - The batch number
 * @returns The root if available, null otherwise
 */
export async function getInteropRoot(
  provider: ethers.Provider,
  chainId: bigint,
  batchNumber: number
): Promise<string | null> {
  const contract = new ethers.Contract(
    L2_INTEROP_ROOT_STORAGE_ADDRESS,
    InteropRootStorageAbi,
    provider
  );

  try {
    const root = await contract.interopRoots(chainId, batchNumber);
    if (
      root &&
      root !== ethers.ZeroHash
    ) {
      return root;
    }
  } catch {
    // Contract call failed
  }

  return null;
}

/**
 * Wait until the interop root becomes available on the destination chain
 * @param provider - The provider for the destination chain
 * @param expectedRoot - The expected root information
 * @param options - Wait options
 */
export async function waitUntilRootAvailable(
  provider: ethers.Provider,
  expectedRoot: ExpectedRoot,
  options: WaitOptions = {}
): Promise<void> {
  const pollInterval = options.pollInterval ?? DEFAULT_POLL_INTERVAL;
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  let retries = Math.floor(timeout / pollInterval);

  while (retries > 0) {
    const root = await getInteropRoot(provider, expectedRoot.rootChainId, expectedRoot.batchNumber);

    if (root !== null) {
      if (root.toLowerCase() === expectedRoot.expectedRoot.toLowerCase()) {
        return;
      } else {
        throw new Error(
          `Interop root mismatch: expected ${expectedRoot.expectedRoot}, got ${root}`
        );
      }
    }

    retries--;
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error('Interop root did not become available in time');
}

/**
 * Get the on-chain bundle status
 * @param provider - The provider for the destination chain
 * @param bundleHash - The bundle hash
 * @returns The bundle status (as number matching BundleStatus enum)
 */
export async function getBundleOnChainStatus(
  provider: ethers.Provider,
  bundleHash: string
): Promise<BundleStatus> {
  const contract = new ethers.Contract(
    L2_INTEROP_HANDLER_ADDRESS,
    InteropHandlerAbi,
    provider
  );

  try {
    const status = await contract.bundleStatus(bundleHash);
    return Number(status) as BundleStatus;
  } catch {
    return BundleStatus.Unreceived;
  }
}

/**
 * Get the full destination chain status for a bundle
 * @param provider - The provider for the destination chain
 * @param bundleHash - The bundle hash
 * @param expectedRoot - The expected root information
 * @returns The destination chain status
 */
export async function getBundleDestinationStatus(
  provider: ethers.Provider,
  bundleHash: string,
  expectedRoot: ExpectedRoot
): Promise<DestinationChainStatus> {
  // First check if root is available
  const root = await getInteropRoot(provider, expectedRoot.rootChainId, expectedRoot.batchNumber);

  if (root === null) {
    return DestinationChainStatus.Unavailable;
  }

  // Verify root matches
  if (root.toLowerCase() !== expectedRoot.expectedRoot.toLowerCase()) {
    throw new Error(
      `Interop root mismatch: expected ${expectedRoot.expectedRoot}, got ${root}`
    );
  }

  // Get on-chain status
  const status = await getBundleOnChainStatus(provider, bundleHash);

  switch (status) {
    case BundleStatus.Unreceived:
      return DestinationChainStatus.Unreceived;
    case BundleStatus.Verified:
      return DestinationChainStatus.Verified;
    case BundleStatus.FullyExecuted:
      return DestinationChainStatus.FullyExecuted;
    case BundleStatus.Unbundled:
      return DestinationChainStatus.Unbundled;
    default:
      return DestinationChainStatus.Unreceived;
  }
}

/**
 * Wait until a bundle is available for execution on the destination chain
 * @param provider - The provider for the destination chain
 * @param bundleHash - The bundle hash
 * @param expectedRoot - The expected root information
 * @param options - Wait options
 * @returns The destination chain status
 */
export async function waitForBundleAvailability(
  provider: ethers.Provider,
  bundleHash: string,
  expectedRoot: ExpectedRoot,
  options: WaitOptions = {}
): Promise<DestinationChainStatus> {
  // First wait for root to be available
  await waitUntilRootAvailable(provider, expectedRoot, options);

  // Return current status
  return getBundleDestinationStatus(provider, bundleHash, expectedRoot);
}

/**
 * Wait until a message can be verified on the destination chain
 * @param provider - The provider for the destination chain
 * @param expectedRoot - The expected root information
 * @param options - Wait options
 */
export async function waitForMessageVerifiability(
  provider: ethers.Provider,
  expectedRoot: ExpectedRoot,
  options: WaitOptions = {}
): Promise<void> {
  await waitUntilRootAvailable(provider, expectedRoot, options);
}

/**
 * Search for events in chunks, going backwards from the current block
 * This is useful when searching for events that may be far back in history
 * while respecting provider block range limits
 * @param provider - The provider to search on
 * @param address - The contract address to search
 * @param topics - The event topics to search for
 * @param options - Search options
 * @returns The matching logs or empty array if not found
 */
export async function searchEventInChunks(
  provider: ethers.Provider,
  address: string,
  topics: (string | null)[],
  options: EventSearchOptions = {}
): Promise<ethers.Log[]> {
  const chunkSize = options.chunkSize ?? 1000;
  const maxBlocksBack = options.maxBlocksBack ?? 50000;

  const currentBlock = await provider.getBlockNumber();
  const minBlock = Math.max(0, currentBlock - maxBlocksBack);

  let toBlock = currentBlock;

  while (toBlock >= minBlock) {
    const fromBlock = Math.max(minBlock, toBlock - chunkSize + 1);

    try {
      const logs = await provider.getLogs({
        address,
        topics,
        fromBlock,
        toBlock,
      });

      if (logs.length > 0) {
        return logs;
      }
    } catch {
      // Some providers have limits on block ranges, try smaller chunks
    }

    toBlock = fromBlock - 1;
  }

  return [];
}

/**
 * Wait for a bundle to be executed by an external executor
 * Polls the destination chain until the bundle status is FullyExecuted or Unbundled
 * Returns the transaction receipt of the execution
 * @param provider - The provider for the destination chain
 * @param bundleHash - The bundle hash to wait for
 * @param options - Wait options (pollInterval and timeout)
 * @returns The transaction receipt of the execution
 */
export async function waitForBundleExecution(
  provider: ethers.Provider,
  bundleHash: string,
  options: WaitOptions = {}
): Promise<ethers.TransactionReceipt> {
  const pollInterval = options.pollInterval ?? DEFAULT_POLL_INTERVAL;
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const status = await getBundleOnChainStatus(provider, bundleHash);

    if (status === BundleStatus.FullyExecuted || status === BundleStatus.Unbundled) {
      // Search for the BundleExecuted event in chunks (up to 50000 blocks back by default)
      const logs = await searchEventInChunks(
        provider,
        L2_INTEROP_HANDLER_ADDRESS,
        [BUNDLE_EXECUTED_TOPIC, bundleHash]
      );

      if (logs.length > 0) {
        // Get the transaction receipt from the most recent matching log
        const log = logs[logs.length - 1];
        const receipt = await provider.getTransactionReceipt(log.transactionHash);
        if (receipt) {
          return receipt;
        }
      }

      throw new Error(`Bundle ${bundleHash} was executed but could not find the BundleExecuted event`);
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error(`Timeout waiting for bundle ${bundleHash} to be executed`);
}
