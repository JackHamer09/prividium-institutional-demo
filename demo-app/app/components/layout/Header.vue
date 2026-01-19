<template>
  <header class="bg-white px-4">
    <div class="w-full max-w-[min(95%,1200px)] mx-auto py-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-display font-bold text-slate-900">
          Intraday Repo
        </h1>

        <div v-if="walletStore.isConnected" class="flex items-center gap-4">
          <LayoutChainSelector />
          <LayoutAccountDropdown />
        </div>
      </div>
    </div>
  </header>
</template>

<script lang="ts" setup>
const walletStore = useWalletStore();
</script>
