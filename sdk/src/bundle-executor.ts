import { ethers } from 'ethers';
import {
  InteropMessageFinalizationInfo,
  BundleHandle,
  ExecuteBundleOptions,
  BundleStatus,
  WaitOptions,
  BridgeBundleInfo,
} from './types';
import { InteropHandlerAbi } from './abis';
import { L2_INTEROP_HANDLER_ADDRESS } from './constants';
import {
  getBundleOnChainStatus,
  waitUntilRootAvailable,
  waitForBundleExecution,
} from './destination-chain';
import { sendBundle } from './bundle-sender';
import { waitForBundleFinalization, getBundleFinalizationInfo } from './source-chain';
import { BundleBuilder } from './bundle-builder';

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
    messageInclusionProof,
    {
      gasLimit: options.gasLimit ?? 5_000_000n,
      gasPrice: options.gasPrice ?? 1_000_000_000n,
    }
  );

  const receipt = await tx.wait();

  if (receipt.status !== 1) {
    throw new Error(`Bundle verification failed: ${tx.hash}`);
  }

  return receipt;
}

/**
 * Wait for root availability and then execute a bundle
 * @param signer - The signer to use for the transaction
 * @param finalizationInfo - The finalization info from the source chain
 * @param options - Execution options
 * @returns The transaction receipt
 */
export async function waitAndExecuteBundle(
  signer: ethers.Signer,
  finalizationInfo: InteropMessageFinalizationInfo,
  options: ExecuteBundleOptions = {}
): Promise<ethers.TransactionReceipt> {
  const provider = signer.provider;
  if (!provider) {
    throw new Error('Signer must have a provider');
  }

  // Wait for root to be available
  await waitUntilRootAvailable(provider, finalizationInfo.expectedRoot);

  // Execute the bundle
  return executeBundle(signer, finalizationInfo, options);
}

/**
 * Options for sendAndExecuteBundle
 */
export interface SendAndExecuteBundleOptions extends ExecuteBundleOptions, WaitOptions {
  /** If true, wait for external executor instead of executing ourselves */
  waitForExternalExecution?: boolean;
}

/**
 * Complete bundle lifecycle: send bundle, wait for finalization, wait for root, and execute
 * This is a high-level convenience function that handles the entire cross-chain bundle flow
 * @param sourceSigner - The signer on the source chain (to send the bundle)
 * @param sourceProvider - The provider for the source chain (to wait for finalization)
 * @param destSigner - The signer on the destination chain (to execute the bundle)
 * @param destProvider - The provider for the destination chain (to wait for root)
 * @param bundle - The bundle to send and execute
 * @param options - Options for sending and executing
 * @returns The execution receipt on the destination chain
 */
export async function sendAndExecuteBundle(
  sourceSigner: ethers.Signer,
  sourceProvider: ethers.Provider,
  destSigner: ethers.Signer,
  destProvider: ethers.Provider,
  bundle: BundleBuilder,
  options: SendAndExecuteBundleOptions = {}
): Promise<ethers.TransactionReceipt> {
  // Send bundle
  console.log('Sending bundle...');
  const handle = await sendBundle(sourceSigner, bundle);
  console.log('Bundle hash:', handle.bundleHash);
  console.log('Tx hash:', handle.txHash);

  // Wait for finalization
  console.log('Waiting for finalization...');
  const finalizationInfo = await waitForBundleFinalization(sourceProvider, handle, options);
  console.log('Bundle finalized! Batch:', finalizationInfo.expectedRoot.batchNumber);

  // Wait for root availability
  console.log('Waiting for root availability on destination...');
  await waitUntilRootAvailable(destProvider, finalizationInfo.expectedRoot, options);
  console.log('Root available!');

  if (options.waitForExternalExecution) {
    // Wait for external executor and get the execution receipt
    const receipt = await waitForBundleExecution(destProvider, handle.bundleHash, options);
    console.log('Execute status:', receipt.status === 1 ? 'Success' : 'Failed');
    return receipt;
  } else {
    // Execute bundle ourselves
    console.log('Executing bundle...');
    const receipt = await executeBundle(destSigner, finalizationInfo, options);
    console.log('Execute tx hash:', receipt.hash);
    console.log('Execute status:', receipt.status === 1 ? 'Success' : 'Failed');
    return receipt;
  }
}

/**
 * Wait for a bridge bundle to be executed by an external executor
 * Waits for finalization on source chain, then waits for root availability on destination,
 * then polls for external execution status
 * @param sourceProvider - The provider for the source chain
 * @param destProvider - The provider for the destination chain
 * @param bundleInfo - The bridge bundle info extracted from receipt
 * @param options - Wait options
 * @returns The transaction receipt of the execution
 */
export async function waitForBridgeBundleExternalExecution(
  sourceProvider: ethers.Provider,
  destProvider: ethers.Provider,
  bundleInfo: BridgeBundleInfo,
  options: WaitOptions = {}
): Promise<ethers.TransactionReceipt> {
  console.log(`Waiting for external execution of bridge bundle: ${bundleInfo.bundleHandle.bundleHash}`);

  // Wait for finalization
  const finalizationInfo = await getBundleFinalizationInfo(sourceProvider, bundleInfo.bundleHandle);
  console.log('Bridge bundle finalized! Batch:', finalizationInfo.expectedRoot.batchNumber);

  // Wait for root availability on destination
  await waitUntilRootAvailable(destProvider, finalizationInfo.expectedRoot, options);
  console.log('Root available on destination!');

  // Wait for external executor to execute the bundle and return the receipt
  return await waitForBundleExecution(destProvider, bundleInfo.bundleHandle.bundleHash, options);
}
