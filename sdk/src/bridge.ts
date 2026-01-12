/**
 * Bridge bundle utilities
 *
 * This module provides functions for extracting and processing bridge bundles
 * from transaction receipts, and high-level finalization/execution helpers.
 */

import { ethers } from 'ethers';
import { l1MessengerInterface, interopBundleSentInterface } from './abis';
import {
  L2_INTEROP_CENTER_ADDRESS,
  L2_TO_L1_MESSENGER_ADDRESS,
} from './constants';
import {
  BridgeBundleInfo,
  WaitOptions,
  ExecuteBundleOptions,
  InteropMessageFinalizationInfo,
} from './types';
import { getBundleFinalizationInfo } from './source-chain';
import { waitUntilRootAvailable } from './destination-chain';
import { executeBundle } from './bundle-executor';

// Re-export asset functions from assets.ts for backwards compatibility
export {
  getAssetId,
  getTokenAddress,
  computeTokenAssetId,
  getBridgedTokenAddress,
} from './assets';

// Re-export BridgeBundleInfo type
export type { BridgeBundleInfo } from './types';

/**
 * Extract InteropBundleSent events from a transaction receipt
 * @param receipt - The transaction receipt
 * @param sourceChainId - The source chain ID
 * @returns Array of bundle info found in the transaction
 */
export function extractBundlesFromReceipt(
  receipt: ethers.TransactionReceipt,
  sourceChainId: bigint
): BridgeBundleInfo[] {
  const bundles: BridgeBundleInfo[] = [];

  let l1LogIndex = 0;

  for (let i = 0; i < receipt.logs.length; i++) {
    const log = receipt.logs[i];

    // Counting the L1MessageSent logs to get the correct log index
    if (log.address.toLocaleLowerCase() == L2_TO_L1_MESSENGER_ADDRESS.toLocaleLowerCase()) {
      try {
        const parsed = l1MessengerInterface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });

        if (parsed && parsed.name === 'L1MessageSent') {
          l1LogIndex++;
        }
      }
      catch {
        // Skip logs that don't match
      }
      continue;
    }

    // Skip logs not from InteropCenter
    if (log.address.toLowerCase() !== L2_INTEROP_CENTER_ADDRESS.toLowerCase()) {
      continue;
    }

    try {
      const parsed = interopBundleSentInterface.parseLog({
        topics: log.topics as string[],
        data: log.data,
      });

      if (parsed && parsed.name === 'InteropBundleSent') {
        bundles.push({
          bundleHandle: {
            bundleHash: parsed.args.interopBundleHash,
            txHash: receipt.hash,
            sourceChainId,
            blockNumber: receipt.blockNumber,
          },
          l1MessageHash: parsed.args.l2l1MsgHash,
          l1LogIndex,
        });
      }
    } catch {
      // Skip logs that don't match
    }
  }

  return bundles;
}

/**
 * Extract L1MessageSent events from a transaction receipt
 * @param receipt - The transaction receipt
 * @returns Array of message hashes and their log indices
 */
export function extractL1MessagesFromReceipt(
  receipt: ethers.TransactionReceipt
): Array<{ messageHash: string; logIndex: number; sender: string }> {
  const messages: Array<{ messageHash: string; logIndex: number; sender: string }> = [];
  const L1_MESSENGER_ADDRESS = '0x0000000000000000000000000000000000008008';

  for (let i = 0; i < receipt.logs.length; i++) {
    const log = receipt.logs[i];

    // Skip logs not from L1Messenger
    if (log.address.toLowerCase() !== L1_MESSENGER_ADDRESS.toLowerCase()) {
      continue;
    }

    try {
      const parsed = l1MessengerInterface.parseLog({
        topics: log.topics as string[],
        data: log.data,
      });

      if (parsed && parsed.name === 'L1MessageSent') {
        messages.push({
          messageHash: parsed.args._hash,
          logIndex: i,
          sender: parsed.args._sender,
        });
      }
    } catch {
      // Skip logs that don't match
    }
  }

  return messages;
}

/**
 * Wait for a bridge bundle to be finalized and get finalization info
 * @param provider - The source chain provider
 * @param bundleInfo - The bridge bundle info extracted from receipt
 * @param options - Wait options
 * @returns The finalization info
 */
export async function waitForBridgeBundleFinalization(
  provider: ethers.Provider,
  bundleInfo: BridgeBundleInfo,
  options: WaitOptions = {}
): Promise<InteropMessageFinalizationInfo> {
  const finalizationInfo = await getBundleFinalizationInfo(provider, bundleInfo.bundleHandle);

  // Double check just in case.
  const msgHash = ethers.keccak256(finalizationInfo.proof.message.data);
  if (msgHash !== bundleInfo.l1MessageHash) {
    throw new Error(
      `L1 message hash mismatch: expected ${bundleInfo.l1MessageHash}, got ${msgHash}`
    );
  }

  return finalizationInfo;
}

/**
 * Finalize and execute a bridge bundle on the destination chain
 * @param sourceProvider - The source chain provider
 * @param destSigner - The signer for the destination chain
 * @param bundleInfo - The bridge bundle info extracted from receipt
 * @param options - Execution options
 * @returns The execution receipt
 */
export async function finalizeAndExecuteBridgeBundle(
  sourceProvider: ethers.Provider,
  destSigner: ethers.Signer,
  bundleInfo: BridgeBundleInfo,
  options: ExecuteBundleOptions & WaitOptions = {}
): Promise<ethers.TransactionReceipt> {
  const destProvider = destSigner.provider;
  if (!destProvider) {
    throw new Error('Signer must have a provider');
  }

  // Get finalization info
  const finalizationInfo = await waitForBridgeBundleFinalization(
    sourceProvider,
    bundleInfo,
    options
  );

  // Wait for root to be available on destination
  await waitUntilRootAvailable(destProvider, finalizationInfo.expectedRoot, options);

  // Execute the bundle
  return executeBundle(destSigner, finalizationInfo, options);
}

/**
 * Finalize and execute all bridge bundles from a transaction
 * This is useful when a transaction triggers multiple cross-chain transfers
 * @param receipt - The transaction receipt containing bridge bundles
 * @param sourceChainId - The source chain ID
 * @param sourceProvider - The source chain provider
 * @param destSigner - The signer for the destination chain
 * @param options - Execution options
 * @returns Array of execution receipts
 */
export async function finalizeAndExecuteAllBridgeBundles(
  receipt: ethers.TransactionReceipt,
  sourceChainId: bigint,
  sourceProvider: ethers.Provider,
  destSigner: ethers.Signer,
  options: ExecuteBundleOptions & WaitOptions = {}
): Promise<ethers.TransactionReceipt[]> {
  const bundles = extractBundlesFromReceipt(receipt, sourceChainId);

  if (bundles.length === 0) {
    return [];
  }

  const receipts: ethers.TransactionReceipt[] = [];

  for (const bundleInfo of bundles) {
    const execReceipt = await finalizeAndExecuteBridgeBundle(
      sourceProvider,
      destSigner,
      bundleInfo,
      options
    );
    receipts.push(execReceipt);
  }

  return receipts;
}
