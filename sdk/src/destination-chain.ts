import { ethers } from 'ethers';
import {
  DestinationChainStatus,
  BundleStatus,
  ExpectedRoot,
  WaitOptions,
} from './types';
import { InteropHandlerAbi, InteropRootStorageAbi } from './abis';
import {
  L2_INTEROP_HANDLER_ADDRESS,
  L2_INTEROP_ROOT_STORAGE_ADDRESS,
  DEFAULT_POLL_INTERVAL,
  DEFAULT_TIMEOUT,
} from './constants';

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
    console.log(`Fetched interop root for chainId ${chainId}, batchNumber ${batchNumber}: ${root}`);
    if (
      root &&
      root !== ethers.ZeroHash &&
      root !== '0x0000000000000000000000000000000000000000000000000000000000000000'
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
 * Check if a message can be verified on the destination chain
 * @param provider - The provider for the destination chain
 * @param expectedRoot - The expected root information
 * @returns True if the message can be verified
 */
export async function canVerifyMessage(
  provider: ethers.Provider,
  expectedRoot: ExpectedRoot
): Promise<boolean> {
  const root = await getInteropRoot(provider, expectedRoot.rootChainId, expectedRoot.batchNumber);

  if (root === null) {
    return false;
  }

  if (root.toLowerCase() !== expectedRoot.expectedRoot.toLowerCase()) {
    throw new Error(
      `Interop root mismatch: expected ${expectedRoot.expectedRoot}, got ${root}`
    );
  }

  return true;
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
