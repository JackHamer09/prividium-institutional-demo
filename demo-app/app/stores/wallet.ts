import { defineStore } from "pinia";
import { connect, disconnect, getConnections, watchConnections } from "@wagmi/core";
import type { Address } from "viem";

export type WalletConnectorType = "injected" | "zksync-sso";

export const useWalletStore = defineStore("wallet", () => {
  const config = useWagmiConfig();

  const address = ref<Address | undefined>(undefined);
  const isConnected = ref(false);
  const isConnecting = ref(false);
  const chainId = ref<number | undefined>(undefined);
  const connectorType = ref<WalletConnectorType | undefined>(undefined);

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
      // Track which connector type is connected
      connectorType.value = connection.connector.id === "zksync-sso"
        ? "zksync-sso"
        : "injected";
    } else {
      address.value = undefined;
      isConnected.value = false;
      chainId.value = undefined;
      connectorType.value = undefined;
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
   * Get connector by type
   */
  function getConnectorByType(type: WalletConnectorType) {
    return config.connectors.find((c) => {
      if (type === "zksync-sso") {
        return c.id === "zksync-sso";
      }
      // For injected, match any connector that is not zksync-sso
      return c.id !== "zksync-sso";
    });
  }

  /**
   * Connect to wallet with specified connector type
   */
  async function connectWallet(type: WalletConnectorType = "injected") {
    isConnecting.value = true;
    try {
      const connector = getConnectorByType(type);
      if (!connector) {
        throw new Error(`No ${type} connector available`);
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
   * Disconnect wallet
   */
  async function disconnectWallet() {
    try {
      await disconnect(config);
      address.value = undefined;
      isConnected.value = false;
      chainId.value = undefined;
      connectorType.value = undefined;
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
    connectorType,
    initialize,
    connectWallet,
    disconnectWallet,
    cleanup,
  };
});
