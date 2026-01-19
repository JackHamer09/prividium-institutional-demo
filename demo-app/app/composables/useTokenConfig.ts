import type { Address, Hex } from "viem";
import { getAddress } from "viem";
import type { MaybeRef } from "vue";
import type { TokenConfig } from "../config/tokens";
import { getTokensConfig } from "../config/tokens";
import { getCachedAssetId } from "./useTokenAddress";

/**
 * Reactive composable to get TokenConfig by token address
 *
 * Uses the preloaded address → assetId cache from useTokenAddress.
 * Must be used after preloadAddressesForChain() has been called.
 *
 * @param chainId - The chain ID to look up the token on
 * @param tokenAddress - The token contract address
 * @returns Computed TokenConfig or undefined if not found
 */
export function useTokenConfig(
  chainId: MaybeRef<number>,
  tokenAddress: MaybeRef<Address | undefined>,
): ComputedRef<TokenConfig | undefined> {
  const runtimeConfig = useRuntimeConfig();
  const tokens = getTokensConfig(runtimeConfig);

  return computed(() => {
    const chain = toValue(chainId);
    const address = toValue(tokenAddress);

    if (!address) {
      return undefined;
    }

    // Normalize address for lookup
    let normalizedAddress: Address;
    try {
      normalizedAddress = getAddress(address);
    } catch {
      // Invalid address format
      return undefined;
    }

    // Look up assetId from cache (populated by preloadAddressesForChain)
    const assetId = getCachedAssetId(chain, normalizedAddress);
    if (!assetId) {
      return undefined;
    }

    // Find token config by assetId
    return tokens.find((token) => token.assetId === assetId);
  });
}

/**
 * Get token config by assetId (non-reactive, synchronous)
 */
export function getTokenConfigByAssetId(assetId: Hex): TokenConfig | undefined {
  const runtimeConfig = useRuntimeConfig();
  const tokens = getTokensConfig(runtimeConfig);
  return tokens.find((token) => token.assetId === assetId);
}
