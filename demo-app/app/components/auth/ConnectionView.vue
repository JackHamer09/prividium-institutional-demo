<template>
  <div class="min-h-screen flex items-center justify-center bg-white px-4">
    <div class="max-w-md w-full text-center">
      <h1 class="z-10 text-4xl font-display font-bold text-slate-900 mb-2">
        Intraday Repo
      </h1>
      <p class="z-10 text-slate-600 mb-8">
        Short-term collateralized lending market
      </p>

      <!-- Step 1: Prividium Login (main chain) -->
      <div v-if="!prividiumStore.isAuthorized" class="space-y-4">
        <CommonSparkleButton
          :loading="prividiumStore.isAuthorizing"
          @click="handleAuthorize"
        >
          Login with Prividium
        </CommonSparkleButton>

        <p v-if="prividiumStore.authError" class="text-sm text-red-600 mt-2">
          {{ prividiumStore.authError }}
        </p>
      </div>

      <!-- Step 2: Connect Wallet (after Prividium auth) -->
      <div v-else-if="!walletStore.isConnected" class="space-y-4">
        <div class="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <div class="flex items-center justify-center gap-2">
            <svg
              class="w-5 h-5 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span class="text-sm text-green-700">Logged in with Prividium ({{ mainChain?.name }})</span>
          </div>
        </div>

        <!-- Wallet Connection Options -->
        <div class="space-y-3">
          <!-- ZKsync SSO Option (Primary) -->
          <CommonButton
            variant="primary"
            size="lg"
            full-width
            :loading="walletStore.isConnecting && connectingType === 'zksync-sso'"
            :disabled="walletStore.isConnecting && connectingType !== 'zksync-sso'"
            @click="handleConnect('zksync-sso')"
          >
            Continue with ZKsync SSO
          </CommonButton>

          <!-- Browser Wallet Option -->
          <CommonButton
            variant="secondary"
            size="lg"
            full-width
            :loading="walletStore.isConnecting && connectingType === 'injected'"
            :disabled="walletStore.isConnecting && connectingType !== 'injected'"
            @click="handleConnect('injected')"
          >
            Browser Wallet
          </CommonButton>
        </div>

        <button
          class="text-sm text-slate-500 hover:text-slate-700 mt-4 underline"
          @click="handleLogout"
        >
          Use different Prividium account
        </button>
      </div>

      <!-- Step 3: Additional Chain Authorization (optional) -->
      <div v-else-if="showStep3" class="space-y-4">
        <!-- Success badges for completed steps -->
        <div class="space-y-2 mb-4">
          <div class="bg-green-50 border border-green-200 rounded-lg p-3">
            <div class="flex items-center justify-center gap-2">
              <svg
class="w-5 h-5 text-green-600"
fill="none"
stroke="currentColor"
viewBox="0 0 24 24">
                <path
stroke-linecap="round"
stroke-linejoin="round"
stroke-width="2"
d="M5 13l4 4L19 7" />
              </svg>
              <span class="text-sm text-green-700">Logged in with Prividium ({{ mainChain?.name }})</span>
            </div>
          </div>
          <div class="bg-green-50 border border-green-200 rounded-lg p-3">
            <div class="flex items-center justify-center gap-2">
              <svg
class="w-5 h-5 text-green-600"
fill="none"
stroke="currentColor"
viewBox="0 0 24 24">
                <path
