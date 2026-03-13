<template>
  <header class="bg-white px-4">
    <div class="w-full max-w-[min(95%,1200px)] mx-auto py-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-display font-bold text-slate-900">
          Intraday Repo
        </h1>

        <div v-if="walletStore.isConnected" class="flex items-center gap-4">
          <div v-if="!isSso" class="flex items-center gap-2 px-3 py-2 rounded-lg">
            <span
              class="w-2 h-2 rounded-full shrink-0"
              :class="statusDotClass"
            />
            <div class="flex flex-col text-left">
              <span class="text-sm font-medium text-slate-900 leading-tight">{{ chainName }}</span>
              <p v-if="statusMessage" class="text-xs" :class="statusMessageClass">
                {{ statusMessage }}
              </p>
            </div>
          </div>
          <LayoutAccountDropdown />
        </div>
      </div>
    </div>
  </header>
</template>

<script lang="ts" setup>
import { getMainChainId } from "~/config/chains";

const walletStore = useWalletStore();
const runtimeConfig = useRuntimeConfig();
const { isHealthy, shouldPoll } = useRpcStatus();

const isSso = computed(() => walletStore.connectorType === "zksync-sso");

const chainName = computed(() => runtimeConfig.public.prividiumChainName || "Prividium");

const isWalletOnCorrectChain = computed(() => walletStore.chainId === getMainChainId());

const statusDotClass = computed(() => {
  if (!isWalletOnCorrectChain.value) return "bg-yellow-500";
  if (shouldPoll.value && !isHealthy.value) return "bg-yellow-500";
  return "bg-green-500";
});

const statusMessage = computed(() => {
  if (!isWalletOnCorrectChain.value) return "Wrong network";
  if (shouldPoll.value && !isHealthy.value) return "Connection issue";
  return null;
});

const statusMessageClass = computed(() => {
  if (!isWalletOnCorrectChain.value || (shouldPoll.value && !isHealthy.value)) {
    return "text-yellow-600";
  }
  return "";
});
</script>
