# zkSync Interop SDK

A TypeScript SDK for cross-chain interoperability on zkSync Era. This SDK enables sending bundles of transactions across chains, bridging tokens, and verifying cross-chain messages.

## Features

- **Bundle Operations**: Build, send, and execute cross-chain transaction bundles
- **Token Bridging**: Bridge ERC20 tokens between zkSync chains via the Native Token Vault
- **Message Verification**: Send and verify cross-chain messages using L1Messenger
- **Shadow Accounts**: Execute transactions on behalf of users across chains (demo ONLY)
- **External Executor Support**: Wait for bundles to be executed by external executors

## Installation

> **Note** it has not yet been published to npm.

```bash
npm install interop-sdk ethers
```

## Quick Start

### Basic Bundle Transfer

```typescript
import { ethers } from 'ethers';
import {
  sendBundle,
  waitForBundleFinalization,
  waitUntilRootAvailable,
  executeBundle,
  BundleBuilder,
  CallBuilder,
  computeAssetId,
  buildBridgeCalldata,
  L2_ASSET_ROUTER_ADDRESS,
  L2_NATIVE_TOKEN_VAULT_ADDRESS,
} from 'interop-sdk';

// Setup providers and wallets
const sourceProvider = new ethers.JsonRpcProvider('https://source-chain-rpc...');
const destProvider = new ethers.JsonRpcProvider('https://dest-chain-rpc...');
const sourceSigner = new ethers.Wallet(privateKey, sourceProvider);
const destSigner = new ethers.Wallet(privateKey, destProvider);

const destChainId = (await destProvider.getNetwork()).chainId;
const sourceChainId = (await sourceProvider.getNetwork()).chainId;

// Build a token bridge bundle
const assetId = computeAssetId(sourceChainId, L2_NATIVE_TOKEN_VAULT_ADDRESS, tokenAddress);
const bridgeCalldata = buildBridgeCalldata(assetId, amount, recipientAddress);

const bundle = new BundleBuilder(destChainId)
  .addCall(
    new CallBuilder(L2_ASSET_ROUTER_ADDRESS, bridgeCalldata)
      .asIndirectCall(0n)
      .build()
  )
  .withUnbundler(destSigner.address);

// 1. Send bundle from source chain
const handle = await sendBundle(sourceSigner, bundle);
console.log('Bundle hash:', handle.bundleHash);

// 2. Wait for finalization on source chain
const finalizationInfo = await waitForBundleFinalization(sourceProvider, handle);
console.log('Finalized in batch:', finalizationInfo.expectedRoot.batchNumber);

// 3. Wait for root availability on destination chain
await waitUntilRootAvailable(destProvider, finalizationInfo.expectedRoot);

// 4. Execute bundle on destination chain
const receipt = await executeBundle(destSigner, finalizationInfo);
console.log('Executed:', receipt.hash);
```

### Using CallBuilder.tokenTransfer

For token bridging, use the convenient static method:

```typescript
import { BundleBuilder, CallBuilder, sendBundle } from 'interop-sdk';

// Create a token transfer call with one line
const call = CallBuilder.tokenTransfer(
  sourceChainId,    // Origin chain of the token
  tokenAddress,     // Token address on origin chain
  amount,           // Amount to transfer
  recipientAddress  // Receiver on destination chain
).build();

const bundle = new BundleBuilder(destChainId)
  .addCall(call)
  .withUnbundler(unbundlerAddress);

const handle = await sendBundle(sourceSigner, bundle);
```

### Waiting for External Execution

If you have an external executor service that processes bundles, you can wait for execution instead of executing yourself:

```typescript
import {
  sendBundle,
  waitForBundleFinalization,
  waitUntilRootAvailable,
  waitForBundleExecution
} from 'interop-sdk';

// Send and wait for finalization
const handle = await sendBundle(sourceSigner, bundle);
const finalizationInfo = await waitForBundleFinalization(sourceProvider, handle);
await waitUntilRootAvailable(destProvider, finalizationInfo.expectedRoot);

// Wait for external executor to execute the bundle
const receipt = await waitForBundleExecution(destProvider, handle.bundleHash);
console.log('Executed by external executor:', receipt.hash);
```

