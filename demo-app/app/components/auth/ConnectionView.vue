<template>
  <div class="min-h-screen flex items-center justify-center bg-white px-4">
    <div class="max-w-md w-full text-center">
      <h1 class="z-10 text-4xl font-display font-bold text-slate-900 mb-2">
        Intraday Repo
      </h1>
      <p class="z-10 text-slate-600 mb-8">
        Short-term collateralized lending market
      </p>

      <!-- Auth Status Badges (shows completed steps) -->
      <div v-if="prividiumStore.isAuthorized" class="space-y-2 mb-6">
        <!-- Prividium badge -->
        <div class="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <svg
                  class="w-4 h-4 text-green-600"
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
              </div>
              <div class="text-left">
                <p v-if="isProfileLoading" class="h-4 w-24 bg-slate-200 rounded animate-pulse mb-1" />
                <p v-else class="text-sm font-medium text-slate-900">
                  {{ prividiumStore.userDisplayName || 'Prividium' }}
                </p>
                <p class="text-xs text-slate-500">Prividium account</p>
              </div>
            </div>
            <button
              class="text-xs text-slate-500 hover:text-slate-700 hover:underline"
              @click="handlePrividiumLogout"
            >
              Logout
            </button>
          </div>
        </div>

        <!-- Wallet badge (only when connected) -->
        <div v-if="walletStore.isConnected" class="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <svg
                  class="w-4 h-4 text-green-600"
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
              </div>
              <div class="text-left">
                <p class="text-sm font-medium text-slate-900">{{ formattedAddress }}</p>
                <p class="text-xs text-slate-500">Wallet connected</p>
              </div>
            </div>
            <button
              class="text-xs text-slate-500 hover:text-slate-700 hover:underline"
              @click="handleWalletDisconnect"
            >
              Disconnect
            </button>
          </div>
        </div>
      </div>

      <!-- Step 1: Prividium Login -->
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

      <!-- Step 2: Connect Wallet -->
      <div v-else-if="!walletStore.isConnected" class="space-y-4">
        <!-- <p class="text-sm text-slate-600 mb-4">
          Connect your wallet to continue:
        </p> -->
        <div class="space-y-3">
          <!-- <CommonButton
            variant="primary"
            size="lg"
            full-width
            :loading="walletStore.isConnecting && connectingType === 'zksync-sso'"
            :disabled="walletStore.isConnecting && connectingType !== 'zksync-sso'"
            @click="handleConnect('zksync-sso')"
          >
            Continue with ZKsync SSO
          </CommonButton> -->

          <CommonButton
            variant="primary"
            size="lg"
            full-width
            :loading="walletStore.isConnecting && connectingType === 'injected'"
            :disabled="walletStore.isConnecting && connectingType !== 'injected'"
            @click="handleConnect('injected')"
          >
            Connect Wallet
          </CommonButton>
        </div>
      </div>

      <!-- Step 3: Chain Selection -->
      <div v-else class="space-y-3">
        <p class="text-sm text-slate-600 mb-4">Select which chain to use:</p>

        <!-- Main chain option -->
        <div
          :class="switchChainError?.chainId === mainChain?.id
            ? 'bg-red-50 border border-red-200 rounded-lg p-3'
            : ''"
        >
          <p v-if="switchChainError?.chainId === mainChain?.id" class="text-sm text-red-700 mb-2">
            Please switch your wallet network
          </p>
          <CommonButton
            variant="primary"
            size="lg"
            full-width
            :loading="isAuthorizingChain === mainChain?.id || (isSwitchingChain && switchChainError?.chainId === mainChain?.id)"
            @click="switchChainError?.chainId === mainChain?.id ? retrySwitchChain() : handleSelectChain(mainChain!.id)"
          >
            {{ switchChainError?.chainId === mainChain?.id ? 'Switch to' : 'Continue on' }} {{ mainChain?.name }}
          </CommonButton>
        </div>

        <!-- Other chains -->
        <div v-if="otherChains.length > 0" class="space-y-2">
          <div
            v-for="chain in otherChains"
            :key="chain.id"
            :class="switchChainError?.chainId === chain.id
              ? 'bg-red-50 border border-red-200 rounded-lg p-3'
              : ''"
          >
            <p v-if="switchChainError?.chainId === chain.id" class="text-sm text-red-700 mb-2">
              Please switch your wallet network
            </p>
            <CommonButton
              variant="secondary"
              size="md"
              full-width
              :loading="isAuthorizingChain === chain.id || (isSwitchingChain && switchChainError?.chainId === chain.id)"
              @click="switchChainError?.chainId === chain.id ? retrySwitchChain() : handleSelectChain(chain.id)"
            >
              {{ switchChainError?.chainId === chain.id ? 'Switch to' : '' }} {{ chain.name }}
            </CommonButton>
          </div>
        </div>
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
const { switchToChain } = useChainSwitch();

const isAuthorizingChain = ref<number | null>(null);
const isSwitchingChain = ref(false);
const switchChainError = ref<{ chainId: number; chainName: string } | null>(null);
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

// Get non-main chains
const otherChains = computed(() => allChains.value.filter((c) => !c.isMainChain));

// Formatted wallet address
const formattedAddress = computed(() => {
  if (!walletStore.address) return "";
  return formatAddress(walletStore.address);
});

// Profile is loading if authorized but profile not yet fetched
const isProfileLoading = computed(() =>
  prividiumStore.isAuthorized && !prividiumStore.userProfile,
);

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

/**
 * Handle chain selection in Step 3:
 * 1. Set selectedChainId in store
 * 2. If chain not authorized, authorize first
 * 3. Try to switch wallet to that chain
 * 4. If switch fails, show error with retry button
 */
async function handleSelectChain(chainId: number) {
  const chainName = getChainNameById(chainId);
  switchChainError.value = null;

  // Authorize chain if not already authorized
  if (!prividiumStore.isChainAuthorized(chainId)) {
    isAuthorizingChain.value = chainId;
    try {
      await prividiumStore.authorize(chainId);
    } catch (error) {
      console.error("Chain authorization error:", error);
      const message = error instanceof Error ? error.message : "Failed to authorize chain";
      toast.error(message);
      isAuthorizingChain.value = null;
      return;
    }
    isAuthorizingChain.value = null;
  }

  // Try to switch wallet to the selected chain
  isSwitchingChain.value = true;
  const switched = await switchToChain(chainId);
  isSwitchingChain.value = false;

  if (switched) {
    // Only set selected chain after wallet successfully switched
    prividiumStore.selectChain(chainId);
  } else {
    // Show error state with retry button
    switchChainError.value = { chainId, chainName };
  }
}

async function retrySwitchChain() {
  if (!switchChainError.value) return;

  const { chainId } = switchChainError.value;

  isSwitchingChain.value = true;
  const switched = await switchToChain(chainId);
  isSwitchingChain.value = false;

  if (switched) {
    switchChainError.value = null;
    // Set selected chain after successful switch
    prividiumStore.selectChain(chainId);
  }
}

function getChainNameById(chainId: number): string {
  const chain = allChains.value.find((c) => c.id === chainId);
  return chain?.name || `Chain ${chainId}`;
}

function handlePrividiumLogout() {
  switchChainError.value = null;
  prividiumStore.unauthorizeAll();
  walletStore.disconnectWallet();
}

function handleWalletDisconnect() {
  switchChainError.value = null;
  prividiumStore.clearSelectedChain();
  walletStore.disconnectWallet();
}
</script>
