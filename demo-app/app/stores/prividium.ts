import { defineStore } from "pinia";
import type { PrividiumChain, UserProfile } from "prividium";

interface ChainAuthState {
  isAuthorized: boolean;
  isAuthorizing: boolean;
  authError: string | null;
  userProfile: UserProfile | null;
}

export const usePrividiumStore = defineStore("prividium", () => {
  const { $prividiumChains, $mainChainId } = useNuxtApp();
  const prividiumChains = $prividiumChains as Map<number, PrividiumChain>;
  const mainChainId = $mainChainId as number;
  const toast = useToast();

  // Per-chain auth states
  const authStates = ref<Map<number, ChainAuthState>>(new Map());

  // Currently selected chain (null = no chain selected yet, forces Step 3)
  const selectedChainId = ref<number | null>(null);

  // Initialize auth states for all chains
  function initializeAuthStates() {
    for (const chainId of prividiumChains.keys()) {
      authStates.value.set(chainId, {
        isAuthorized: false,
        isAuthorizing: false,
        authError: null,
        userProfile: null,
      });
    }
  }

  // Computed: main chain authorization
  const isMainChainAuthorized = computed(() => {
    const state = authStates.value.get(mainChainId);
    return state?.isAuthorized ?? false;
  });

  // Computed: any chain authorizing
  const isAuthorizing = computed(() => {
    for (const state of authStates.value.values()) {
      if (state.isAuthorizing) {return true;}
    }
    return false;
  });

  // Computed: authorized chain IDs
  const authorizedChainIds = computed(() => {
    const ids: number[] = [];
    for (const [chainId, state] of authStates.value) {
      if (state.isAuthorized) {ids.push(chainId);}
    }
    return ids;
  });

  // Legacy computed for backward compatibility
  const isAuthorized = computed(() => isMainChainAuthorized.value);
  const authError = computed(() => {
    const state = authStates.value.get(mainChainId);
    return state?.authError ?? null;
  });

  // User profile computed properties (from main chain state)
  const userProfile = computed(() => {
    const state = authStates.value.get(mainChainId);
    return state?.userProfile ?? null;
  });
  const userDisplayName = computed(() => userProfile.value?.displayName ?? null);

  // Computed: is selected chain authorized (uses reactive authStates directly)
  const isSelectedChainAuthorized = computed(() => {
    if (selectedChainId.value === null) return false;
    const state = authStates.value.get(selectedChainId.value);
    return state?.isAuthorized ?? false;
  });

  /**
   * Check if already authorized on init for all chains
   */
  async function initialize() {
    initializeAuthStates();

    // Check auth status for all chains
    for (const [chainId, prividium] of prividiumChains) {
      const state = authStates.value.get(chainId);
      if (state && prividium.isAuthorized()) {
        state.isAuthorized = true;
      }
    }

    // Fetch main chain profile immediately (needed for auth screen UI)
    // Other chain profiles are fetched in LoadingView
    if (isMainChainAuthorized.value) {
      await fetchUserProfile(mainChainId);
    }
  }

  /**
   * Get Prividium instance for a specific chain
   */
  function getPrividium(chainId: number): PrividiumChain {
    const prividium = prividiumChains.get(chainId);
    if (!prividium) {
      throw new Error(`Prividium not configured for chain ${chainId}`);
    }
    return prividium;
  }

  /**
   * Check if chain is authorized
   */
  function isChainAuthorized(chainId: number): boolean {
    const state = authStates.value.get(chainId);
    return state?.isAuthorized ?? false;
  }

  /**
   * Trigger OAuth popup authorization for a specific chain
   */
  async function authorize(chainId?: number) {
    const targetChainId = chainId ?? mainChainId;
    const prividium = getPrividium(targetChainId);
    const state = authStates.value.get(targetChainId);
    if (!state) {return;}

    state.isAuthorizing = true;
    state.authError = null;

    try {
      await prividium.authorize({
        scopes: ["wallet:required"],
      });

      // Fetch user profile before completing auth
      await fetchUserProfile(targetChainId);

      state.isAuthorized = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Authorization failed";
      state.authError = message;

      // Don't throw on user cancellation
      if (message.includes("cancelled") || message.includes("closed")) {
        return;
      }
      throw error;
    } finally {
      state.isAuthorizing = false;
    }
  }

  /**
   * Fetch user profile for a chain
   */
  async function fetchUserProfile(chainId: number): Promise<UserProfile | null> {
    const prividium = prividiumChains.get(chainId);
    const state = authStates.value.get(chainId);
    if (!prividium || !state) {
      return null;
    }

    try {
      const profile = await prividium.fetchUser();
      state.userProfile = profile;
      return profile;
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      state.userProfile = null;
      return null;
    }
  }

  /**
   * Clear authorization state for a specific chain
   */
  function unauthorize(chainId?: number) {
    const targetChainId = chainId ?? mainChainId;
    const prividium = prividiumChains.get(targetChainId);
    const state = authStates.value.get(targetChainId);

    if (prividium) {
      prividium.unauthorize();
    }
    if (state) {
      state.isAuthorized = false;
      state.authError = null;
      state.userProfile = null;
    }
  }

  /**
   * Select a chain (for Step 3 auth flow)
   */
  function selectChain(chainId: number) {
    selectedChainId.value = chainId;
  }

  /**
   * Clear selected chain (resets to Step 3)
   */
  function clearSelectedChain() {
    selectedChainId.value = null;
  }

  /**
   * Unauthorize all chains
   */
  function unauthorizeAll() {
    for (const chainId of prividiumChains.keys()) {
      unauthorize(chainId);
    }
    clearSelectedChain(); // Reset to null on logout
  }

  /**
   * Handle auth expiry - called by plugin's onAuthExpiry callback
   */
  function handleAuthExpiry(chainId: number) {
    const state = authStates.value.get(chainId);
    if (state) {
      state.isAuthorized = false;
      state.authError = null;
    }

    const prividium = prividiumChains.get(chainId);
    if (prividium) {
      prividium.unauthorize();
    }

    // If main chain expired, do full logout
    if (chainId === mainChainId) {
      toast.error("Session expired, please re-authorize");
      const walletStore = useWalletStore();
      walletStore.disconnectWallet();
    } else {
      toast.warning(`Session expired for chain ${chainId}`);
    }
  }

  /**
   * Add Prividium network to wallet (MetaMask)
   */
  async function addNetworkToWallet(chainId?: number) {
    const targetChainId = chainId ?? mainChainId;
    const prividium = getPrividium(targetChainId);

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
   * Get auth headers for a specific chain
   */
  function getAuthHeaders(chainId?: number) {
    const targetChainId = chainId ?? mainChainId;
    const prividium = getPrividium(targetChainId);
    return prividium.getAuthHeaders();
  }

  return {
    // State
    authStates,
    mainChainId,
    selectedChainId,
    // Computed
    isAuthorized,
    isAuthorizing,
    authError,
    isMainChainAuthorized,
    isSelectedChainAuthorized,
    authorizedChainIds,
    // User profile
    userProfile,
    userDisplayName,
    // Actions
    initialize,
    getPrividium,
    isChainAuthorized,
    authorize,
    selectChain,
    clearSelectedChain,
    unauthorize,
    unauthorizeAll,
    handleAuthExpiry,
    addNetworkToWallet,
    getAuthHeaders,
    fetchUserProfile,
  };
});
