import { ethers } from 'ethers';
import {
  SourceChainStatus,
  BundleHandle,
  MessageHandle,
  InteropMessageFinalizationInfo,
  InteropBundle,
  WaitOptions,
  ExtendedLogProof,
} from './types';
import { InteropCenterAbi, l1MessengerInterface } from './abis';
import {
  L2_INTEROP_CENTER_ADDRESS,
  L2_TO_L1_MESSENGER_ADDRESS,
  DEFAULT_POLL_INTERVAL,
  DEFAULT_TIMEOUT,
  BUNDLE_IDENTIFIER,
} from './constants';

/**
 * Parse InteropBundleSent event from transaction logs
 */
const interopBundleSentInterface = new ethers.Interface(InteropCenterAbi);

/**
 * Sleep utility function
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Make a raw JSON-RPC call to the provider
 * @param provider - The provider to use
 * @param method - The JSON-RPC method name
 * @param params - The parameters for the method
 * @returns The result of the RPC call
 */
async function sendRpcCall(
  provider: ethers.Provider,
  method: string,
  params: unknown[]
): Promise<unknown> {
  // Get the underlying connection URL from the provider
  // ethers v6 providers have a _getConnection method or we can use send directly
  if ('send' in provider && typeof provider.send === 'function') {
    return await provider.send(method, params);
  }
  throw new Error('Provider does not support raw RPC calls');
}

/**
 * Get the log proof for an L2 to L1 transaction
 * Reimplementation of zksync-ethers getLogProof using direct JSON-RPC
 * @param provider - The provider to use
 * @param txHash - The transaction hash
 * @param logIndex - The log index (default 0)
 * @returns The log proof or null if not available
 */
export async function getLogProof(
  provider: ethers.Provider,
  txHash: string,
  logIndex: number = 0
): Promise<ExtendedLogProof | null> {
  try {
    const result = await sendRpcCall(provider, 'zks_getL2ToL1LogProof', [
      ethers.hexlify(txHash),
      logIndex,
    ]);
    return result as ExtendedLogProof | null;
  } catch {
    return null;
  }
}

/**
 * Check if a transaction has been mined
 * @param provider - The provider to use
 * @param txHash - The transaction hash
 * @returns The receipt if mined, null otherwise
 */
async function getTransactionReceipt(
  provider: ethers.Provider,
  txHash: string
): Promise<ethers.TransactionReceipt | null> {
  try {
    return await provider.getTransactionReceipt(txHash);
  } catch {
    return null;
  }
}

/**
 * Check if a block has been finalized
 * @param provider - The provider to use
 * @param blockNumber - The block number to check
 * @returns True if finalized
 */
async function isBlockFinalized(provider: ethers.Provider, blockNumber: number): Promise<boolean> {
  try {
    const finalizedBlock = await provider.getBlock('finalized');
    return finalizedBlock !== null && finalizedBlock.number >= blockNumber;
  } catch {
    return false;
  }
}

/**
 * Wait for a block to be finalized
 * @param provider - The provider to use
 * @param blockNumber - The block number to wait for
 * @param options - Wait options
 */
export async function waitUntilBlockFinalized(
  provider: ethers.Provider,
  blockNumber: number,
  options: WaitOptions = {}
): Promise<void> {
  const pollInterval = options.pollInterval ?? DEFAULT_POLL_INTERVAL;
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  let retries = Math.floor(timeout / pollInterval);

  while (retries > 0) {
    if (await isBlockFinalized(provider, blockNumber)) {
      return;
    }
    retries--;
    await sleep(pollInterval);
  }

  throw new Error(`Block ${blockNumber} was not finalized in time`);
}

/**
 * Wait for L2 to L1 log proof to become available
 * @param provider - The provider to use
 * @param txHash - The transaction hash
 * @param logIndex - The log index (default 0)
 * @returns The log proof (with batch_number from the actual API response)
 */
export async function waitForLogProof(
  provider: ethers.Provider,
  txHash: string,
  logIndex: number = 0
): Promise<ExtendedLogProof> {
  // First wait for the transaction receipt
  const receipt = await provider.waitForTransaction(txHash);

  if (receipt === null) {
    throw new Error(`Transaction ${txHash} not found`);
  }

  // Wait for the block to be finalized
  await waitUntilBlockFinalized(provider, receipt.blockNumber);

  // Wait for the log proof using our custom implementation
  let proof = await getLogProof(provider, txHash, logIndex);
  while (proof === null) {
    await sleep(DEFAULT_POLL_INTERVAL);
    proof = await getLogProof(provider, txHash, logIndex);
  }

  return proof;
}

