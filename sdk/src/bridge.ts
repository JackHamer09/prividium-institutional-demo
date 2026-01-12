import { ethers } from 'ethers';
import { NativeTokenVaultAbi, InteropCenterAbi, L1MessengerAbi, l1MessengerInterface, interopBundleSentInterface } from './abis';
import {
  L2_NATIVE_TOKEN_VAULT_ADDRESS,
  L2_INTEROP_CENTER_ADDRESS,
  DEFAULT_POLL_INTERVAL,
  DEFAULT_TIMEOUT,
  L2_TO_L1_MESSENGER_ADDRESS,
} from './constants';
import { computeAssetId } from './address';
import {
  BundleHandle,
  InteropMessageFinalizationInfo,
  WaitOptions,
  ExecuteBundleOptions,
} from './types';
import { getBundleFinalizationInfo, waitForLogProof, getLogProof } from './source-chain';
import { waitUntilRootAvailable } from './destination-chain';
import { executeBundle } from './bundle-executor';
import { verifyMessageInclusion } from './message';


/**
 * Get the asset ID for a token on a specific chain
 * @param provider - The provider for the chain where the token exists
 * @param tokenAddress - The token address
 * @returns The asset ID (bytes32)
 */
export async function getAssetId(
  provider: ethers.Provider,
  tokenAddress: string
): Promise<string> {
  const ntvContract = new ethers.Contract(
    L2_NATIVE_TOKEN_VAULT_ADDRESS,
    NativeTokenVaultAbi,
    provider
  );

  return await ntvContract.assetId(tokenAddress);
}

/**
 * Get the token address for an asset ID on a specific chain
 * @param provider - The provider for the chain where to look up the token
 * @param assetId - The asset ID (bytes32)
 * @returns The token address (zero address if not registered)
 */
export async function getTokenAddress(
  provider: ethers.Provider,
  assetId: string
): Promise<string> {
  const ntvContract = new ethers.Contract(
    L2_NATIVE_TOKEN_VAULT_ADDRESS,
    NativeTokenVaultAbi,
    provider
  );

  return await ntvContract.tokenAddress(assetId);
}

/**
 * Compute the asset ID for a token given its origin chain and NTV address
 * This is useful when the token hasn't been queried from the chain yet
 * @param originChainId - The chain ID where the token originates
 * @param tokenAddress - The token address on the origin chain
 * @param ntvAddress - The NativeTokenVault address (defaults to standard address)
 * @returns The computed asset ID
 */
export function computeTokenAssetId(
  originChainId: bigint | number,
  tokenAddress: string,
  ntvAddress: string = L2_NATIVE_TOKEN_VAULT_ADDRESS
): string {
  return computeAssetId(originChainId, ntvAddress, tokenAddress);
}

/**
 * Information about a bridge bundle extracted from a transaction
 */
export interface BridgeBundleInfo {
  /** Bundle handle for tracking */
  bundleHandle: BundleHandle;
  /** L1 message hash from L1MessageSent event */
  l1MessageHash: string;
  /** Log index of the InteropBundleSent event. */
  l1LogIndex: number;
}

/**
 * Extract InteropBundleSent events from a transaction receipt
 * @param receipt - The transaction receipt
 * @param sourceChainId - The source chain ID
 * @returns Array of bundle handles found in the transaction
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

/**
 * Get the bridged token address on a destination chain
 * For tokens bridged via the Native Token Vault, this computes the expected
 * asset ID and looks up the corresponding token address on the destination chain.
 * @param originChainId - The chain ID where the token originates
 * @param originTokenAddress - The token address on the origin chain
 * @param destProvider - The provider for the destination chain
 * @returns The token address on the destination chain (zero address if not yet deployed)
 */
export async function getBridgedTokenAddress(
  originChainId: bigint | number,
  originTokenAddress: string,
  destProvider: ethers.Provider
): Promise<string> {
  const assetId = computeTokenAssetId(originChainId, originTokenAddress);
  return getTokenAddress(destProvider, assetId);
}
