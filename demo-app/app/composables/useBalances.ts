import { getBalance, waitForTransactionReceipt } from "@wagmi/core";
import type { Hex } from "viem";
import { formatEther, zeroAddress } from "viem";
import { getTokenByAssetId, getTokensConfig, type TokenConfig } from "../config/tokens";
import { getChainName, getL1Chain, getMainChainId } from "../config/chains";
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
 * Token and ETH balance management (multi-chain aware)
 * Takes a reactive chainId and returns reactive balances
 */
export function useBalances(chainId?: Ref<number> | ComputedRef<number>) {
  const runtimeConfig = useRuntimeConfig();
  const tokens = getTokensConfig(runtimeConfig);
  const balancesStore = useBalancesStore();
  const walletStore = useWalletStore();
  const config = useWagmiConfig();
  const toast = useToast();
  const { getBalance: getTokenBalance, resolveAddress } = useTokenContract();
  const { executeWrite } = usePrividiumWrite();

  // Use provided chainId or fall back to main chain
  const effectiveChainId = chainId ?? computed(() => getMainChainId());

  // L1 chain ID for bridge balance
  const l1ChainId = computed(() => getL1Chain().id);

  // Reactive: token balances for current chain (access store directly)
  const tokenBalances = computed(() =>
    balancesStore.tokenBalances.get(effectiveChainId.value) ?? new Map<Hex, bigint>(),
  );

  // Reactive: ETH balance for current chain (access store directly)
  const ethBalance = computed(() =>
    balancesStore.ethBalances.get(effectiveChainId.value) ?? 0n,
  );

  // Reactive: L1 ETH balance for bridging (always same L1 chain)
  const l1EthBalance = computed(() =>
    balancesStore.ethBalances.get(l1ChainId.value) ?? 0n,
  );

  // Reactive: formatted ETH balances
  const formattedEthBalance = computed(() => formatEther(ethBalance.value));
  const formattedL1EthBalance = computed(() => formatEther(l1EthBalance.value));

  /**
   * Get formatted balance for a token
   */
  function getFormattedBalance(assetId: Hex): string {
    const balance = tokenBalances.value.get(assetId) ?? 0n;
    if (balance === 0n) return "0";

    const token = getTokenByAssetId(assetId, tokens);
    if (!token) return "0";

    return formatTokenAmount(balance, token.decimals);
  }

  /**
   * Fetch ETH balance for a specific chain using wagmi
   */
  async function fetchEthBalance(targetChainId: number) {
    if (!walletStore.address) return;

    try {
      const result = await getBalance(config, {
        address: walletStore.address,
        chainId: targetChainId,
      });
      balancesStore.setEthBalance(targetChainId, result.value);
    } catch (error) {
      console.error(`Failed to fetch ETH for chain ${targetChainId} (${getChainName(targetChainId) ?? "unknown"}):`, error);
    }
  }

  /**
   * Fetch single token balance
   */
  async function fetchTokenBalanceForChain(targetChainId: number, token: TokenConfig) {
    if (!walletStore.address) return;

    // Check if token is registered on this chain
    const tokenAddress = getCachedAddress(targetChainId, token.assetId);
    if (!tokenAddress || tokenAddress === zeroAddress) {
      console.error(
        `Token address not found: assetId=${token.assetId}, chainId=${targetChainId} (${getChainName(targetChainId) ?? "unknown"}), symbol=${token.symbol}`,
      );
      return;
    }

    try {
      const balance = await getTokenBalance({
        chainId: targetChainId,
        assetId: token.assetId,
        account: walletStore.address,
      });
      balancesStore.setTokenBalance(targetChainId, token.assetId, balance);
    } catch (error) {
      console.error(
        `Failed to fetch ${token.symbol} on chain ${targetChainId} (${getChainName(targetChainId) ?? "unknown"}):`,
        error,
      );
    }
  }

  /**
   * Refresh ALL balances (ETH + all tokens) for a chain
   * Also fetches L1 ETH balance for bridging
   */
  async function refresh(targetChainId?: number) {
    const chain = targetChainId ?? effectiveChainId.value;
    if (!walletStore.address) return;

    balancesStore.isLoading = true;
    try {
      await Promise.all([
        // Fetch ETH for the target L2 chain
        fetchEthBalance(chain),
        // Fetch L1 ETH for bridging
        fetchEthBalance(l1ChainId.value),
        // Fetch all token balances
        ...tokens.map((t) => fetchTokenBalanceForChain(chain, t)),
      ]);
    } finally {
      balancesStore.isLoading = false;
    }
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
      await refresh(mainChainId);
    } catch (error) {
      console.error("Failed to mint tokens:", error);
      toast.error("Failed to mint tokens");
    }
  }

  // Auto-refresh when chainId changes
  if (chainId) {
    watch(chainId, (newChainId) => {
      refresh(newChainId);
    });
  }

  return {
    // Reactive values
    tokens,
    tokenBalances,
    ethBalance,
    l1EthBalance,
    formattedEthBalance,
    formattedL1EthBalance,
    isLoading: computed(() => balancesStore.isLoading),

    // Functions
    getFormattedBalance,
    refresh,
    mintTokens,
  };
}
