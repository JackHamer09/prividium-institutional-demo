import { ethers } from 'ethers';
import {
  BundleHandle,
  InteropMessageFinalizationInfo,
  SendBundleOptions,
  ExecuteBundleOptions,
  WaitOptions,
  SourceChainStatus,
  DestinationChainStatus,
} from './types';
import { BundleBuilder } from './bundle-builder';
import { sendBundle } from './bundle-sender';
import {
  getBundleSourceStatus,
  waitForBundleFinalization,
} from './source-chain';
import {
  getBundleDestinationStatus,
  waitForBundleAvailability,
  waitUntilRootAvailable,
} from './destination-chain';
import { executeBundle } from './bundle-executor';

/**
 * Convenience class that composes all interop operations for a complete flow.
 *
 * For more granular control, use the standalone functions directly:
 * - sendBundle, sendRawBundle (from bundle-sender)
 * - getBundleSourceStatus, waitForBundleFinalization (from source-chain)
 * - getBundleDestinationStatus, waitForBundleAvailability, waitUntilRootAvailable (from destination-chain)
 * - executeBundle, verifyBundle, waitAndExecuteBundle (from bundle-executor)
 */
export class InteropSDK {
  constructor(
    private readonly sourceProvider: ethers.Provider,
    private readonly sourceSigner: ethers.Signer
  ) {}

  /**
   * Send a bundle to the destination chain
   */
  async sendBundle(
    builder: BundleBuilder,
    options: SendBundleOptions = {}
  ): Promise<BundleHandle> {
    return sendBundle(this.sourceSigner, builder, options);
  }

  /**
   * Get the status of a bundle on the source chain
   */
  async getSourceStatus(handle: BundleHandle): Promise<SourceChainStatus> {
    return getBundleSourceStatus(this.sourceProvider, handle);
  }

  /**
   * Wait for a bundle to be finalized on the source chain
   */
  async waitForFinalization(
    handle: BundleHandle,
    options: WaitOptions = {}
  ): Promise<InteropMessageFinalizationInfo> {
    return waitForBundleFinalization(this.sourceProvider, handle, options);
  }

  /**
   * Get the status of a bundle on the destination chain
   */
  async getDestinationStatus(
    destinationProvider: ethers.Provider,
    bundleHash: string,
    finalizationInfo: InteropMessageFinalizationInfo
  ): Promise<DestinationChainStatus> {
    return getBundleDestinationStatus(
      destinationProvider,
      bundleHash,
      finalizationInfo.expectedRoot
    );
  }

  /**
   * Wait for a bundle to be available on the destination chain
   */
  async waitForAvailability(
    destinationProvider: ethers.Provider,
    bundleHash: string,
    finalizationInfo: InteropMessageFinalizationInfo,
    options: WaitOptions = {}
  ): Promise<DestinationChainStatus> {
    return waitForBundleAvailability(
      destinationProvider,
      bundleHash,
      finalizationInfo.expectedRoot,
      options
    );
  }

  /**
   * Execute a bundle on the destination chain
   */
  async executeBundle(
    destinationSigner: ethers.Signer,
    finalizationInfo: InteropMessageFinalizationInfo,
    options: ExecuteBundleOptions = {}
  ): Promise<ethers.TransactionReceipt> {
    return executeBundle(destinationSigner, finalizationInfo, options);
  }

  /**
   * Wait for root availability and execute a bundle
   */
  async waitAndExecute(
    destinationProvider: ethers.Provider,
    destinationSigner: ethers.Signer,
    finalizationInfo: InteropMessageFinalizationInfo,
    options: ExecuteBundleOptions & WaitOptions = {}
  ): Promise<ethers.TransactionReceipt> {
    await waitUntilRootAvailable(destinationProvider, finalizationInfo.expectedRoot, options);
    return executeBundle(destinationSigner, finalizationInfo, options);
  }

  /**
   * Complete end-to-end bundle flow: send, wait for finalization, wait for availability, execute
   */
  async sendAndExecute(
    builder: BundleBuilder,
    destinationProvider: ethers.Provider,
    destinationSigner: ethers.Signer,
    sendOptions: SendBundleOptions = {},
    executeOptions: ExecuteBundleOptions = {},
    waitOptions: WaitOptions = {}
  ): Promise<{
    handle: BundleHandle;
    finalizationInfo: InteropMessageFinalizationInfo;
    executeReceipt: ethers.TransactionReceipt;
  }> {
    // Send the bundle
    const handle = await this.sendBundle(builder, sendOptions);

    // Wait for finalization on source
    const finalizationInfo = await this.waitForFinalization(handle, waitOptions);

    // Wait for availability on destination
    await this.waitForAvailability(
      destinationProvider,
      handle.bundleHash,
      finalizationInfo,
      waitOptions
    );

    // Execute on destination
    const executeReceipt = await this.executeBundle(
      destinationSigner,
      finalizationInfo,
      executeOptions
    );

    return {
      handle,
      finalizationInfo,
      executeReceipt,
    };
  }
}

/**
 * Create a new InteropSDK instance
 * @param sourceProvider - The ethers provider for the source chain
 * @param sourceSigner - The signer for the source chain
 * @returns A new InteropSDK instance
 */
export function createInteropSDK(
  sourceProvider: ethers.Provider,
  sourceSigner: ethers.Signer
): InteropSDK {
  return new InteropSDK(sourceProvider, sourceSigner);
}
