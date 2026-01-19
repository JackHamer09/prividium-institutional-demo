import { readContract } from "@wagmi/core";
import type { Address, Hex } from "viem";
import { getAddress } from "viem";
import { getTokensConfig } from "../config/tokens";

// Import from SDK - use relative path until pnpm install links it
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - SDK types available after pnpm install
import { L2_NATIVE_TOKEN_VAULT_ADDRESS } from "interop-sdk";

// Viem-compatible ABI for NativeTokenVault
// SDK uses ethers-style ABI, so we define our own for viem compatibility
const NativeTokenVaultAbi = [
  {
    name: "assetId",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_tokenAddress", type: "address" }],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    name: "tokenAddress",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_assetId", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

// Caches with normalized keys
// Key format: `${chainId}:${normalizedValue}`
const addressCache = new Map<string, Address>(); // assetId -> address
const assetIdCache = new Map<string, Hex>(); // address -> assetId
const preloadedChains = new Set<number>();

/**
 * Create normalized cache key for assetId lookups
 */
function assetIdCacheKey(chainId: number, assetId: Hex): string {
  return `${chainId}:${assetId}`;
}

/**
 * Create normalized cache key for address lookups
 */
function addressCacheKey(chainId: number, address: Address): string {
  return `${chainId}:${getAddress(address)}`;
}

/**
 * Get assetId from cache (sync) - returns undefined if not cached
 */
export function getCachedAssetId(chainId: number, address: Address): Hex | undefined {
  return assetIdCache.get(addressCacheKey(chainId, address));
}

/**
 * Get address from cache (sync) - returns undefined if not cached
 */
export function getCachedAddress(chainId: number, assetId: Hex): Address | undefined {
  return addressCache.get(assetIdCacheKey(chainId, assetId));
}

/**
 * Composable for resolving asset IDs to token addresses and vice versa
 * Uses runtime caching with normalized addresses (via viem's getAddress)
 */
export function useTokenAddress() {
  const config = useWagmiConfig();
  const runtimeConfig = useRuntimeConfig();
  const tokens = getTokensConfig(runtimeConfig);
  const { address: accountAddress } = storeToRefs(useWalletStore());

  /**
   * Get token address for an asset ID on a specific chain
   */
  async function getTokenAddress(chainId: number, assetId: Hex): Promise<Address> {
    const cacheKey = assetIdCacheKey(chainId, assetId);

    if (addressCache.has(cacheKey)) {
      return addressCache.get(cacheKey)!;
    }

    const result = await readContract(config, {
      account: accountAddress.value,
      address: L2_NATIVE_TOKEN_VAULT_ADDRESS as Address,
      abi: NativeTokenVaultAbi,
      functionName: "tokenAddress",
      args: [assetId],
      chainId,
    });

    // eslint-disable-next-line no-console
    console.log(`Fetched token address for assetId ${assetId} on chain ${chainId}: ${result}`);

    // Normalize the returned address
    const address = getAddress(result as Address);
    addressCache.set(cacheKey, address);

    // Also cache the reverse mapping
    const reverseCacheKey = addressCacheKey(chainId, address);
    assetIdCache.set(reverseCacheKey, assetId);

    return address;
  }

  /**
   * Preload all token addresses for a specific chain
   * Should be called after authorization and before showing main UI
   */
  async function preloadAddressesForChain(chainId: number): Promise<void> {
    if (preloadedChains.has(chainId)) {
      // eslint-disable-next-line no-console
      console.log(`Token addresses for chain ${chainId} already preloaded.`);
      return;
    }

    const promises = tokens.map((token) => getTokenAddress(chainId, token.assetId));
    await Promise.all(promises);
    // eslint-disable-next-line no-console
    console.log(`Preloaded token addresses for chain ${chainId}.`);
    preloadedChains.add(chainId);
  }

  return {
    getTokenAddress,
    preloadAddressesForChain,
  };
}
