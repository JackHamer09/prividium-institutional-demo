import { defineStore } from "pinia";
import { connect, disconnect, getConnections, watchConnections } from "@wagmi/core";
import type { Address } from "viem";

export const useWalletStore = defineStore("wallet", () => {
  const config = useWagmiConfig();

  const address = ref<Address | undefined>(undefined);
  const isConnected = ref(false);
  const isConnecting = ref(false);
  const chainId = ref<number | undefined>(undefined);

  let unwatchConnections: (() => void) | undefined;

  /**
   * Update state from current connections
   */
  function updateAccountState() {
    const connections = getConnections(config);
    const connection = connections[0];

    if (connection) {
      address.value = connection.accounts[0];
      isConnected.value = true;
      chainId.value = connection.chainId;
    } else {
      address.value = undefined;
      isConnected.value = false;
      chainId.value = undefined;
    }
  }

  /**
   * Initialize wallet state and watch for changes
   */
  function initialize() {
    // Get initial state
    updateAccountState();

    // Watch for connection changes
    unwatchConnections = watchConnections(config, {
      onChange: () => {
        updateAccountState();
      },
    });
  }

  /**
   * Connect to wallet
   */
  async function connectWallet() {
    isConnecting.value = true;
    try {
      const connector = config.connectors[0];
      if (!connector) {
        throw new Error("No connector available");
      }
      await connect(config, { connector });
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      throw error;
    } finally {
      isConnecting.value = false;
    }
  }

  /**
   * Disconnect wallet and clear Prividium auth
   */
  async function disconnectWallet() {
    try {
      // Clear Prividium auth state first
      const prividiumStore = usePrividiumStore();
      prividiumStore.unauthorize();

      // Then disconnect wallet
      await disconnect(config);
      address.value = undefined;
      isConnected.value = false;
      chainId.value = undefined;
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
      throw error;
    }
  }

  /**
   * Clean up watchers
   */
  function cleanup() {
    if (unwatchConnections) {
      unwatchConnections();
    }
  }

  return {
    address,
    isConnected,
    isConnecting,
    chainId,
    initialize,
    connectWallet,
    disconnectWallet,
    cleanup,
  };
});
