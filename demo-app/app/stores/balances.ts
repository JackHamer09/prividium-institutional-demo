import { defineStore } from "pinia";
import type { Hex } from "viem";

export const useBalancesStore = defineStore("balances", () => {
  // Token balances: chainId -> assetId -> balance (ERC20 only)
  const tokenBalances = ref<Map<number, Map<Hex, bigint>>>(new Map());

  // ETH balances: chainId -> balance (native ETH)
  const ethBalances = ref<Map<number, bigint>>(new Map());

  const isLoading = ref(false);

  /**
   * Set balance for a specific token on a specific chain
   */
  function setTokenBalance(chainId: number, assetId: Hex, balance: bigint) {
    if (!tokenBalances.value.has(chainId)) {
      tokenBalances.value.set(chainId, new Map());
    }
    tokenBalances.value.get(chainId)!.set(assetId, balance);
  }

  /**
   * Set ETH balance for a specific chain
   */
  function setEthBalance(chainId: number, balance: bigint) {
    ethBalances.value.set(chainId, balance);
  }

  /**
   * Clear all balances
   */
  function clearAll() {
    tokenBalances.value.clear();
    ethBalances.value.clear();
  }

  return {
    tokenBalances, // Access directly for reactivity
    ethBalances, // Access directly for reactivity
    isLoading,
    setTokenBalance,
    setEthBalance,
    clearAll,
  };
});
