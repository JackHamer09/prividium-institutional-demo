import { getConnectorClient } from "@wagmi/core";
import { getMainChainId } from "~/config/chains";

const HEALTH_CHECK_INTERVAL_MS = 2_000;

/**
 * RPC connection health monitoring via wallet provider
 * Checks if the wallet can reach the network by requesting block number
 */
export function useRpcStatus() {
  const config = useWagmiConfig();
  const walletStore = useWalletStore();
  const prividiumStore = usePrividiumStore();

  const lastBlockNumber = ref<bigint | null>(null);
  const lastCheckTime = ref<Date | null>(null);
  const error = ref<string | null>(null);

  // Should polling be active (wallet connected AND authorized)
  const shouldPoll = computed(() =>
    walletStore.isConnected &&
    prividiumStore.isAuthorized &&
    walletStore.chainId === getMainChainId(),
  );

  // Health status derived from state
  const isHealthy = computed(() =>
    shouldPoll.value && error.value === null && lastBlockNumber.value !== null,
  );

  /**
   * Check chain health by requesting block number from wallet provider
   */
  async function checkHealth(): Promise<void> {
    if (!shouldPoll.value) {return;}

    try {
      const client = await getConnectorClient(config, {
        chainId: getMainChainId(),
      });

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

  // Auto pause/resume polling based on connection state
  const { pause, resume } = useIntervalFn(checkHealth, HEALTH_CHECK_INTERVAL_MS, {
    immediate: false,
    immediateCallback: false,
  });

  watch(shouldPoll, (active) => {
    if (active) {
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
    isHealthy,
    shouldPoll,
    lastBlockNumber,
    lastCheckTime,
    error,
    checkHealth,
  };
}
