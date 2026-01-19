import { readContract, waitForTransactionReceipt } from "@wagmi/core";
import { type Address, decodeEventLog, encodeFunctionData, erc20Abi, type Hex, zeroAddress } from "viem";
import {
  buildBridgeCalldata,
  BundleBuilder,
  BundleStatus,
  CallBuilder,
  computeAssetId,
  DEFAULT_POLL_INTERVAL,
  DEFAULT_TIMEOUT,
  L2_ASSET_ROUTER_ADDRESS,
  L2_INTEROP_CENTER_ADDRESS,
  L2_INTEROP_HANDLER_ADDRESS,
  L2_NATIVE_TOKEN_VAULT_ADDRESS,
} from "interop-sdk";
import { getMainChainId } from "../config/chains";

/**
 * Result from sending an interop bundle
 */
export interface BundleResult {
  bundleHash: string;
  txHash: Hex;
  sourceChainId: bigint;
  toChainId: number;
}
const InteropCenterAbiViem = [
  {
    name: "sendBundle",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "_destinationChainId", type: "bytes" },
      {
        name: "_callStarters",
        type: "tuple[]",
        components: [
          { name: "to", type: "bytes" },
          { name: "data", type: "bytes" },
          { name: "callAttributes", type: "bytes[]" },
        ],
      },
      { name: "_bundleAttributes", type: "bytes[]" },
    ],
    outputs: [{ type: "bytes32" }],
  },
] as const;

const InteropHandlerAbiViem = [
  {
    name: "getShadowAccountAddress",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "_ownerChainId", type: "uint256" },
      { name: "_ownerAddress", type: "address" },
    ],
    outputs: [{ type: "address" }],
  },
  {
    name: "bundleStatus",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "bundleHash", type: "bytes32" }],
    outputs: [{ name: "bundleStatus", type: "uint8" }],
  },
] as const;

const InteropBundleSentEventAbi = [
  {
    type: "event",
    name: "InteropBundleSent",
    inputs: [
      { name: "l2l1MsgHash", type: "bytes32", indexed: false },
      { name: "interopBundleHash", type: "bytes32", indexed: false },
      {
        name: "interopBundle",
        type: "tuple",
        indexed: false,
        components: [
          { name: "version", type: "bytes1" },
          { name: "sourceChainId", type: "uint256" },
          { name: "destinationChainId", type: "uint256" },
          { name: "interopBundleSalt", type: "bytes32" },
          {
            name: "calls",
            type: "tuple[]",
            components: [
              { name: "version", type: "bytes1" },
              { name: "shadowAccount", type: "bool" },
              { name: "to", type: "address" },
              { name: "from", type: "address" },
              { name: "value", type: "uint256" },
              { name: "data", type: "bytes" },
            ],
          },
          {
            name: "bundleAttributes",
            type: "tuple",
            components: [
              { name: "executionAddress", type: "bytes" },
              { name: "unbundlerAddress", type: "bytes" },
            ],
          },
        ],
      },
    ],
  },
] as const;

/**
 * Composable for building and sending interop bundles
 */