/**
 * Get the status of a bundle on the source chain
 * @param provider - The provider to use
 * @param handle - The bundle handle
 * @returns The source chain status
 */
export async function getBundleSourceStatus(
  provider: ethers.Provider,
  handle: BundleHandle
): Promise<SourceChainStatus> {
  // Check if transaction exists
  const receipt = await getTransactionReceipt(provider, handle.txHash);

  if (receipt === null) {
    return SourceChainStatus.Unknown;
  }

  // Check if the bundle hash is in the transaction logs
  let foundBundle = false;
  for (const log of receipt.logs) {
    try {
      const parsed = interopBundleSentInterface.parseLog({
        topics: log.topics as string[],
        data: log.data,
      });
      if (parsed && parsed.name === 'InteropBundleSent') {
        if (parsed.args.interopBundleHash === handle.bundleHash) {
          foundBundle = true;
          break;
        }
      }
    } catch {
      // Skip logs that don't match
    }
  }

  if (!foundBundle) {
    return SourceChainStatus.Invalid;
  }

  // Check if block is finalized
  if (await isBlockFinalized(provider, receipt.blockNumber)) {
    return SourceChainStatus.SourceFinalized;
  }

  return SourceChainStatus.SourceUnfinalized;
}

/**
 * Get the status of a message on the source chain
 * @param provider - The provider to use
 * @param handle - The message handle
 * @returns The source chain status
 */
export async function getMessageSourceStatus(
  provider: ethers.Provider,
  handle: MessageHandle
): Promise<SourceChainStatus> {
  // Check if transaction exists
  const receipt = await getTransactionReceipt(provider, handle.txHash);

  if (receipt === null) {
    return SourceChainStatus.Unknown;
  }

  // Check if the message hash is in the transaction logs (L1MessageSent event)
  const l1MessengerInterface = new ethers.Interface([
    'event L1MessageSent(address indexed _sender, bytes32 indexed _hash, bytes _message)',
  ]);

  let foundMessage = false;
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== L2_TO_L1_MESSENGER_ADDRESS.toLowerCase()) {
      continue;
    }
    try {
      const parsed = l1MessengerInterface.parseLog({
        topics: log.topics as string[],
        data: log.data,
      });
      if (parsed && parsed.name === 'L1MessageSent') {
        if (parsed.args._hash === handle.messageHash) {
          foundMessage = true;
          break;
        }
      }
    } catch {
      // Skip logs that don't match
    }
  }

  if (!foundMessage) {
    return SourceChainStatus.Invalid;
  }

  // Check if block is finalized
  if (await isBlockFinalized(provider, receipt.blockNumber)) {
    return SourceChainStatus.SourceFinalized;
  }

  return SourceChainStatus.SourceUnfinalized;
}

/**
 * Get the finalization info for a bundle
 * @param provider - The provider to use
 * @param handle - The bundle handle
 * @returns The finalization info
 */
export async function getBundleFinalizationInfo(
  provider: ethers.Provider,
  handle: BundleHandle
): Promise<InteropMessageFinalizationInfo> {
  // Get the transaction receipt
  const receipt = await provider.getTransactionReceipt(handle.txHash);
  if (receipt === null) {
    throw new Error(`Transaction ${handle.txHash} not found`);
  }

  // Extract the InteropBundle from the receipt logs (start from -1 as we count L1MessageSent logs from 0)
  let l1LogIndex = -1;
  let interopBundle: InteropBundle | null = null;
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() == L2_TO_L1_MESSENGER_ADDRESS.toLowerCase()) {
      try {
        const parsed = l1MessengerInterface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
        if (parsed && parsed.name === 'L1MessageSent') {
          l1LogIndex++;
          continue;
        }
      }
      catch {
        // Skip logs that don't match
      }
      continue;
    }


    try {
      const parsed = interopBundleSentInterface.parseLog({
        topics: log.topics as string[],
        data: log.data,
      });
      if (parsed && parsed.name === 'InteropBundleSent') {
        if (parsed.args.interopBundleHash === handle.bundleHash) {
          interopBundle = parsed.args.interopBundle;
          break;
        }
      }
    } catch {
      // Skip logs that don't match
    }
  }

  if (interopBundle === null) {
    throw new Error(`Bundle ${handle.bundleHash} not found in transaction ${handle.txHash}`);
  }

  // Wait for log proof
  const logProof = await waitForLogProof(provider, handle.txHash, l1LogIndex);

  // Encode the bundle
  const encodedBundle = ethers.AbiCoder.defaultAbiCoder().encode(
    [
      'tuple(bytes1 version, uint256 sourceChainId, uint256 destinationChainId, bytes32 interopBundleSalt, tuple(bytes1 version, bool shadowAccount, address to, address from, uint256 value, bytes data)[] calls, tuple(bytes executionAddress, bytes unbundlerAddress) bundleAttributes)',
    ],
    [interopBundle]
  );

  // Build the L2 to L1 message (InteropCenter prepends BUNDLE_IDENTIFIER)
  const l2ToL1Message = ethers.concat([BUNDLE_IDENTIFIER, encodedBundle]);

  return {
    expectedRoot: {
      rootChainId: handle.sourceChainId,
      batchNumber: logProof.batch_number,
      expectedRoot: logProof.root,
    },
    proof: {
      chainId: handle.sourceChainId,
      l1BatchNumber: logProof.batch_number,
      l2MessageIndex: logProof.id,
      message: {
        txNumberInBatch: receipt.index,
        sender: L2_INTEROP_CENTER_ADDRESS,
        data: l2ToL1Message,
      },
      proof: logProof.proof,
    },
    encodedData: encodedBundle,
  };
}

