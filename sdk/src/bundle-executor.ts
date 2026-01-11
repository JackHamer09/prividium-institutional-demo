import { ethers } from 'ethers';
import {
  InteropMessageFinalizationInfo,
  BundleHandle,
  ExecuteBundleOptions,
  BundleStatus,
  DestinationChainStatus,
} from './types';
import { InteropHandlerAbi } from './abis';
import { L2_INTEROP_HANDLER_ADDRESS } from './constants';
import {
  getBundleOnChainStatus,
  waitUntilRootAvailable,
} from './destination-chain';

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
    messageInclusionProof,
    {
      gasLimit: options.gasLimit ?? 10_000_000n,
      gasPrice: options.gasPrice ?? 1_000_000_000n,
    }
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
 * Calculate bundle hash from encoded data and source chain ID
 * @param sourceChainId - The source chain ID
 * @param encodedBundle - The encoded bundle data
 * @returns The bundle hash
 */
export function calculateBundleHash(sourceChainId: bigint, encodedBundle: string): string {
  return ethers.keccak256(
    ethers.solidityPacked(['uint256', 'bytes'], [sourceChainId, encodedBundle])
  );
}