export function useInteropBundle() {
  const config = useWagmiConfig();
  const toast = useToast();
  const walletStore = useWalletStore();
  const prividiumStore = usePrividiumStore();
  const { executeWrite } = usePrividiumWrite();

  const mainChainId = getMainChainId();

  /**
   * Check if user is on a different chain than main chain
   */
  function isCrossChain(): boolean {
    return prividiumStore.selectedChainId !== null && prividiumStore.selectedChainId !== mainChainId;
  }

  /**
   * Get the current source chain ID (user's selected chain)
   */
  function getSourceChainId(): number {
    if (prividiumStore.selectedChainId === null) {
      throw new Error("No chain selected");
    }
    return prividiumStore.selectedChainId;
  }

  /**
   * Build ERC20 approve calldata
   */
  function buildApproveCalldata(spender: Address, amount: bigint): Hex {
    return encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [spender, amount],
    });
  }

  /**
   * Build calldata to bridge tokens TO the main chain (via Asset Router)
   * This is used for indirect calls that bridge tokens from source to dest
   */
  function buildBridgeToMainCalldata(
    assetId: Hex,
    amount: bigint,
    recipient: Address,
  ): Hex {
    return buildBridgeCalldata(assetId, amount, recipient, zeroAddress) as Hex;
  }

  /**
   * Create an indirect call for bridging tokens TO the shadow account on main chain
   * This call bridges tokens from the user's chain to their shadow account
   */
  function createBridgeToShadowCall(
    assetId: Hex,
    amount: bigint,
    shadowAccount: Address,
  ) {
    const calldata = buildBridgeToMainCalldata(assetId, amount, shadowAccount);
    return new CallBuilder(L2_ASSET_ROUTER_ADDRESS, calldata)
      .asIndirectCall(0n)
      .build();
  }

  /**
   * Get the user's shadow account address on the main chain
   * Shadow accounts are deterministic based on (sourceChainId, userAddress)
   */
  async function getShadowAccount(): Promise<Address> {
    if (!walletStore.address) {
      throw new Error("Wallet not connected");
    }

    const sourceChainId = getSourceChainId();

    // Call InteropHandler.getShadowAccountAddress on the main chain
    const shadowAddress = await readContract(config, {
      account: walletStore.address,
      address: L2_INTEROP_HANDLER_ADDRESS as Address,
      abi: InteropHandlerAbiViem,
      functionName: "getShadowAccountAddress",
      args: [BigInt(sourceChainId), walletStore.address],
      chainId: mainChainId,
    });

    return shadowAddress as Address;
  }

  /**
   * Compute asset ID for a token
   */
  function getAssetIdForToken(tokenAddress: Address, originChainId?: number): Hex {
    const chainId = originChainId ?? mainChainId;
    return computeAssetId(chainId, L2_NATIVE_TOKEN_VAULT_ADDRESS, tokenAddress) as Hex;
  }

  /**
   * Extract bundle hash from transaction receipt logs
   */
  function extractBundleHashFromLogs(logs: readonly { address: string; topics: readonly string[]; data: string }[]): Hex {
    const interopCenterAddress = L2_INTEROP_CENTER_ADDRESS.toLowerCase();

    for (const log of logs) {
      if (log.address.toLowerCase() !== interopCenterAddress) {
        continue;
      }

      try {
        const decoded = decodeEventLog({
          abi: InteropBundleSentEventAbi,
          data: log.data as Hex,
          topics: log.topics as [Hex, ...Hex[]],
        });

        if (decoded.eventName === "InteropBundleSent") {
          return decoded.args.interopBundleHash as Hex;
        }
      } catch {
        // Skip logs that don't match
        continue;
      }
    }

    throw new Error("InteropBundleSent event not found in transaction logs");
  }

  /**
   * Send an interop bundle from the current chain to mainChain
   * Uses the existing wagmi/prividium infrastructure for transaction sending
   */
  async function sendInteropBundle(
    bundle: BundleBuilder,
    description: string,
  ): Promise<BundleResult> {
    if (!walletStore.address) {
      throw new Error("Wallet not connected");
    }

    const sourceChainId = getSourceChainId();

    // eslint-disable-next-line no-console
    console.log(`Sending ${description} bundle...`);

    // Send via existing wagmi/prividium infrastructure
    const hash = await executeWrite({
      address: L2_INTEROP_CENTER_ADDRESS as Address,
      abi: InteropCenterAbiViem,
      functionName: "sendBundle",
      args: [
        bundle.getEncodedDestination(),
        bundle.getCalls(),
        bundle.getBundleAttributes(),
      ],
      chainId: sourceChainId,
    });

    // Wait for receipt
    const receipt = await waitForTransactionReceipt(config, {
      hash,
      chainId: sourceChainId,
    });

    // Extract bundle hash from logs
    const bundleHash = extractBundleHashFromLogs(receipt.logs);

    // eslint-disable-next-line no-console
    console.log(`Bundle submitted: ${bundleHash.slice(0, 10)}...`);

    // Wait for bundle execution on destination chain
    await waitForBundleExecution(bundleHash);

    return {
      bundleHash,
      txHash: hash,
      sourceChainId: BigInt(sourceChainId),
      toChainId: mainChainId,
    };
  }

  /**
   * Create a new BundleBuilder targeting the main chain with the user as unbundler
   */
  function createBundle(): BundleBuilder {
    if (!walletStore.address) {
      throw new Error("Wallet not connected");
    }

    return new BundleBuilder(mainChainId).withUnbundler(walletStore.address);
  }

  /**
   * Get the on-chain bundle status from the destination chain (main chain)
   */
  async function getBundleStatus(bundleHash: Hex): Promise<BundleStatus> {
    try {
      const status = await readContract(config, {
        account: walletStore.address,
        address: L2_INTEROP_HANDLER_ADDRESS as Address,
        abi: InteropHandlerAbiViem,
        functionName: "bundleStatus",
        args: [bundleHash],
        chainId: mainChainId,
      });
      return Number(status) as BundleStatus;
    } catch {
      return BundleStatus.Unreceived;
    }
  }

  /**
   * Wait for a bundle to be executed on the destination chain
   * Polls the InteropHandler.bundleStatus until FullyExecuted or Unbundled
   *
   * @param bundleHash - The bundle hash to wait for
   * @param options - Optional timeout and poll interval settings
   * @returns The final bundle status
   */
  async function waitForBundleExecution(
    bundleHash: Hex,
    options: { timeout?: number; pollInterval?: number } = {},
  ): Promise<BundleStatus> {
    const timeout = options.timeout ?? DEFAULT_TIMEOUT;
    const pollInterval = options.pollInterval ?? DEFAULT_POLL_INTERVAL;

    const startTime = Date.now();

    // eslint-disable-next-line no-console
    console.log(`Waiting for ${bundleHash} bundle execution...`);

    while (Date.now() - startTime < timeout) {
      const status = await getBundleStatus(bundleHash);

      if (status === BundleStatus.FullyExecuted) {
        // eslint-disable-next-line no-console
        console.log(`Bundle ${bundleHash} executed successfully`);
        return status;
      }

      if (status === BundleStatus.Unbundled) {
        // eslint-disable-next-line no-console
        console.log("Bundle unbundled");
        return status;
      }

      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    toast.error("Timeout waiting for bundle execution");
    throw new Error(`Timeout waiting for bundle ${bundleHash} to be executed`);
  }

  return {
    // Checks
    isCrossChain,
    // Shadow account
    getShadowAccount,
    // Asset IDs
    getAssetIdForToken,
    // Calldata builders
    buildApproveCalldata,
    // Call builders
    createBridgeToShadowCall,
    // Bundle operations
    createBundle,
    sendInteropBundle,
  };
}
