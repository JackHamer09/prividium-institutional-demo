<template>
  <div class="min-h-screen flex items-center justify-center bg-white px-4">
    <div class="max-w-md w-full text-center">
      <h1 class="z-10 text-4xl font-display font-bold text-slate-900 mb-2">
        Intraday Repo
      </h1>
      <p class="z-10 text-slate-600 mb-8">
        Short-term collateralized lending market
      </p>

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
            <span class="text-sm text-green-700">Logged in with Prividium</span>
          </div>
        </div>

        <p class="text-sm text-slate-600 mb-4">
          Choose how to connect your wallet:
        </p>

        <!-- Wallet Connection Options -->
        <div class="space-y-3">
          <!-- Browser Wallet Option -->
          <CommonButton
            variant="primary"
            size="lg"
            full-width
            :loading="walletStore.isConnecting && connectingType === 'injected'"
            :disabled="walletStore.isConnecting && connectingType !== 'injected'"
            @click="handleConnect('injected')"
          >
            <span class="flex items-center justify-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              Browser Wallet
            </span>
          </CommonButton>

          <!-- ZKsync SSO Option -->
          <CommonButton
            variant="secondary"
            size="lg"
            full-width
            :loading="walletStore.isConnecting && connectingType === 'zksync-sso'"
            :disabled="walletStore.isConnecting && connectingType !== 'zksync-sso'"
            @click="handleConnect('zksync-sso')"
          >
            <span class="flex items-center justify-center gap-2">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
              ZKsync SSO
            </span>
          </CommonButton>
        </div>

        <p class="text-xs text-slate-500 mt-4">
          Browser Wallet: MetaMask, Rabby, etc.<br />
          ZKsync SSO: Passkey-based authentication
        </p>

        <button
          class="text-sm text-slate-500 hover:text-slate-700 mt-4 underline"
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

const walletStore = useWalletStore();
const prividiumStore = usePrividiumStore();
const toast = useToast();

// Track which button was clicked for loading state
const connectingType = ref<WalletConnectorType | null>(null);

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

function handleLogout() {
  prividiumStore.unauthorize();
}
</script>
