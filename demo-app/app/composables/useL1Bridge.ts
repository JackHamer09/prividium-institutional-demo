import {
  createPublicClient,
  createWalletClient,
  custom,
  formatEther,
  http,
  parseEther,
} from "viem";
import type { Address, PublicClient, WalletClient } from "viem";
import type { PrividiumChain } from "prividium";
import { switchChain } from "@wagmi/core";
import { createViemClient, createViemSdk } from "@dutterbutter/zksync-sdk/viem";
import { ETH_ADDRESS } from "@dutterbutter/zksync-sdk/core";
import { getL1Chain } from "~/config/chains";

export function useL1Bridge() {
  const config = useWagmiConfig();
  const walletStore = useWalletStore();
  const toast = useToast();

  const l1EthBalance = ref<bigint>(0n);
  const l2EthBalance = ref<bigint>(0n);
  const isDepositing = ref(false);
  const isFetchingBalances = ref(false);

  // Lazy-initialized L1 public client
  let l1PublicClient: PublicClient | null = null;

  function getL1PublicClient(): PublicClient {
    if (!l1PublicClient) {
      const l1Chain = getL1Chain();
      l1PublicClient = createPublicClient({
        chain: l1Chain,
        transport: http(l1Chain.rpcUrls.default.http[0]),
      });
    }
    return l1PublicClient;
  }

  /**
   * Fetch L1 ETH balance
   */
  async function fetchL1Balance() {
    if (!walletStore.address) {
      return;
    }
    try {
      const balance = await getL1PublicClient().getBalance({
        address: walletStore.address,
      });
      l1EthBalance.value = balance;
    } catch (error) {
      console.error("Failed to fetch L1 balance:", error);
    }
  }

  /**
   * Fetch L2 ETH balance
   */
  async function fetchL2Balance() {
    if (!walletStore.address) {
      return;
    }
    try {
      const { $prividium } = useNuxtApp();
      const prividium = $prividium as PrividiumChain;

      const l2PublicClient = createPublicClient({
        chain: prividium.chain,
        transport: prividium.transport,
      });

      const balance = await l2PublicClient.getBalance({
        address: walletStore.address,
      });
      l2EthBalance.value = balance;
    } catch (error) {
      console.error("Failed to fetch L2 balance:", error);
    }
  }

  /**
   * Refresh both L1 and L2 balances
   */
  async function refreshBalances() {
    isFetchingBalances.value = true;
    try {
      await Promise.all([fetchL1Balance(), fetchL2Balance()]);
    } finally {
      isFetchingBalances.value = false;
    }
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
      chain: getL1Chain(),
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

    // Check if user has sufficient L1 balance
    const depositAmount = parseEther(amount);
    if (depositAmount > l1EthBalance.value) {
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
        throw new Error("Wallet account ,not available");
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
      await refreshBalances();
    } catch (error) {
      console.error("Deposit failed:", error);
      toast.error("Deposit failed: " + (error as Error).message);
    } finally {
      isDepositing.value = false;
    }
  }

  return {
    l1EthBalance,
    l2EthBalance,
    isDepositing,
    isFetchingBalances,
    fetchL1Balance,
    fetchL2Balance,
    refreshBalances,
    deposit,
    formattedL1Balance: computed(() => formatEther(l1EthBalance.value)),
    formattedL2Balance: computed(() => formatEther(l2EthBalance.value)),
  };
}
