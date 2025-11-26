import type { Address } from "viem";
import { getTokensConfig } from "../config/tokens";

/**
 * Token balance management
 */
export function useBalances() {
  const runtimeConfig = useRuntimeConfig();
  const tokens = getTokensConfig(runtimeConfig);
  const balancesStore = useBalancesStore();
  const walletStore = useWalletStore();
  const { getBalance } = useTokenContract();

  /**
   * Fetch balance for a single token
   */
  async function fetchTokenBalance(tokenAddress: Address) {
    if (!walletStore.address) {return;}

    const token = tokens.find((t) => t.address.toLowerCase() === tokenAddress.toLowerCase());
    if (!token) {return;}

    const balance = await getBalance(tokenAddress, walletStore.address);
    balancesStore.setBalance(tokenAddress, balance, token.symbol, token.decimals);
  }

  /**
   * Fetch balances for all configured tokens
   */
  async function fetchAllBalances() {
    if (!walletStore.address) {
      balancesStore.clearBalances();
      return;
    }

    balancesStore.setLoading(true);

    try {
      await Promise.all(tokens.map((token) => fetchTokenBalance(token.address)));
    } catch (error) {
      console.error("Failed to fetch balances:", error);
    } finally {
      balancesStore.setLoading(false);
    }
  }

  /**
   * Refresh balances (with loading state)
   */
  async function refreshBalances() {
    await fetchAllBalances();
  }

  /**
   * Get formatted balance for a token
   */
  function getFormattedBalance(tokenAddress: Address): string {
    const balance = balancesStore.getBalance(tokenAddress);
    if (!balance) {return "0";}

    return formatTokenAmount(balance.balance, balance.decimals);
  }

  /**
   * Dummy mint function (simulates minting with a delay)
   * Supports minting multiple tokens in a single operation
   */
  async function mintTokens(): Promise<void> {
    const toast = useToast();

    try {
      // Simulate mint with 2-second delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      toast.success("Tokens minted successfully!");

      // Refresh balances after mint
      await fetchAllBalances();
    } catch (error) {
      console.error("Failed to mint tokens:", error);
      toast.error("Failed to mint tokens");
    }
  }

  return {
    tokens,
    fetchTokenBalance,
    fetchAllBalances,
    refreshBalances,
    getFormattedBalance,
    mintTokens,
  };
}
