import { defineStore } from "pinia";
import type { PrividiumChain } from "prividium";

export const usePrividiumStore = defineStore("prividium", () => {
  const { $prividium } = useNuxtApp();
  const prividium = $prividium as PrividiumChain;
  const toast = useToast();

  const isAuthorized = ref(false);
  const isAuthorizing = ref(false);
  const authError = ref<string | null>(null);

  /**
   * Check if already authorized on init
   */
  function initialize() {
    isAuthorized.value = prividium.isAuthorized();
  }

  /**
   * Trigger OAuth popup authorization
   */
  async function authorize() {
    isAuthorizing.value = true;
    authError.value = null;

    try {
      await prividium.authorize({
        // scopes: ["wallet:required", "network:required"],
        scopes: ["wallet:required"],
      });
      isAuthorized.value = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Authorization failed";
      authError.value = message;

      // Don't throw on user cancellation
      if (message.includes("cancelled") || message.includes("closed")) {
        return;
      }
      throw error;
    } finally {
      isAuthorizing.value = false;
    }
  }

  /**
   * Clear authorization state
   */
  function unauthorize() {
    prividium.unauthorize();
    isAuthorized.value = false;
    authError.value = null;
  }

  /**
   * Handle auth expiry - called by plugin's onAuthExpiry callback
   */
  function handleAuthExpiry() {
    unauthorize();
    toast.error("Session expired, please re-authorize");

    // Also disconnect wallet for full logout
    const walletStore = useWalletStore();
    walletStore.disconnectWallet();
  }

  /**
   * Add Prividium network to wallet (MetaMask)
   */
  async function addNetworkToWallet() {
    try {
      await prividium.addNetworkToWallet();
      toast.success("Network added to wallet");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add network";
      toast.error(message);
      throw error;
    }
  }

  /**
   * Get auth headers for manual API calls
   */
  function getAuthHeaders() {
    return prividium.getAuthHeaders();
  }

  return {
    // State
    isAuthorized,
    isAuthorizing,
    authError,
    // Actions
    initialize,
    authorize,
    unauthorize,
    handleAuthExpiry,
    addNetworkToWallet,
    getAuthHeaders,
  };
});
