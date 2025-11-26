<template>
  <div class="min-h-screen flex items-center justify-center bg-white px-4">
    <div class="max-w-md w-full text-center">
      <h1 class="text-4xl font-display font-bold text-slate-900 mb-2">
        Intraday Repo
      </h1>
      <p class="text-slate-600 mb-8">
        Short-term collateralized lending market
      </p>

      <div class="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-8">
        <div class="flex items-center justify-between">
          <span class="text-sm text-slate-700">RPC Status:</span>
          <div class="flex items-center gap-2">
            <div
              :class="[
                'w-2 h-2 rounded-full',
                rpcStatus.isConnected ? 'bg-green-500' : 'bg-red-500',
              ]"
            />
            <span
class="text-sm font-medium"
:class="[
              rpcStatus.isConnected ? 'text-green-700' : 'text-red-700',
            ]">
              {{ rpcStatus.isConnected ? 'Connected' : rpcStatus.isChecking ? 'Checking...' : 'Disconnected' }}
            </span>
          </div>
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
    </div>
  </div>
</template>

<script lang="ts" setup>
const walletStore = useWalletStore();
const rpcStatus = useRpcStatus();
const toast = useToast();

// Start RPC monitoring
onMounted(() => {
  rpcStatus.startMonitoring();
});

async function handleConnect() {
  try {
    await walletStore.connectWallet();
  } catch (error) {
    console.error("Connection error:", error);
    const message = error instanceof Error ? error.message : "Failed to connect wallet";
    toast.error(message);
  }
}
</script>
