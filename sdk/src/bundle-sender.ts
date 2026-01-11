import { ethers } from 'ethers';
import {
  BundleHandle,
  SendBundleOptions,
  InteropCallStarter,
} from './types';
import { InteropCenterAbi } from './abis';
import { L2_INTEROP_CENTER_ADDRESS } from './constants';
import { BundleBuilder } from './bundle-builder';

/**
 * InteropBundleSent event interface for parsing logs
 */
const interopBundleSentInterface = new ethers.Interface(InteropCenterAbi);

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
  const provider = signer.provider;
  if (!provider) {
    throw new Error('Signer must have a provider');
  }

  const chainId = (await provider.getNetwork()).chainId;

  // Create InteropCenter contract instance
  const interopCenter = new ethers.Contract(
    L2_INTEROP_CENTER_ADDRESS,
    InteropCenterAbi,
    signer
  );

  // Send the bundle
  const tx = await interopCenter.sendBundle(
    builder.getEncodedDestination(),
    builder.getCalls(),
    builder.getBundleAttributes(),
    {
      gasLimit: options.gasLimit ?? 5_000_000n,
      maxFeePerGas: options.maxFeePerGas ?? 1_000_000_000n,
      maxPriorityFeePerGas: options.maxPriorityFeePerGas ?? 0n,
      value: options.value ?? 0n,
    }
  );

  const receipt = await tx.wait();

  // Extract bundle hash from event
  const bundleHash = extractBundleHashFromReceipt(receipt);

  return {
    bundleHash,
    txHash: tx.hash,
    sourceChainId: chainId,
    blockNumber: receipt.blockNumber,
  };
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

  const tx = await interopCenter.sendBundle(destinationChainId, calls, bundleAttributes, {
    gasLimit: options.gasLimit ?? 5_000_000n,
    maxFeePerGas: options.maxFeePerGas ?? 1_000_000_000n,
    maxPriorityFeePerGas: options.maxPriorityFeePerGas ?? 0n,
    value: options.value ?? 0n,
  });

  const receipt = await tx.wait();

  // Extract bundle hash from event
  const bundleHash = extractBundleHashFromReceipt(receipt);

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
 * @returns The bundle hash
 */
function extractBundleHashFromReceipt(receipt: ethers.TransactionReceipt): string {
  for (const log of receipt.logs) {
    try {
      const parsed = interopBundleSentInterface.parseLog({
        topics: log.topics as string[],
        data: log.data,
      });
      if (parsed && parsed.name === 'InteropBundleSent') {
        return parsed.args.interopBundleHash;
      }
    } catch {
      // Skip logs that don't match
    }
  }

  throw new Error('InteropBundleSent event not found in transaction');
}
