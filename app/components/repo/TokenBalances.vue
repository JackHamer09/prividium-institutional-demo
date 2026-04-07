<template>
  <div class="max-w-2xl mx-auto border border-slate-200 rounded-lg overflow-hidden">
    <div class="px-4 py-3 flex items-center justify-between bg-slate-50">
      <span class="font-medium text-slate-900">Token Balances</span>
      <div class="flex items-center gap-2">
        <CommonButton
          variant="secondary"
          size="sm"
          :loading="isManualRefreshing"
          @click="handleManualRefresh"
        >
          Refresh
        </CommonButton>
        <CommonButton
          variant="secondary"
          size="sm"
          :loading="isMintingAll"
          @click="handleMintAll"
        >
          Mint
        </CommonButton>
      </div>
    </div>

    <div class="divide-y divide-slate-200">
      <div
        v-for="token in tokens"
        :key="token.address"
        class="px-4 py-3 flex items-center justify-between hover:bg-slate-50"
      >
        <div class="flex items-center gap-3">
          <img
            :src="token.iconUrl"
            :alt="token.symbol"
            class="w-8 h-8 rounded-full bg-slate-100"
          />
          <div>
            <p class="font-medium text-slate-900">{{ token.symbol }}</p>
            <p class="text-sm text-slate-500">{{ token.name }}</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <p class="text-right">
            <span class="font-medium text-slate-900">
              {{ getTokenBalance(token.address) }}
            </span>
            <span class="text-sm text-slate-500 ml-1">{{ token.symbol }}</span>
          </p>
        </div>
      </div>

      <div v-if="tokens.length === 0" class="px-4 py-8 text-center text-slate-500">
        No tokens configured
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { Address } from "viem";
import { BALANCE_REFRESH_INTERVAL_MS } from "~/config/repo";

const { tokens, refreshBalances, mintTokens } = useBalances();
const balancesStore = useBalancesStore();
const isManualRefreshing = ref(false);
const isMintingAll = ref(false);

function getTokenBalance(tokenAddress: Address): string {
  const balance = balancesStore.getBalance(tokenAddress);
  if (!balance) return "0";
  return formatTokenAmount(balance.balance, balance.decimals);
}

async function handleManualRefresh() {
  isManualRefreshing.value = true;
  try {
    await refreshBalances();
  } finally {
    isManualRefreshing.value = false;
  }
}

async function handleMintAll() {
  isMintingAll.value = true;
  try {
    await mintTokens();
  } finally {
    isMintingAll.value = false;
  }
}

// Auto-refresh balances (silent, doesn't trigger loading states)
async function autoRefreshBalances() {
  try {
    await refreshBalances();
  } catch (error) {
    // Silent auto-refresh - don't show errors
    console.error("Auto-refresh failed:", error);
  }
}

// Fetch balances on mount
onMounted(() => {
  refreshBalances();
});

// Set up auto-refresh interval
useIntervalFn(autoRefreshBalances, BALANCE_REFRESH_INTERVAL_MS);
</script>
