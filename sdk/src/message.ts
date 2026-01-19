import { ethers } from 'ethers';
import {
  MessageHandle,
  InteropMessageFinalizationInfo,
  WaitOptions,
} from './types';
import { L1MessengerAbi, MessageVerificationAbi } from './abis';
import {
  L2_TO_L1_MESSENGER_ADDRESS,
  L2_MESSAGE_VERIFICATION_ADDRESS,
} from './constants';
import {
  waitForLogProof,
  getMessageSourceStatus,
  waitForMessageFinalization,
} from './source-chain';
import { waitUntilRootAvailable } from './destination-chain';

/**
 * L1MessageSent event interface for parsing logs
 */
const l1MessageSentInterface = new ethers.Interface([
  'event L1MessageSent(address indexed _sender, bytes32 indexed _hash, bytes _message)',
]);

/**
 * Send a message to L1 via the L1Messenger contract
 * @param signer - The signer to use
 * @param message - The message data to send
 * @param options - Transaction options
 * @returns The message handle
 */
export async function sendMessage(
  signer: ethers.Signer,
  message: string,
  options: { gasLimit?: bigint; gasPrice?: bigint } = {}
): Promise<MessageHandle> {
  const provider = signer.provider;
  if (!provider) {
    throw new Error('Signer must have a provider');
  }

  const l1Messenger = new ethers.Contract(
    L2_TO_L1_MESSENGER_ADDRESS,
    L1MessengerAbi,
    signer
  );

  const tx = await l1Messenger.sendToL1(message, {
    gasLimit: options.gasLimit ?? 1_000_000n,
    gasPrice: options.gasPrice,
  });

  const receipt = await tx.wait();

  // Parse the L1MessageSent event to get the message hash
  let messageHash: string | null = null;
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== L2_TO_L1_MESSENGER_ADDRESS.toLowerCase()) {
      continue;
    }
    try {
      const parsed = l1MessageSentInterface.parseLog({
        topics: log.topics as string[],
        data: log.data,
      });
      if (parsed && parsed.name === 'L1MessageSent') {
        messageHash = parsed.args._hash;
        break;
      }
    } catch {
      // Skip logs that don't match
    }
  }

  if (messageHash === null) {
    throw new Error('L1MessageSent event not found in transaction');
  }

  const chainId = (await provider.getNetwork()).chainId;

  return {
    messageHash,
    txHash: tx.hash,
    sourceChainId: chainId,
    blockNumber: receipt.blockNumber,
  };
}

/**
 * Get finalization info for a message
 * @param provider - The source chain provider
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
 * Wait for message finalization on source chain
 * @param provider - The source chain provider
 * @param handle - The message handle
 * @param senderAddress - The address that sent the message
 * @param messageData - The original message data
 * @param options - Wait options
 * @returns The finalization info
 */
export async function waitForFinalization(
  provider: ethers.Provider,
  handle: MessageHandle,
  senderAddress: string,
  messageData: string,
  options: WaitOptions = {}
): Promise<InteropMessageFinalizationInfo> {
  return waitForMessageFinalization(provider, handle, senderAddress, messageData, options);
}

/**
 * Verify a message inclusion on the destination chain
 * @param provider - The destination chain provider
 * @param finalizationInfo - The finalization info
 * @returns True if the message is included
 */
export async function verifyMessageInclusion(
  provider: ethers.Provider,
  finalizationInfo: InteropMessageFinalizationInfo
): Promise<boolean> {
  const messageVerification = new ethers.Contract(
    L2_MESSAGE_VERIFICATION_ADDRESS,
    MessageVerificationAbi,
    provider
  );

  try {
    const isIncluded = await messageVerification.proveL2MessageInclusionShared(
      finalizationInfo.proof.chainId,
      finalizationInfo.proof.l1BatchNumber,
      finalizationInfo.proof.l2MessageIndex,
      {
        txNumberInBatch: finalizationInfo.proof.message.txNumberInBatch,
        sender: finalizationInfo.proof.message.sender,
        data: finalizationInfo.proof.message.data,
      },
      finalizationInfo.proof.proof
    );

    return isIncluded;
  } catch (error) {
    return false;
  }
}

/**
 * Wait for message to be verifiable on destination chain and verify it
 * @param sourceProvider - The source chain provider
 * @param destinationProvider - The destination chain provider
 * @param handle - The message handle
 * @param senderAddress - The address that sent the message
 * @param messageData - The original message data
 * @param options - Wait options
 * @returns True if verified successfully
 */
export async function waitAndVerifyMessage(
  sourceProvider: ethers.Provider,
  destinationProvider: ethers.Provider,
  handle: MessageHandle,
  senderAddress: string,
  messageData: string,
  options: WaitOptions = {}
): Promise<{ verified: boolean; finalizationInfo: InteropMessageFinalizationInfo }> {
  // Wait for finalization on source chain
  const finalizationInfo = await waitForFinalization(
    sourceProvider,
    handle,
    senderAddress,
    messageData,
    options
  );

  // Wait for root to be available on destination
  await waitUntilRootAvailable(destinationProvider, finalizationInfo.expectedRoot, options);

  // Verify the message
  const verified = await verifyMessageInclusion(destinationProvider, finalizationInfo);

  return { verified, finalizationInfo };
}

export { getMessageSourceStatus, waitForMessageFinalization } from './source-chain';
