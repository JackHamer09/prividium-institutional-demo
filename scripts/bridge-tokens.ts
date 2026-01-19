/**
 * Bridge a token from source chain to destination chain
 *
 * Usage:
 *   npm run bridge-token -- <TOKEN_ADDRESS> <AMOUNT> <RECIPIENT> <PRIVATE_KEY> <SOURCE_RPC> <DEST_RPC>
 *
 * This script bridges the specified amount of a token to the destination chain.
 * The caller must have sufficient token balance on the source chain.
 */

import { ethers } from 'ethers';
import {
  BundleBuilder,
  CallBuilder,
  computeAssetId,
  buildBridgeCalldata,
  L2_ASSET_ROUTER_ADDRESS,
  L2_NATIVE_TOKEN_VAULT_ADDRESS,
  ERC20Abi,
  sendBundle,
  waitForBundleFinalization,
  // waitUntilRootAvailable,
} from 'interop-sdk';

const TIMEOUT_MS = 90_000; // 1.5 minutes

function printUsage(): void {
  console.log('Usage: npm run bridge-token -- <TOKEN_ADDRESS> <AMOUNT> <RECIPIENT> <PRIVATE_KEY> <SOURCE_RPC> <DEST_RPC>');
  console.log('');
  console.log('Arguments:');
  console.log('  TOKEN_ADDRESS  Address of the token to bridge');
  console.log('  AMOUNT         Amount to bridge (in smallest unit, e.g., wei)');
  console.log('  RECIPIENT      Address to receive tokens on destination chain');
  console.log('  PRIVATE_KEY    Private key for signing transactions');
  console.log('  SOURCE_RPC     RPC URL of source chain (where token is deployed)');
  console.log('  DEST_RPC       RPC URL of destination chain');
  console.log('');
  console.log('Example:');
  console.log('  npm run bridge-token -- 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 1000000 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 0xac0974... http://localhost:3050 http://localhost:3051');
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 6) {
    printUsage();
    process.exit(1);
  }

  const [tokenAddress, amountStr, recipient, privateKey, sourceRpc, destRpc] = args;
  const bridgeAmount = BigInt(amountStr);

  // Setup providers
  const sourceProvider = new ethers.JsonRpcProvider(sourceRpc);
  const destProvider = new ethers.JsonRpcProvider(destRpc);

  // Setup wallet
  const sourceWallet = new ethers.Wallet(privateKey, sourceProvider);

  // Get chain IDs
  const sourceChainId = (await sourceProvider.getNetwork()).chainId;
  const destChainId = (await destProvider.getNetwork()).chainId;

  console.log('Wallet address:', sourceWallet.address);
  console.log('Source chain ID:', sourceChainId);
  console.log('Destination chain ID:', destChainId);
  console.log('Token address:', tokenAddress);
  console.log('Bridge amount:', bridgeAmount.toString());
  console.log('Recipient:', recipient);

  const token = new ethers.Contract(tokenAddress, ERC20Abi, sourceWallet);

  // Check balance
  const balance = await token.balanceOf(sourceWallet.address);
  console.log('Token balance:', balance.toString());
  if (balance < bridgeAmount) {
    console.error(`Insufficient balance: have ${balance.toString()}, need ${bridgeAmount.toString()}`);
    process.exit(1);
  }

  const unbundler = sourceWallet.address;

  // Approve NTV to spend tokens
  console.log('Approving NTV...');
  const approveTx = await token.approve(L2_NATIVE_TOKEN_VAULT_ADDRESS, bridgeAmount);
  await approveTx.wait();

  // Compute asset ID
  const assetId = computeAssetId(sourceChainId, L2_NATIVE_TOKEN_VAULT_ADDRESS, tokenAddress);
  console.log('Asset ID:', assetId);

  // Build bridge calldata
  const bridgeCalldata = buildBridgeCalldata(assetId, bridgeAmount, recipient, ethers.ZeroAddress);

  // Create bundle
  const bundle = new BundleBuilder(destChainId)
    .addCall(
      new CallBuilder(L2_ASSET_ROUTER_ADDRESS, bridgeCalldata)
        .asIndirectCall(0n)
        .build()
    )
    .withUnbundler(unbundler);

  // Send bundle
  console.log('Sending bridge bundle...');
  const handle = await sendBundle(sourceWallet, bundle);
  console.log('Bundle hash:', handle.bundleHash);
  console.log('Tx hash:', handle.txHash);

  // Wait for finalization
  console.log('Waiting for finalization...');
  const finalizationInfo = await waitForBundleFinalization(sourceProvider, handle);
  console.log('Bundle finalized! Batch:', finalizationInfo.expectedRoot.batchNumber);

  // Wait for root availability on destination
  // console.log('Waiting for root availability on destination...');
  // await waitUntilRootAvailable(destProvider, finalizationInfo.expectedRoot);
  // console.log('Root available on destination!');

  console.log('Token bridge initiated successfully!');
  console.log('The interop-relay will execute the bundle on the destination chain.');
}

// Set global timeout
const timeoutId = setTimeout(() => {
  console.error(`Error: Script timed out after ${TIMEOUT_MS / 1000} seconds`);
  process.exit(1);
}, TIMEOUT_MS);

main()
  .then(() => {
    clearTimeout(timeoutId);
    process.exit(0);
  })
  .catch((err) => {
    clearTimeout(timeoutId);
    console.error('Error:', err);
    process.exit(1);
  });