/**
 * Get the finalization info for a message
 * @param provider - The provider to use
 * @param handle - The message handle
 * @param senderAddress - The address that sent the message
 * @param messageData - The original message data
 * @returns The finalization info
 */
export async function getMessageFinalizationInfo(
  provider: ethers.Provider,
  handle: MessageHandle,
  senderAddress: string,
  messageData: string
): Promise<InteropMessageFinalizationInfo> {
  // Get the transaction receipt
  const receipt = await provider.getTransactionReceipt(handle.txHash);
  if (receipt === null) {
    throw new Error(`Transaction ${handle.txHash} not found`);
  }

  // Wait for log proof
  const logProof = await waitForLogProof(provider, handle.txHash, 0);

  return {
    expectedRoot: {
      rootChainId: handle.sourceChainId,
      batchNumber: logProof.batch_number,
      expectedRoot: logProof.root,
    },
    proof: {
      chainId: handle.sourceChainId,
      l1BatchNumber: logProof.batch_number,
      l2MessageIndex: logProof.id,
      message: {
        txNumberInBatch: receipt.index,
        sender: senderAddress,
        data: messageData,
      },
      proof: logProof.proof,
    },
    encodedData: messageData,
  };
}

/**
 * Wait until a bundle is finalized on the source chain and return the finalization info
 * @param provider - The provider to use
 * @param handle - The bundle handle
 * @param options - Wait options
 * @returns The finalization info
 */
export async function waitForBundleFinalization(
  provider: ethers.Provider,
  handle: BundleHandle,
  options: WaitOptions = {}
): Promise<InteropMessageFinalizationInfo> {
  const pollInterval = options.pollInterval ?? DEFAULT_POLL_INTERVAL;
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const status = await getBundleSourceStatus(provider, handle);
    if (status === SourceChainStatus.SourceFinalized) {
      return getBundleFinalizationInfo(provider, handle);
    }

    if (status === SourceChainStatus.Invalid) {
      throw new Error(`Bundle ${handle.bundleHash} not found in transaction ${handle.txHash}`);
    }

    await sleep(pollInterval);
  }

  throw new Error('Timed out waiting for bundle finalization');
}

/**
 * Wait until a message is finalized on the source chain and return the finalization info
 * @param provider - The provider to use
 * @param handle - The message handle
 * @param senderAddress - The address that sent the message
 * @param messageData - The original message data
 * @param options - Wait options
 * @returns The finalization info
 */
export async function waitForMessageFinalization(
  provider: ethers.Provider,
  handle: MessageHandle,
  senderAddress: string,
  messageData: string,
  options: WaitOptions = {}
): Promise<InteropMessageFinalizationInfo> {
  const pollInterval = options.pollInterval ?? DEFAULT_POLL_INTERVAL;
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const status = await getMessageSourceStatus(provider, handle);

    if (status === SourceChainStatus.SourceFinalized) {
      return getMessageFinalizationInfo(provider, handle, senderAddress, messageData);
    }

    if (status === SourceChainStatus.Invalid) {
      throw new Error(`Message ${handle.messageHash} not found in transaction ${handle.txHash}`);
    }

    await sleep(pollInterval);
  }

  throw new Error('Timed out waiting for message finalization');
}