## API Reference

### Bundle Building

#### `BundleBuilder`

Builds interop bundles with multiple calls.

```typescript
const bundle = new BundleBuilder(destinationChainId)
  .addCall(call)                           // Add a regular call
  .addShadowAccountCall(to, data)          // Add a shadow account call (demo only)
  .withUnbundler(address)                  // Set unbundler address
  .withExecutor(address);                  // Set executor address
```

#### `CallBuilder`

Builds individual calls within a bundle.

```typescript
const call = new CallBuilder(targetAddress, calldata)
  .withValue(value)                        // Set value to send with the call
  .asIndirectCall(messageValue)            // Mark as indirect call (e.g., for bridge operations)
  .withShadowAccount()                     // Execute via shadow account (demo only)
  .build();

// Static helper for token transfers
const tokenCall = CallBuilder.tokenTransfer(
  sourceChainId,     // Origin chain ID of the token
  tokenAddress,      // Token address on origin chain
  amount,            // Amount to transfer
  receiverAddress    // Receiver on destination chain
).build();
```

#### `buildBridgeCalldata(assetId, amount, recipient, nativeValue?)`

Builds calldata for bridging tokens via the Asset Router.

### Bundle Sending

#### `sendBundle(signer, builder, options?)`

Sends a bundle to the destination chain.

```typescript
const handle = await sendBundle(signer, bundle, { value: 0n });
// Returns: BundleHandle { bundleHash, txHash, sourceChainId, blockNumber }
```

### Source Chain Operations

#### `waitForBundleFinalization(provider, handle, options?)`

Waits for a bundle to be finalized on the source chain and returns finalization info.

```typescript
const finalizationInfo = await waitForBundleFinalization(provider, handle, {
  pollInterval: 1000,  // Poll every 1 second
  timeout: 300000,     // Timeout after 5 minutes
});
```

#### `getBundleSourceStatus(provider, handle)`

Gets the current status of a bundle on the source chain.

```typescript
const status = await getBundleSourceStatus(provider, handle);
// Returns: SourceChainStatus.Unknown | Invalid | SourceUnfinalized | SourceFinalized
```

### Destination Chain Operations

#### `waitUntilRootAvailable(provider, expectedRoot, options?)`

Waits until the interop root is available on the destination chain.

#### `getBundleDestinationStatus(provider, bundleHash, expectedRoot)`

Gets the status of a bundle on the destination chain, including root availability.

```typescript
const status = await getBundleDestinationStatus(provider, bundleHash, expectedRoot);
// Returns: DestinationChainStatus.RootNotYetAvailable | RootAvailable | Verified | Executed
```

#### `waitForBundleExecution(provider, bundleHash, options?)`

Waits for a bundle to be executed by an external executor.

```typescript
const receipt = await waitForBundleExecution(provider, bundleHash, {
  pollInterval: 2000,
  timeout: 300000,
});
```

#### `searchEventInChunks(provider, address, topics, options?)`

Searches for events in chunks, useful for finding events far back in history.

```typescript
const logs = await searchEventInChunks(provider, contractAddress, topics, {
  chunkSize: 1000,      // Blocks per chunk
  maxBlocksBack: 50000, // Maximum blocks to search
});
```

### Bundle Execution

#### `executeBundle(signer, finalizationInfo, options?)`

Executes a bundle on the destination chain.

```typescript
const receipt = await executeBundle(signer, finalizationInfo);
```

#### `waitAndExecuteBundle(sourceProvider, destSigner, bundleInfo, options?)`

Waits for bundle finalization on source chain, root availability on destination chain, and executes the bundle.

```typescript
const receipt = await waitAndExecuteBundle(sourceProvider, destSigner, bundleInfo);
```

### Bundle Extraction and Finalization

#### `extractBundlesFromReceipt(receipt, sourceChainId)`

