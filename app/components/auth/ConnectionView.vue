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
