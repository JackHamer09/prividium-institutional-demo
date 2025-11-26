import { defineStore } from "pinia";
import type { Address } from "viem";

export interface TokenBalance {
  address: Address
  balance: bigint
  symbol: string
  decimals: number
}

export const useBalancesStore = defineStore("balances", () => {
  const balances = ref<Map<Address, TokenBalance>>(new Map());
  const isLoading = ref(false);
  const lastUpdated = ref<Date | null>(null);

  /**
   * Set balance for a specific token
   */
  function setBalance(tokenAddress: Address, balance: bigint, symbol: string, decimals: number) {
    balances.value.set(tokenAddress.toLowerCase() as Address, {
      address: tokenAddress,
      balance,
      symbol,
      decimals,
    });
    lastUpdated.value = new Date();
  }

  /**
   * Get balance for a specific token
   */
  function getBalance(tokenAddress: Address): TokenBalance | undefined {
    return balances.value.get(tokenAddress.toLowerCase() as Address);
  }

  /**
   * Clear all balances
   */
  function clearBalances() {
    balances.value.clear();
    lastUpdated.value = null;
  }

  /**
   * Set loading state
   */
  function setLoading(loading: boolean) {
    isLoading.value = loading;
  }

  return {
    balances,
    isLoading,
    lastUpdated,
    setBalance,
    getBalance,
    clearBalances,
    setLoading,
  };
});
