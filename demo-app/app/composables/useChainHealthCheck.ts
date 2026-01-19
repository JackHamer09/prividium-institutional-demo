import { getConnectorClient } from "@wagmi/core";

const HEALTH_CHECK_INTERVAL_MS = 2_000;

export function useChainHealthCheck() {
  const config = useWagmiConfig();
  const walletStore = useWalletStore();
  const prividiumStore = usePrividiumStore();

  // Minimal state - prefer computed for derived values
  const lastBlockNumber = ref<bigint | null>(null);
  const lastCheckTime = ref<Date | null>(null);
  const error = ref<string | null>(null);

  // Computed: should polling be active (wallet connected AND on selected chain)
  const shouldPoll = computed(() =>
    walletStore.isConnected &&
    prividiumStore.selectedChainId !== null &&
    walletStore.chainId === prividiumStore.selectedChainId,
  );

  // Computed: health status derived from state
  const isHealthy = computed(() =>
    shouldPoll.value && error.value === null && lastBlockNumber.value !== null,
  );

  /**
   * Check chain health by requesting block number directly from wallet provider
   */
  async function checkHealth(): Promise<void> {
    if (!shouldPoll.value || prividiumStore.selectedChainId === null) {
      return;
    }

    try {
      // Get wallet client from connector (uses wallet's RPC, not public transport)
      const client = await getConnectorClient(config, {
        chainId: prividiumStore.selectedChainId,
      });

      // Request block number through wallet's transport
      const blockNumber = await client.request({
        account: client.account,
        method: "eth_blockNumber",
      });

      lastBlockNumber.value = BigInt(blockNumber);
      lastCheckTime.value = new Date();
      error.value = null;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Connection failed";
      lastCheckTime.value = new Date();
      console.error("Wallet chain health check failed:", e);
    }
  }

  // Set up interval with VueUse - starts paused
  const { pause, resume, isActive } = useIntervalFn(checkHealth, HEALTH_CHECK_INTERVAL_MS, {
    immediate: false,
    immediateCallback: false,
  });

  // Auto pause/resume based on shouldPoll condition
  watch(shouldPoll, (active) => {
    if (active) {
      // Reset state and start fresh
      error.value = null;
      lastBlockNumber.value = null;
      lastCheckTime.value = null;
      checkHealth();
      resume();
    } else {
      pause();
    }
  }, { immediate: true });

  return {
    // Reactive state
    isHealthy,
    lastBlockNumber,
    lastCheckTime,
    error,
    shouldPoll,
    isActive,
    // Manual controls
    checkHealth,
    pause,
    resume,
  };
}
