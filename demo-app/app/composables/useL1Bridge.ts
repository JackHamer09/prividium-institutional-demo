import {
  createPublicClient,
  createWalletClient,
  custom,
  parseEther,
} from "viem";
import type { Address, PublicClient, WalletClient } from "viem";
import type { PrividiumChain } from "prividium";
import { switchChain } from "@wagmi/core";
import { createViemClient, createViemSdk } from "@dutterbutter/zksync-sdk/viem";
import { ETH_ADDRESS } from "@dutterbutter/zksync-sdk/core";
import { getL1Chain } from "~/config/chains";

/**
 * L1 to L2 bridge deposit functionality
 * Note: L1 and L2 ETH balances are now managed by useBalances composable
 */
export function useL1Bridge() {
  const config = useWagmiConfig();
  const walletStore = useWalletStore();
  const balancesStore = useBalancesStore();
  const toast = useToast();

  const isDepositing = ref(false);

  // L1 chain for bridge operations
  const l1Chain = getL1Chain();

  // Lazy-initialized L1 public client for SDK
  let l1PublicClient: PublicClient | null = null;

  function getL1PublicClient(): PublicClient {
    if (!l1PublicClient) {
      l1PublicClient = createPublicClient({
        chain: l1Chain,
        transport: custom(window.ethereum!),
      });
    }
    return l1PublicClient;
  }

  /**
   * Create L1 wallet client using injected provider
   */
  function createL1WalletClient(): WalletClient {
    if (!window.ethereum) {
      throw new Error("No injected wallet found");
    }

    return createWalletClient({
      account: walletStore.address as Address,
      chain: l1Chain,
      transport: custom(window.ethereum),
    });
  }

  /**
   * Deposit ETH from L1 to L2
   */
  async function deposit(amount: string) {
    if (!walletStore.address) {
      toast.error("Please connect wallet");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    // Get L1 balance from store
    const l1Balance = balancesStore.ethBalances.get(l1Chain.id) ?? 0n;

    // Check if user has sufficient L1 balance
    const depositAmount = parseEther(amount);
    if (depositAmount > l1Balance) {
      toast.error("Insufficient L1 balance");
      return;
    }

    isDepositing.value = true;
    try {
      const { $prividium } = useNuxtApp();
      const prividium = $prividium as PrividiumChain;

      // Create L2 public client
      const l2PublicClient = createPublicClient({
        chain: prividium.chain,
        transport: prividium.transport,
      });

      // Create L1 wallet client
      const l1WalletClient = createL1WalletClient();

      // Ensure wallet client has account
      if (!l1WalletClient.account) {
        throw new Error("Wallet account not available");
      }

      await switchChain(config, {
        chainId: l1WalletClient.chain!.id,
      });

      // Create SDK client and perform deposit
      const client = createViemClient({
        l1: getL1PublicClient(),
        l2: l2PublicClient,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        l1Wallet: l1WalletClient as any,
      });
      const sdk = createViemSdk(client);

      toast.info("Initiating deposit...");

      const handle = await sdk.deposits.create({
        token: ETH_ADDRESS,
        amount: depositAmount,
        to: walletStore.address,
      });

      toast.info("Deposit initiated, waiting for L2 confirmation...");
      await sdk.deposits.wait(handle, { for: "l2" });

      toast.success("Deposit complete!");

      // Clear the L1 and L2 balances in store to trigger refresh
      // The actual refresh will be handled by the component
    } catch (error) {
      console.error("Deposit failed:", error);
      toast.error("Deposit failed: " + (error as Error).message);
    } finally {
      isDepositing.value = false;
    }
  }

  return {
    isDepositing,
    deposit,
  };
}
