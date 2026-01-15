import { defineStore } from "pinia";
import type { Hex } from "viem";

/**
 * Token balance entry - stores only assetId and balance
 * Token metadata (symbol, decimals) comes from tokens config
 * Token address comes from useTokenAddress cache
 */
export interface TokenBalance {
  assetId: Hex;
  balance: bigint;
}

export interface ChainBalances {
  balances: Map<Hex, TokenBalance>;
  lastUpdated: Date | null;
}

export const useBalancesStore = defineStore("balances", () => {
  // Per-chain balances: chainId -> assetId -> TokenBalance
  const chainBalances = ref<Map<number, ChainBalances>>(new Map());
  const isLoading = ref(false);

  /**
   * Ensure chain entry exists
   */
  function ensureChainEntry(chainId: number) {
    if (!chainBalances.value.has(chainId)) {
      chainBalances.value.set(chainId, {
        balances: new Map(),
        lastUpdated: null,
      });
    }
  }

  /**
   * Set balance for a specific token on a specific chain
   */
  function setBalance(params: {
    chainId: number;
    assetId: Hex;
    balance: bigint;
  }) {
    const { chainId, assetId, balance } = params;
    ensureChainEntry(chainId);
    const chain = chainBalances.value.get(chainId)!;
    chain.balances.set(assetId, { assetId, balance });
    chain.lastUpdated = new Date();
  }

  /**
   * Get balance for a specific token on a specific chain
   */
  function getBalance(chainId: number, assetId: Hex): bigint {
    const chain = chainBalances.value.get(chainId);
    return chain?.balances.get(assetId)?.balance ?? 0n;
  }

  /**
   * Clear balances for a specific chain
   */
  function clearChainBalances(chainId: number) {
    const chain = chainBalances.value.get(chainId);
    if (chain) {
      chain.balances.clear();
      chain.lastUpdated = null;
    }
  }

  /**
   * Clear all balances
   */
  function clearBalances() {
    chainBalances.value.clear();
  }

  /**
   * Set loading state
   */
  function setLoading(loading: boolean) {
    isLoading.value = loading;
  }

  /**
   * Get last updated time for a chain
   */
  function getLastUpdated(chainId: number): Date | null {
    return chainBalances.value.get(chainId)?.lastUpdated ?? null;
  }

  return {
    chainBalances,
    isLoading,
    setBalance,
    getBalance,
    clearChainBalances,
    clearBalances,
    setLoading,
    getLastUpdated,
  };
});
