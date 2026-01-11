/**
 * PoC 2: Message Send and Verify
 *
 * This example demonstrates sending a message via L1Messenger.sendToL1
 * and verifying it on the destination chain using L2MessageVerification.
 *
 * Usage:
 *   npx ts-node examples/message-verify.ts
 *
 * Required environment variables:
 *   - PRIVATE_KEY: Private key for the wallet
 *   - L2_RPC_URL: RPC URL for chain A (source)
 *   - L2_RPC_URL_SECOND: RPC URL for chain B (destination)
 */

import { ethers } from 'ethers';
import {
  // Message operations
  sendMessage,
  waitForFinalization,
  verifyMessageInclusion,
  // Source chain tracking
  getMessageSourceStatus,
  // Destination chain tracking
  waitUntilRootAvailable,
  // Types
  SourceChainStatus,
} from '../src';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

async function main() {
  const PRIVATE_KEY = requireEnv('PRIVATE_KEY');
  const L2_RPC_URL = requireEnv('L2_RPC_URL');
  const L2_RPC_URL_SECOND = requireEnv('L2_RPC_URL_SECOND');

  // Setup providers using standard ethers.js JsonRpcProvider
  const providerA = new ethers.JsonRpcProvider(L2_RPC_URL);
  const providerB = new ethers.JsonRpcProvider(L2_RPC_URL_SECOND);

  // Setup wallets
  const walletA = new ethers.Wallet(PRIVATE_KEY, providerA);

  console.log('Wallet address:', walletA.address);

  // Get chain IDs
  const chainAId = (await providerA.getNetwork()).chainId;
  const chainBId = (await providerB.getNetwork()).chainId;
  console.log('Source Chain ID:', chainAId);
  console.log('Destination Chain ID:', chainBId);

  // ---- Send a message ----
  console.log('\n=== SENDING MESSAGE ===');

  // Create a sample message
  const messageContent = ethers.toUtf8Bytes('Hello from Chain A! Timestamp: ' + Date.now());
  const messageHex = ethers.hexlify(messageContent);
  console.log('Message content:', ethers.toUtf8String(messageContent));
  console.log('Message hex:', messageHex);

  // 1. Send the message
  console.log('Sending message via L1Messenger...');
  const handle = await sendMessage(walletA, messageHex, {
    gasLimit: 1_000_000n,
    gasPrice: 1_000_000_000n,
  });

  console.log('Message sent!');
  console.log('Message hash:', handle.messageHash);
  console.log('Tx hash:', handle.txHash);
  console.log('Block number:', handle.blockNumber);

  // ---- Check source status ----
  console.log('\n=== CHECKING SOURCE STATUS ===');

  let status = await getMessageSourceStatus(providerA, handle);
  console.log('Initial status:', SourceChainStatus[status]);

  // ---- Wait for finalization and verify ----
  console.log('\n=== WAITING FOR FINALIZATION ===');
  console.log('This may take a few minutes...');

  // 2. Wait for the message to be finalized on the source chain
  // The sender is the wallet address (the user who called sendToL1)
  const finalizationInfo = await waitForFinalization(
    providerA,
    handle,
    walletA.address,
    messageHex
  );

  console.log('Message finalized on source chain!');
  console.log('Batch number:', finalizationInfo.expectedRoot.batchNumber);
  console.log('Expected root:', finalizationInfo.expectedRoot.expectedRoot);
  console.log('L2 message index:', finalizationInfo.proof.l2MessageIndex);

  // ---- Wait for root on destination ----
  console.log('\n=== WAITING FOR ROOT ON DESTINATION ===');
  console.log('Waiting for interop root to become available...');

  // 3. Wait for root on destination
  await waitUntilRootAvailable(providerB, finalizationInfo.expectedRoot);
  console.log('Root is available on destination chain!');

  // ---- Verify message inclusion ----
  console.log('\n=== VERIFYING MESSAGE INCLUSION ===');

  // 4. Verify message inclusion
  const isVerified = await verifyMessageInclusion(providerB, finalizationInfo);

  if (isVerified) {
    console.log('Message verification SUCCESSFUL!');
    console.log('The message from chain A has been proven on chain B.');
  } else {
    console.log('Message verification FAILED!');
    console.log('The message could not be verified on chain B.');
  }

  // ---- Verification Summary ----
  console.log('\n=== VERIFICATION SUMMARY ===');
  console.log('Source chain ID:', handle.sourceChainId.toString());
  console.log('Message hash:', handle.messageHash);
  console.log('Batch number:', finalizationInfo.expectedRoot.batchNumber);
  console.log('Root:', finalizationInfo.expectedRoot.expectedRoot);
  console.log('Verification result:', isVerified ? 'VERIFIED' : 'NOT VERIFIED');

  console.log('\nMessage verification complete!');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
