import { ethers } from 'ethers';
import {
  InteropMessageFinalizationInfo,
  ExecuteBundleOptions,
  BundleStatus,
  BundleInfo,
  WaitOptions,
} from './types';
import { InteropHandlerAbi } from './abis';
import { L2_INTEROP_HANDLER_ADDRESS } from './constants';
import {
  getBundleOnChainStatus,
  waitUntilRootAvailable,
} from './destination-chain';
import { getBundleFinalizationInfo as getFinalizationInfoFromHandle } from './source-chain';
import { extractBundlesFromReceipt } from './bundle-sender';

/**
 * Execute a bundle on the destination chain
 * @param signer - The signer to use for the transaction
 * @param finalizationInfo - The finalization info from the source chain
 * @param options - Execution options
 * @returns The transaction receipt
 */
export async function executeBundle(
  signer: ethers.Signer,
  finalizationInfo: InteropMessageFinalizationInfo,
  options: ExecuteBundleOptions = {}
): Promise<ethers.TransactionReceipt> {
  const provider = signer.provider;
  if (!provider) {
    throw new Error('Signer must have a provider');
  }

  // Check current bundle status
  const bundleHash = ethers.keccak256(
    ethers.solidityPacked(
      ['uint256', 'bytes'],
      [finalizationInfo.proof.chainId, finalizationInfo.encodedData]
    )
  );

  const status = await getBundleOnChainStatus(provider, bundleHash);

  if (status === BundleStatus.FullyExecuted) {
    throw new Error(`Bundle ${bundleHash} has already been executed`);
  }

  if (status === BundleStatus.Unbundled) {
    throw new Error(
      `Bundle ${bundleHash} has been unbundled and cannot be executed as a whole`
    );
  }

  // Create contract instance
  const interopHandler = new ethers.Contract(
    L2_INTEROP_HANDLER_ADDRESS,
    InteropHandlerAbi,
    signer
  );

  // Build the message inclusion proof struct for the contract
  const messageInclusionProof = {
    chainId: finalizationInfo.proof.chainId,
    l1BatchNumber: finalizationInfo.proof.l1BatchNumber,
    l2MessageIndex: finalizationInfo.proof.l2MessageIndex,
    message: {
      txNumberInBatch: finalizationInfo.proof.message.txNumberInBatch,
      sender: finalizationInfo.proof.message.sender,
      data: finalizationInfo.proof.message.data,
    },
    proof: finalizationInfo.proof.proof,
  };

  // Send the transaction
  const tx = await interopHandler.executeBundle(
    finalizationInfo.encodedData,
    messageInclusionProof
  );

  const receipt = await tx.wait();

  if (receipt.status !== 1) {
    throw new Error(`Bundle execution failed: ${tx.hash}`);
  }

  return receipt;
}

/**
 * Verify a bundle on the destination chain (without executing)
 * @param signer - The signer to use for the transaction
 * @param finalizationInfo - The finalization info from the source chain
 * @param options - Execution options
 * @returns The transaction receipt
 */
export async function verifyBundle(
  signer: ethers.Signer,
  finalizationInfo: InteropMessageFinalizationInfo,
  options: ExecuteBundleOptions = {}
): Promise<ethers.TransactionReceipt> {
  const provider = signer.provider;
  if (!provider) {
    throw new Error('Signer must have a provider');
  }

  // Create contract instance
  const interopHandler = new ethers.Contract(
    L2_INTEROP_HANDLER_ADDRESS,
    InteropHandlerAbi,
    signer
  );

  // Build the message inclusion proof struct for the contract
  const messageInclusionProof = {
    chainId: finalizationInfo.proof.chainId,
    l1BatchNumber: finalizationInfo.proof.l1BatchNumber,
    l2MessageIndex: finalizationInfo.proof.l2MessageIndex,
    message: {
      txNumberInBatch: finalizationInfo.proof.message.txNumberInBatch,
      sender: finalizationInfo.proof.message.sender,
      data: finalizationInfo.proof.message.data,
    },
    proof: finalizationInfo.proof.proof,
  };

  // Send the transaction
  const tx = await interopHandler.verifyBundle(
    finalizationInfo.encodedData,
    messageInclusionProof
  );

  const receipt = await tx.wait();

  if (receipt.status !== 1) {
    throw new Error(`Bundle verification failed: ${tx.hash}`);
  }

  return receipt;
}

/**
 * Get finalization info from a bundle info extracted from a receipt
 * Also validates the L1 message hash
 * @param provider - The source chain provider
 * @param bundleInfo - The bundle info extracted from receipt
 * @returns The finalization info
 */
export async function getBundleFinalizationInfo(
  provider: ethers.Provider,
  bundleInfo: BundleInfo
): Promise<InteropMessageFinalizationInfo> {
  const finalizationInfo = await getFinalizationInfoFromHandle(provider, bundleInfo.bundleHandle);

  // Double check just in case
  const msgHash = ethers.keccak256(finalizationInfo.proof.message.data);
  if (msgHash !== bundleInfo.l1MessageHash) {
    throw new Error(
      `L1 message hash mismatch: expected ${bundleInfo.l1MessageHash}, got ${msgHash}`
    );
  }

  return finalizationInfo;
}

/**
 * Wait for bundle finalization on source chain, then wait for root availability
 * on destination chain, and execute the bundle.
 * @param sourceProvider - The source chain provider
 * @param destSigner - The signer for the destination chain
 * @param bundleInfo - The bundle info extracted from receipt
 * @param options - Execution options
 * @returns The execution receipt
 */
export async function waitAndExecuteBundle(
  sourceProvider: ethers.Provider,
  destSigner: ethers.Signer,
  bundleInfo: BundleInfo,
  options: ExecuteBundleOptions & WaitOptions = {}
): Promise<ethers.TransactionReceipt> {
  const destProvider = destSigner.provider;
  if (!destProvider) {
    throw new Error('Signer must have a provider');
  }

  // Get finalization info
  const finalizationInfo = await getBundleFinalizationInfo(
    sourceProvider,
    bundleInfo
  );

  // Wait for root to be available on destination
  await waitUntilRootAvailable(destProvider, finalizationInfo.expectedRoot, options);

  // Execute the bundle
  return executeBundle(destSigner, finalizationInfo, options);
}

/**
 * Wait for and execute all bundles from a transaction
 * This is useful when a transaction triggers multiple cross-chain transfers
 * @param receipt - The transaction receipt containing bundles
 * @param sourceChainId - The source chain ID
 * @param sourceProvider - The source chain provider
 * @param destSigner - The signer for the destination chain
 * @param options - Execution options
 * @returns Array of execution receipts
 */
export async function waitAndExecuteAllBundles(
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
    const execReceipt = await waitAndExecuteBundle(
      sourceProvider,
      destSigner,
      bundleInfo,
      options
    );
    receipts.push(execReceipt);
  }

  return receipts;
}
