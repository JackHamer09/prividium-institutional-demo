import { waitForTransactionReceipt } from "@wagmi/core";
import type { Hex } from "viem";
import { zeroAddress } from "viem";
import { getTokenByAssetId, getTokensConfig } from "../config/tokens";
import { getMainChainId } from "../config/chains";
import { getCachedAddress } from "./useTokenAddress";

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
 * Token balance management (multi-chain aware)
 */
export function useBalances() {
  const runtimeConfig = useRuntimeConfig();
  const tokens = getTokensConfig(runtimeConfig);
  const balancesStore = useBalancesStore();
  const walletStore = useWalletStore();
  const prividiumStore = usePrividiumStore();
  const { getBalance } = useTokenContract();
  const { executeWrite } = usePrividiumWrite();
  const config = useWagmiConfig();
  const toast = useToast();

  /**
   * Fetch balance for a single token on a specific chain
   */
  async function fetchTokenBalance(chainId: number, assetId: Hex) {
    if (!walletStore.address) {return;}

    const token = tokens.find((t) => t.assetId === assetId);
    if (!token) {return;}

    // Check if token is registered on this chain (address in cache)
    const tokenAddress = getCachedAddress(chainId, assetId);
    if (!tokenAddress || tokenAddress === zeroAddress) {
      return;
    }

    try {
      const balance = await getBalance({
        chainId,
        assetId,
        account: walletStore.address,
      });
      balancesStore.setBalance({ chainId, assetId, balance });
    } catch (error) {
      console.error(`Failed to fetch balance for ${token.symbol} on chain ${chainId}:`, error);
    }
  }

  /**
   * Fetch balances for all configured tokens on a specific chain
   */
  async function fetchBalancesForChain(chainId: number) {
    if (!walletStore.address) {
      balancesStore.clearChainBalances(chainId);
      return;
    }

    balancesStore.setLoading(true);

    try {
      await Promise.all(tokens.map((token) => fetchTokenBalance(chainId, token.assetId)));
    } catch (error) {
      console.error(`Failed to fetch balances for chain ${chainId}:`, error);
    } finally {
      balancesStore.setLoading(false);
    }
  }

  /**
   * Fetch balances for all authorized chains
   */
  async function fetchAllBalances() {
    if (!walletStore.address) {
      balancesStore.clearBalances();
      return;
    }

    const authorizedChains = prividiumStore.authorizedChainIds;
    if (authorizedChains.length === 0) {return;}

    balancesStore.setLoading(true);

    try {
      await Promise.all(authorizedChains.map((chainId) => fetchBalancesForChain(chainId)));
    } catch (error) {
      console.error("Failed to fetch balances:", error);
    } finally {
      balancesStore.setLoading(false);
    }
  }

  /**
   * Refresh balances for a specific chain or all chains
   */
  async function refreshBalances(chainId?: number) {
    if (chainId !== undefined) {
      await fetchBalancesForChain(chainId);
    } else {
      await fetchAllBalances();
    }
  }

  /**
   * Get formatted balance for a token on a specific chain
   * Token decimals come from tokens config (single source of truth)
   */
  function getFormattedBalance(chainId: number, assetId: Hex): string {
    const balance = balancesStore.getBalance(chainId, assetId);
    if (balance === 0n) {return "0";}

    // Get decimals from token config (single source of truth)
    const token = getTokenByAssetId(assetId, tokens);
    if (!token) {return "0";}

    return formatTokenAmount(balance, token.decimals);
  }

  /**
   * Mint 100 of each token via contract calls (main chain only)
   */
  async function mintTokens(): Promise<void> {
    if (!walletStore.address) {
      toast.error("Wallet not connected");
      return;
    }

    const mainChainId = getMainChainId();
    const { resolveAddress } = useTokenContract();

    try {
      for (const token of tokens) {
        const mintAmount = BigInt(100) * BigInt(10 ** token.decimals);

        // Get token address for main chain from cache
        const tokenAddress = resolveAddress({ chainId: mainChainId, assetId: token.assetId });
        if (tokenAddress === zeroAddress) {
          console.warn(`Token ${token.symbol} not registered on main chain`);
          continue;
        }

        const hash = await executeWrite({
          address: tokenAddress,
          abi: mintAbi,
          functionName: "mint",
          args: [walletStore.address, mintAmount],
          chainId: mainChainId,
        });

        await waitForTransactionReceipt(config, { hash, chainId: mainChainId });
      }

      toast.success("Tokens minted successfully!");
      await fetchBalancesForChain(mainChainId);
    } catch (error) {
      console.error("Failed to mint tokens:", error);
      toast.error("Failed to mint tokens");
    }
  }

  return {
    tokens,
    fetchTokenBalance,
    fetchBalancesForChain,
    fetchAllBalances,
    refreshBalances,
    getFormattedBalance,
    mintTokens,
  };
}
