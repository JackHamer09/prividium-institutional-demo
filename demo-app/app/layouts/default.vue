<template>
  <div>
    <!-- Auth flow (not yet fully authorized) -->
    <AuthConnectionView v-if="!isFullyAuthorized" />

    <!-- Loading screen (after auth, preloading data) -->
    <AuthLoadingView v-else-if="!isReady" @ready="isReady = true" />

    <!-- Main app content -->
    <div v-else class="min-h-screen flex flex-col bg-white">
      <LayoutHeader />
      <main class="flex-1 w-full max-w-[min(95%,1200px)] mx-auto px-4 py-8">
        <slot />
      </main>
    </div>
  </div>
</template>

<script lang="ts" setup>
const walletStore = useWalletStore();
const prividiumStore = usePrividiumStore();

// Track if loading is complete
const isReady = ref(false);

// Wallet connected + main chain auth + selected chain authorized
const isFullyAuthorized = computed(() =>
  walletStore.isConnected &&
  prividiumStore.isAuthorized &&
  prividiumStore.isSelectedChainAuthorized,
);

// Reset isReady when authorization changes
watch(isFullyAuthorized, (authorized) => {
  if (!authorized) {
    isReady.value = false;
  }
});

// Initialize stores on mount
walletStore.initialize();
prividiumStore.initialize();

// Cleanup on unmount
onUnmounted(() => {
  walletStore.cleanup();
});
</script>
