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

    <!-- ETH Balance Expand Toggle -->
    <button
      class="w-full px-4 py-2 flex items-center justify-between border-t border-slate-200 hover:bg-slate-50 transition-colors"
      @click="isEthExpanded = !isEthExpanded"
    >
      <span class="text-sm text-slate-600">ETH Balance</span>
      <ChevronDownIcon
        class="w-4 h-4 text-slate-400 transition-transform duration-200"
        :class="{ 'rotate-180': isEthExpanded }"
      />
    </button>

    <!-- Expandable ETH Section -->
    <div v-if="isEthExpanded" class="border-t border-slate-200">
      <!-- ETH Balance -->
      <div class="px-4 py-3 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <img
            src="/tokens/eth.svg"
            alt="ETH"
            class="w-8 h-8 rounded-full bg-slate-100"
          />
          <div>
            <p class="font-medium text-slate-900">ETH</p>
            <p class="text-sm text-slate-500">Ether</p>
          </div>
        </div>
        <div class="text-right">
          <span class="font-medium text-slate-900">{{ formattedL2Balance }}</span>
          <span class="text-sm text-slate-500 ml-1">ETH</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { Address } from "viem";
import { ChevronDownIcon } from "@heroicons/vue/20/solid";
import { BALANCE_REFRESH_INTERVAL_MS } from "~/config/repo";

const { tokens, refreshBalances, mintTokens } = useBalances();
const balancesStore = useBalancesStore();
const isManualRefreshing = ref(false);
const isMintingAll = ref(false);

// ETH balance state
const isEthExpanded = ref(false);
const {
  formattedL2Balance,
  refreshBalances: refreshEthBalances,
} = useL1Bridge();

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
    // Also refresh ETH balances if expanded
    if (isEthExpanded.value) {
      await refreshEthBalances();
    }
  } catch (error) {
    // Silent auto-refresh - don't show errors
    console.error("Auto-refresh failed:", error);
  }
}

// Fetch balances on mount
onMounted(() => {
  refreshBalances();
});

// Fetch ETH balances when expanded
watch(isEthExpanded, (expanded) => {
  if (expanded) {
    refreshEthBalances();
  }
});

// Set up auto-refresh interval
useIntervalFn(autoRefreshBalances, BALANCE_REFRESH_INTERVAL_MS);
</script>
