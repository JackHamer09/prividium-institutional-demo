import { ethers } from 'ethers';
import {
  BundleHandle,
  BundleInfo,
  SendBundleOptions,
  InteropCallStarter,
} from './types';
import { InteropCenterAbi, l1MessengerInterface, interopBundleSentInterface } from './abis';
import { L2_INTEROP_CENTER_ADDRESS, L2_TO_L1_MESSENGER_ADDRESS } from './constants';
import { BundleBuilder } from './bundle-builder';

/**
 * Send a bundle to the destination chain using a BundleBuilder
 * @param signer - The signer to send the transaction
 * @param builder - The bundle builder with configured calls
 * @param options - Send options
 * @returns The bundle handle
 */
export async function sendBundle(
  signer: ethers.Signer,
  builder: BundleBuilder,
  options: SendBundleOptions = {}
): Promise<BundleHandle> {
  return sendRawBundle(
    signer,
    builder.getEncodedDestination(),
    builder.getCalls(),
    builder.getBundleAttributes(),
    options
  );
}

/**
 * Send raw bundle data (low-level)
 * @param signer - The signer to send the transaction
 * @param destinationChainId - Encoded destination chain ID
 * @param calls - Array of call starters
 * @param bundleAttributes - Bundle attributes
 * @param options - Send options
 * @returns The bundle handle
 */
export async function sendRawBundle(
  signer: ethers.Signer,
  destinationChainId: string,
  calls: InteropCallStarter[],
  bundleAttributes: string[],
  options: SendBundleOptions = {}
): Promise<BundleHandle> {
  const provider = signer.provider;
  if (!provider) {
    throw new Error('Signer must have a provider');
  }

  const chainId = (await provider.getNetwork()).chainId;

  const interopCenter = new ethers.Contract(
    L2_INTEROP_CENTER_ADDRESS,
    InteropCenterAbi,
    signer
  );

  // Build tx options, only include non-undefined values
  const txOptions: Record<string, bigint> = {};
  if (options.value !== undefined) txOptions.value = options.value;

  const tx = await interopCenter.sendBundle(destinationChainId, calls, bundleAttributes, txOptions);

  const receipt = await tx.wait();

  // Extract bundle hash from event
  const bundleHash = extractBundleHashFromReceipt(receipt, chainId);

  return {
    bundleHash,
    txHash: tx.hash,
    sourceChainId: chainId,
    blockNumber: receipt.blockNumber,
  };
}

/**
 * Extract bundle hash from transaction receipt logs
 * @param receipt - The transaction receipt
 * @param sourceChainId - The source chain ID
 * @returns The bundle hash
 */
function extractBundleHashFromReceipt(receipt: ethers.TransactionReceipt, sourceChainId: bigint): string {
  const bundles = extractBundlesFromReceipt(receipt, sourceChainId);
  if (bundles.length === 0) {
    throw new Error('InteropBundleSent event not found in transaction');
  }
  return bundles[0].bundleHandle.bundleHash;
}

/**
 * Extract InteropBundleSent events from a transaction receipt
 * @param receipt - The transaction receipt
 * @param sourceChainId - The source chain ID
 * @returns Array of bundle info found in the transaction
 */
export function extractBundlesFromReceipt(
  receipt: ethers.TransactionReceipt,
  sourceChainId: bigint
): BundleInfo[] {
  const bundles: BundleInfo[] = [];

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