Extracts bundle info from a transaction receipt. Useful for finding bundles created by contract interactions.

```typescript
const bundles = extractBundlesFromReceipt(receipt, sourceChainId);
// Returns: BundleInfo[]
```

#### `getBundleFinalizationInfo(provider, bundleInfo)`

Gets finalization info from a bundle info extracted from receipt.

```typescript
const finalizationInfo = await getBundleFinalizationInfo(sourceProvider, bundleInfo);
```

#### `waitAndExecuteAllBundles(receipt, sourceChainId, sourceProvider, destSigner, options?)`

Waits for and executes all bundles found in a transaction receipt.

```typescript
const receipts = await waitAndExecuteAllBundles(
  receipt,
  sourceChainId,
  sourceProvider,
  destSigner
);
```

### Asset/Token Operations

#### `getAssetId(provider, tokenAddress)`

Gets the asset ID for a token.

#### `getTokenAddress(provider, assetId)`

Gets the token address for an asset ID.

#### `computeAssetId(chainId, ntvAddress, tokenAddress)`

Computes the asset ID for a token without on-chain call.

#### `computeNativeTokenAssetId(originChainId, tokenAddress)`

Computes the asset ID for a native token (uses the standard Native Token Vault address).

#### `getBridgedTokenAddress(originChainId, originTokenAddress, destProvider)`

Gets the bridged token address on a destination chain.

### Address Operations

#### `getShadowAccountAddress(provider, ownerChainId, ownerAddress)`

Gets the shadow account address for a user on a destination chain.

```typescript
const shadowAccount = await getShadowAccountAddress(
  destProvider,
  sourceChainId,
  userAddress
);
```

### Message Operations

#### `sendMessage(signer, messageData, options?)`

Sends a message via L1Messenger.

```typescript
const handle = await sendMessage(signer, messageHex);
// Returns: MessageHandle { messageHash, txHash, sourceChainId, blockNumber }
```

#### `verifyMessageInclusion(provider, finalizationInfo)`

Verifies that a message is included in the destination chain.

```typescript
const isVerified = await verifyMessageInclusion(destProvider, finalizationInfo);
```

## Shadow Accounts

> **Note**: Shadow accounts are currently only available for demo purposes. This feature allows users on one chain to execute transactions on another chain through a "shadow" representation of their account.

Shadow accounts enable cross-chain operations where a user from Chain B can interact with contracts on Chain A without physically being present on Chain A. The shadow account is a deterministic address derived from the user's address and origin chain ID.

### Getting a Shadow Account Address

```typescript
import { getShadowAccountAddress } from 'interop-sdk';

// Get the shadow account address for a user from Chain B on Chain A
const shadowAccount = await getShadowAccountAddress(
  providerA,      // Provider for the chain where the shadow account exists
  chainBId,       // Chain ID where the user's actual account exists
  userAddress     // User's address on their origin chain
);

console.log('Shadow account on Chain A:', shadowAccount);
```

### Executing via Shadow Account

```typescript
import {
  BundleBuilder,
  CallBuilder,
  sendBundle,
  waitForBundleFinalization,
  waitUntilRootAvailable,
  executeBundle,
} from 'interop-sdk';

// Build a bundle with shadow account calls
// This allows a user on Chain B to execute transactions on Chain A
const bundle = new BundleBuilder(chainAId)
  // First call: approve tokens via shadow account
  .addShadowAccountCall(tokenAddress, approveCalldata)
  // Second call: interact with a contract via shadow account
  .addShadowAccountCall(contractAddress, contractCalldata)
  .withUnbundler(unbundlerAddress);

// Or use CallBuilder directly with withShadowAccount()
const call = new CallBuilder(targetAddress, calldata)
  .withShadowAccount()
  .build();

// Send from Chain B
const handle = await sendBundle(signerB, bundle);
const finalizationInfo = await waitForBundleFinalization(providerB, handle);

// Wait for root and execute on Chain A
await waitUntilRootAvailable(providerA, finalizationInfo.expectedRoot);
const receipt = await executeBundle(signerA, finalizationInfo);
```

