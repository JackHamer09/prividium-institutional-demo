<template>
  <div>
    <AuthConnectionView v-if="!walletStore.isConnected" />

    <div v-else class="min-h-screen flex flex-col bg-white">
      <LayoutHeader />
      <main class="flex-1 container mx-auto px-4 py-8">
        <slot />
      </main>
    </div>
  </div>
</template>

<script lang="ts" setup>
const walletStore = useWalletStore();

// Initialize wallet store on mount
walletStore.initialize();

// Cleanup on unmount
onUnmounted(() => {
  walletStore.cleanup();
});
</script>
