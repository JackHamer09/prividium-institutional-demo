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

        <CommonButton
          variant="primary"
          size="lg"
          full-width
          :loading="walletStore.isConnecting"
          @click="handleConnect"
        >
          Connect Wallet
        </CommonButton>

        <p class="text-xs text-slate-500 mt-4">
          Only browser wallet providers are supported
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
const walletStore = useWalletStore();
const prividiumStore = usePrividiumStore();
const toast = useToast();

async function handleAuthorize() {
  try {
    await prividiumStore.authorize();
  } catch (error) {
    console.error("Authorization error:", error);
    const message = error instanceof Error ? error.message : "Failed to authorize";
    toast.error(message);
  }
}

async function handleConnect() {
  try {
    await walletStore.connectWallet();
  } catch (error) {
    console.error("Connection error:", error);
    const message = error instanceof Error ? error.message : "Failed to connect wallet";
    toast.error(message);
  }
}

function handleLogout() {
  prividiumStore.unauthorize();
}
</script>
