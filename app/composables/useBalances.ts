import { waitForTransactionReceipt } from "@wagmi/core";
import type { Address } from "viem";
import { getTokensConfig } from "../config/tokens";

const mintAbi = [
  {
    name: "mint",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

/**
 * Token balance management
 */
export function useBalances() {
  const runtimeConfig = useRuntimeConfig();
  const tokens = getTokensConfig(runtimeConfig);
  const balancesStore = useBalancesStore();
  const walletStore = useWalletStore();
  const { getBalance } = useTokenContract();
  const { executeWrite } = usePrividiumWrite();
  const { ensureCorrectChain, getChainId } = useChainSwitch();
  const config = useWagmiConfig();
  const toast = useToast();

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
   * Mint 100 of each token via contract calls
   */
  async function mintTokens(): Promise<void> {
    if (!walletStore.address) {
      toast.error("Wallet not connected");
      return;
    }

    const chainOk = await ensureCorrectChain();
    if (!chainOk) {return;}

    try {
      for (const token of tokens) {
        const mintAmount = BigInt(100) * BigInt(10 ** token.decimals);

        const hash = await executeWrite({
          address: token.address,
          abi: mintAbi,
          functionName: "mint",
          args: [walletStore.address, mintAmount],
          chainId: getChainId(),
        });

        await waitForTransactionReceipt(config, { hash, chainId: getChainId() });
      }

      toast.success("Tokens minted successfully!");
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
