import { getBlockNumber } from "@wagmi/core";
import { getMainChainId } from "~/config/chains";
import { RPC_CHECK_INTERVAL_MS } from "~/config/repo";

/**
 * RPC connection status monitoring
 */
export function useRpcStatus() {
  const config = useWagmiConfig();
  const isConnected = ref(false);
  const isChecking = ref(false);
  const lastChecked = ref<Date | null>(null);

  /**
   * Check RPC connectivity
   */
  async function checkConnection(): Promise<boolean> {
    isChecking.value = true;

    try {
      await getBlockNumber(config, { chainId: getMainChainId() });
      isConnected.value = true;
      lastChecked.value = new Date();
      return true;
    } catch (error) {
      console.error("RPC connection check failed:", error);
      isConnected.value = false;
      lastChecked.value = new Date();
      return false;
    } finally {
      isChecking.value = false;
    }
  }

  /**
   * Start periodic RPC checks
   */
  function startMonitoring() {
    checkConnection();
    const interval = setInterval(checkConnection, RPC_CHECK_INTERVAL_MS);

    onUnmounted(() => {
      clearInterval(interval);
    });

    return interval;
  }

  return {
    isConnected,
    isChecking,
    lastChecked,
    checkConnection,
    startMonitoring,
  };
}
