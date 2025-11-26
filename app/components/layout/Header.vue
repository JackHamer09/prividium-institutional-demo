<template>
  <header class="bg-white px-4">
    <div class="container max-w-6xl mx-auto py-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-display font-bold text-slate-900">
          Intraday Repo
        </h1>

        <LayoutAccountDropdown v-if="walletStore.isConnected" />
      </div>
    </div>
  </header>
</template>

<script lang="ts" setup>
const walletStore = useWalletStore();
</script>
