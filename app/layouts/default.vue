<template>
  <div>
    <AuthConnectionView v-if="!isFullyAuthorized" />

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
const prividiumStore = usePrividiumStore();

// Both wallet AND Prividium auth required
const isFullyAuthorized = computed(() =>
  walletStore.isConnected && prividiumStore.isAuthorized,
);

// Initialize stores on mount
walletStore.initialize();
prividiumStore.initialize();

// Cleanup on unmount
onUnmounted(() => {
  walletStore.cleanup();
});
</script>
