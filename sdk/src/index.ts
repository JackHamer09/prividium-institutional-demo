/**
 * zkSync Interop SDK
 *
 * A TypeScript SDK for cross-chain interoperability on zkSync Era.
 * Uses standard ethers.js providers - no zksync-ethers dependency required.
 *
 * The SDK is organized into separate modules for each stage of the interop flow:
 * - bundle-sender: Send bundles from source chain
 * - source-chain: Track bundle/message status and finalization on source chain
 * - destination-chain: Check root availability and bundle status on destination chain
 * - bundle-executor: Execute/verify bundles on destination chain
 * - message: Send and verify L1Messenger messages
 * - assets: Token/asset utilities for bridged tokens
 *
 * @example Using standalone functions (recommended for granular control):
 * ```typescript
 * import {
 *   sendBundle,
 *   waitForBundleFinalization,
 *   waitUntilRootAvailable,
 *   executeBundle,
 *   BundleBuilder,
 *   CallBuilder,
 * } from 'interop-sdk';
 * import { ethers } from 'ethers';
 *
 * // Setup
 * const sourceProvider = new ethers.JsonRpcProvider('https://source...');
 * const destProvider = new ethers.JsonRpcProvider('https://dest...');
 * const signer = new ethers.Wallet(privateKey, sourceProvider);
 * const destSigner = new ethers.Wallet(privateKey, destProvider);
 *
 * // 1. Build and send bundle
 * const builder = new BundleBuilder(destChainId)
 *   .addCall(new CallBuilder(targetAddress, calldata).build());
 * const handle = await sendBundle(signer, builder);
 *
 * // 2. Wait for finalization on source
 * const finalizationInfo = await waitForBundleFinalization(sourceProvider, handle);
 *
 * // 3. Wait for root on destination
 * await waitUntilRootAvailable(destProvider, finalizationInfo.expectedRoot);
 *
 * // 4. Execute on destination
 * const receipt = await executeBundle(destSigner, finalizationInfo);
 * ```
 *
 * @example Using InteropSDK convenience class:
 * ```typescript
 * import { createInteropSDK, BundleBuilder, CallBuilder } from 'interop-sdk';
 *
 * const sdk = createInteropSDK(sourceProvider, sourceSigner);
 * const { handle, finalizationInfo, executeReceipt } = await sdk.sendAndExecute(
 *   builder, destProvider, destSigner
 * );
 * ```
 */

// Convenience SDK class
export { InteropSDK, createInteropSDK } from './interop-sdk';

// Bundle sending and receipt extraction
export {
  sendBundle,
  sendRawBundle,
  extractBundlesFromReceipt,
  extractL1MessagesFromReceipt,
} from './bundle-sender';

// Bundle building
export {
  BundleBuilder,
  CallBuilder,
  AttributeSelectors,
  encodeBridgeBurnData,
  encodeAssetRouterDepositData,
  buildBridgeCalldata,
  createTokenTransferBundle,
} from './bundle-builder';

// Address encoding and shadow accounts
export {
  toChainReference,
  formatEvmV1,
  formatEvmV1WithAddress,
  formatEvmV1AddressOnly,
  parseEvmV1,
  computeAssetId,
  getShadowAccountAddress,
} from './address';

// Asset/Token utilities
export {
  getAssetId,
  getTokenAddress,
  computeNativeTokenAssetId,
  getBridgedTokenAddress,
} from './assets';

// Source chain operations
export {
  getBundleSourceStatus,
  getMessageSourceStatus,
  getBundleFinalizationInfo,
  waitForBundleFinalization,
  waitForMessageFinalization,
  waitUntilBlockFinalized,
  waitForLogProof,
  getLogProof,
} from './source-chain';

// Destination chain operations
export {
  getInteropRoot,
  waitUntilRootAvailable,
  getBundleOnChainStatus,
  getBundleDestinationStatus,
  waitForBundleAvailability,
  waitForMessageVerifiability,
  searchEventInChunks,
  waitForBundleExecution,
} from './destination-chain';

// Bundle execution
export {
  executeBundle,
  verifyBundle,
  getBundleFinalizationInfo as getBundleInfoFinalizationInfo,
  waitAndExecuteBundle,
  waitAndExecuteAllBundles,
} from './bundle-executor';

// Message operations
export {
  sendMessage,
  getMessageFinalizationInfo,
  waitForFinalization,
  verifyMessageInclusion,
  waitAndVerifyMessage,
} from './message';

// Types
export {
  SourceChainStatus,
  DestinationChainStatus,
  BundleStatus,
  BundleHandle,
  BundleInfo,
  MessageHandle,
  InteropMessageFinalizationInfo,
  ExpectedRoot,
  L2Message,
  MessageInclusionProof,
  InteropCallStarter,
  InteropCall,
  InteropBundle,
  BundleAttributesStruct,
  SendBundleOptions,
  ExecuteBundleOptions,
  WaitOptions,
  EventSearchOptions,
  ExtendedLogProof,
} from './types';

// Constants
export {
  L2_INTEROP_CENTER_ADDRESS,
  L2_INTEROP_HANDLER_ADDRESS,
  L2_INTEROP_ROOT_STORAGE_ADDRESS,
  L2_MESSAGE_VERIFICATION_ADDRESS,
  L2_ASSET_ROUTER_ADDRESS,
  L2_NATIVE_TOKEN_VAULT_ADDRESS,
  L2_TO_L1_MESSENGER_ADDRESS,
  L2_BRIDGEHUB_ADDRESS,
  L2_MESSAGE_ROOT_ADDRESS,
  L2_BASE_TOKEN_ADDRESS,
  BUNDLE_IDENTIFIER,
  NEW_ENCODING_VERSION,
  INTEROP_BUNDLE_VERSION,
  INTEROP_CALL_VERSION,
  DEFAULT_POLL_INTERVAL,
  DEFAULT_TIMEOUT,
} from './constants';

// ABIs
export {
  InteropCenterAbi,
  InteropHandlerAbi,
  InteropRootStorageAbi,
  L1MessengerAbi,
  MessageVerificationAbi,
  NativeTokenVaultAbi,
  ERC20Abi,
} from './abis';