### Shadow Account Use Case: Cross-Chain Lending

See the `repo-contract-demo` for a complete example of using shadow accounts for cross-chain lending:

1. A borrower on Chain B wants to accept a lending offer on Chain A
2. The borrower's shadow account on Chain A receives collateral tokens
3. The borrower sends a bundle from Chain B that executes via their shadow account on Chain A
4. The shadow account approves and deposits collateral, accepting the offer
5. Lent tokens are bridged back to the borrower on Chain B

## Examples

The SDK includes example scripts demonstrating common use cases:

### Bundle Transfer Example

Demonstrates sending an ERC20 token transfer via interop bundle.

```bash
cd sdk
npx ts-node examples/bundle-transfer.ts
```

Required environment variables:
- `PRIVATE_KEY`: Private key for the wallet
- `L2_RPC_URL`: RPC URL for source chain
- `L2_RPC_URL_SECOND`: RPC URL for destination chain

See [examples/bundle-transfer.ts](examples/bundle-transfer.ts) for the full implementation.

### Message Verification Example

Demonstrates sending a message via L1Messenger and verifying it on the destination chain.

```bash
cd sdk
npx ts-node examples/message-verify.ts
```

See [examples/message-verify.ts](examples/message-verify.ts) for the full implementation.

## Constants

The SDK exports commonly used contract addresses:

```typescript
import {
  L2_INTEROP_CENTER_ADDRESS,        // InteropCenter contract
  L2_INTEROP_HANDLER_ADDRESS,       // InteropHandler contract
  L2_INTEROP_ROOT_STORAGE_ADDRESS,  // InteropRootStorage contract
  L2_ASSET_ROUTER_ADDRESS,          // AssetRouter contract
  L2_NATIVE_TOKEN_VAULT_ADDRESS,    // NativeTokenVault contract
  L2_TO_L1_MESSENGER_ADDRESS,       // L1Messenger contract
  L2_MESSAGE_VERIFICATION_ADDRESS,  // MessageVerification contract
  L2_BRIDGEHUB_ADDRESS,             // Bridgehub contract
  L2_MESSAGE_ROOT_ADDRESS,          // MessageRoot contract
  DEFAULT_POLL_INTERVAL,            // Default poll interval (1000ms)
  DEFAULT_TIMEOUT,                  // Default timeout (300000ms)
} from 'interop-sdk';
```

## ABIs

The SDK exports ABIs for interop contracts:

```typescript
import {
  InteropCenterAbi,
  InteropHandlerAbi,
  InteropRootStorageAbi,
  L1MessengerAbi,
  MessageVerificationAbi,
  NativeTokenVaultAbi,
  ERC20Abi,
} from 'interop-sdk';
```

## Types

Key types exported by the SDK:

```typescript
import {
  // Status enums
  SourceChainStatus,
  DestinationChainStatus,
  BundleStatus,

  // Handle types
  BundleHandle,
  MessageHandle,
  BundleInfo,

  // Finalization types
  InteropMessageFinalizationInfo,
  ExpectedRoot,
  MessageInclusionProof,

  // Bundle types
  InteropCallStarter,
  InteropCall,
  InteropBundle,
  BundleAttributesStruct,

  // Options types
  SendBundleOptions,
  ExecuteBundleOptions,
  WaitOptions,
  EventSearchOptions,
} from 'interop-sdk';
```

## Error Handling

The SDK throws descriptive errors for common failure cases:

```typescript
try {
  const receipt = await executeBundle(signer, finalizationInfo);
} catch (error) {
  if (error.message.includes('already been executed')) {
    console.log('Bundle was already executed');
  } else if (error.message.includes('has been unbundled')) {
    console.log('Bundle was unbundled and cannot be executed as a whole');
  } else {
    throw error;
  }
}
```

## Development

```bash
# Install dependencies
npm install

# Build the SDK
npm run build

# Clean build artifacts
npm run clean
```

## Requirements

- Node.js >= 16
- ethers.js >= 6.0.0

## License

MIT