stroke-linecap="round"
stroke-linejoin="round"
stroke-width="2"
d="M5 13l4 4L19 7" />
              </svg>
              <span class="text-sm text-green-700">Wallet connected</span>
            </div>
          </div>
        </div>

        <!-- Connected to non-main chain message -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p class="text-sm text-blue-700">
            Your wallet is connected to <strong>{{ connectedChainName }}</strong>.
            You can authorize additional chains to view balances across networks.
          </p>
        </div>

        <!-- Authorize connected chain if not already authorized -->
        <div v-if="canAuthorizeConnectedChain" class="space-y-3">
          <CommonButton
            variant="primary"
            size="lg"
            full-width
            :loading="isAuthorizingChain === walletStore.chainId"
            @click="handleAuthorizeChain(walletStore.chainId!)"
          >
            Authorize {{ connectedChainName }}
          </CommonButton>
        </div>

        <!-- Other available chains to authorize -->
        <div v-if="otherChainsToAuthorize.length > 0" class="space-y-2 mt-4">
          <p class="text-sm text-slate-600 mb-2">Other available chains:</p>
          <CommonButton
            v-for="chain in otherChainsToAuthorize"
            :key="chain.id"
            variant="secondary"
            size="md"
            full-width
            :loading="isAuthorizingChain === chain.id"
            @click="handleAuthorizeChain(chain.id)"
          >
            Authorize {{ chain.name }}
          </CommonButton>
        </div>

        <!-- Continue without additional auth -->
        <button
          class="text-sm text-slate-500 hover:text-slate-700 mt-4 underline"
          @click="skipStep3"
        >
          Continue without additional authorization
        </button>

        <button
          class="text-sm text-slate-500 hover:text-slate-700 mt-2 underline block mx-auto"
          @click="handleLogout"
        >
          Use different account
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { WalletConnectorType } from "~/stores/wallet";
import { getAllChains } from "~/config/chains";

const walletStore = useWalletStore();
const prividiumStore = usePrividiumStore();
const toast = useToast();

const isAuthorizingChain = ref<number | null>(null);
const step3Skipped = ref(false);
// Track which button was clicked for loading state
const connectingType = ref<WalletConnectorType | null>(null);

// Get all configured chains
const allChains = computed(() => {
  try {
    return getAllChains();
  } catch {
    return [];
  }
});

// Get main chain
const mainChain = computed(() => allChains.value.find((c) => c.isMainChain));

// Check if connected chain can be authorized (is a known Prividium chain but not yet authorized)
const canAuthorizeConnectedChain = computed(() => {
  if (!walletStore.chainId) return false;
  const chain = allChains.value.find((c) => c.id === walletStore.chainId);
  if (!chain) return false;
  return !prividiumStore.isChainAuthorized(walletStore.chainId);
});

// Get name of connected chain
const connectedChainName = computed(() => {
  if (!walletStore.chainId) return "Unknown";
  const chain = allChains.value.find((c) => c.id === walletStore.chainId);
  return chain?.name || `Chain ${walletStore.chainId}`;
});

// Get other chains that can be authorized (not connected, not main if already authorized)
const otherChainsToAuthorize = computed(() => {
  return allChains.value.filter((chain) => {
    // Skip main chain (already authorized in step 1)
    if (chain.isMainChain) return false;
    // Skip connected chain (handled separately)
    if (chain.id === walletStore.chainId) return false;
    // Skip already authorized chains
    if (prividiumStore.isChainAuthorized(chain.id)) return false;
    return true;
  });
});

// Show Step 3 if wallet connected to non-main chain and user hasn't skipped
const showStep3 = computed(() => {
  if (step3Skipped.value) return false;
  // Only show if there are chains to authorize
  return canAuthorizeConnectedChain.value || otherChainsToAuthorize.value.length > 0;
});

async function handleAuthorize() {
  try {
    await prividiumStore.authorize();
  } catch (error) {
    console.error("Authorization error:", error);
    const message = error instanceof Error ? error.message : "Failed to authorize";
    toast.error(message);
  }
}

async function handleConnect(type: WalletConnectorType) {
  connectingType.value = type;
  try {
    await walletStore.connectWallet(type);
  } catch (error) {
    console.error("Connection error:", error);
    const message = error instanceof Error ? error.message : "Failed to connect wallet";
    toast.error(message);
  } finally {
    connectingType.value = null;
  }
}

async function handleAuthorizeChain(chainId: number) {
  isAuthorizingChain.value = chainId;
  try {
    await prividiumStore.authorize(chainId);
    toast.success(`Authorized ${getChainNameById(chainId)}`);
  } catch (error) {
    console.error("Chain authorization error:", error);
    const message = error instanceof Error ? error.message : "Failed to authorize chain";
    toast.error(message);
  } finally {
    isAuthorizingChain.value = null;
  }
}

function getChainNameById(chainId: number): string {
  const chain = allChains.value.find((c) => c.id === chainId);
  return chain?.name || `Chain ${chainId}`;
}

function skipStep3() {
  step3Skipped.value = true;
}

function handleLogout() {
  step3Skipped.value = false;
  prividiumStore.unauthorizeAll();
  walletStore.disconnectWallet();
}
</script>
