<template>
  <div class="max-w-2xl mx-auto">
    <!-- Chain Tabs (above the balance card) -->
    <div v-if="authorizedChains.length > 1" class="mb-3">
      <div class="inline-flex gap-1 rounded-lg bg-slate-200/70 p-1">
        <button
          v-for="chain in authorizedChains"
          :key="chain.id"
          class="px-4 py-1.5 cursor-pointer text-sm font-medium rounded-md transition-all duration-150"
          :class="selectedChainId === chain.id
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'"
          @click="selectedChainId = chain.id"
        >
          {{ chain.name }}
        </button>
      </div>
    </div>

    <!-- Balance Card -->
    <div class="border border-slate-200 rounded-lg overflow-hidden">
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
            v-if="isMainChainSelected"
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
        :key="token.assetId"
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
              {{ getFormattedBalance(token.assetId) }}
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
      <!-- L2 ETH Balance -->
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
          <span class="font-medium text-slate-900">{{ formattedEthBalance }}</span>
          <span class="text-sm text-slate-500 ml-1">ETH</span>
        </div>
      </div>

      <!-- Bridge Section -->
      <div class="px-4 py-3 border-t border-slate-100 bg-slate-50">
        <div class="flex items-center justify-between text-sm text-slate-500 mb-3">
          <span>{{ l1Chain.name }} Balance</span>
          <span>{{ formattedL1EthBalance }} ETH</span>
        </div>

        <div class="flex gap-2">
          <input
            v-model="depositAmount"
            type="text"
            placeholder="0.01"
            class="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <CommonButton
            variant="primary"
            size="sm"
            :loading="isDepositing"
            :disabled="!depositAmount"
            @click="handleDeposit"
          >
            Deposit from {{ l1Chain.name }}
          </CommonButton>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { Hex } from "viem";
import { ChevronDownIcon } from "@heroicons/vue/20/solid";
import { getL1Chain, getMainChainId, getAllChains } from "~/config/chains";
import { BALANCE_REFRESH_INTERVAL_MS } from "~/config/repo";

const prividiumStore = usePrividiumStore();
const isManualRefreshing = ref(false);
const isMintingAll = ref(false);

// ETH bridge state
const isEthExpanded = ref(false);
const depositAmount = ref("");

// Main chain ID and L1 chain
const mainChainId = getMainChainId();
const l1Chain = computed(() => getL1Chain());

// Get all authorized chains with their config
const authorizedChains = computed(() => {
  const allChains = getAllChains();
  return allChains.filter((c) => prividiumStore.isChainAuthorized(c.id));
});

// Selected chain for balance display - syncs with store's selected chain
const selectedChainId = ref(prividiumStore.selectedChainId ?? mainChainId);

// Whether main chain is selected
const isMainChainSelected = computed(() => selectedChainId.value === mainChainId);

// Unified balance composable with reactive chainId
const {
  tokens,
  formattedEthBalance,
  formattedL1EthBalance,
  getFormattedBalance,
  refresh,
  mintTokens,
} = useBalances(selectedChainId);

// Bridge deposit functionality
const { isDepositing, deposit } = useL1Bridge();

// Sync with store's selected chain
watch(
  () => prividiumStore.selectedChainId,
  (storeChainId) => {
    if (storeChainId !== null) {
      selectedChainId.value = storeChainId;
    }
  },
);

// Watch for changes in authorized chains - reset to main if selected is no longer authorized
watch(
  () => prividiumStore.authorizedChainIds,
  (authorized) => {
    if (!authorized.includes(selectedChainId.value)) {
      selectedChainId.value = mainChainId;
    }
  },
);

async function handleManualRefresh() {
  isManualRefreshing.value = true;
  try {
    await refresh();
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

async function handleDeposit() {
  await deposit(depositAmount.value);
  depositAmount.value = "";
  // Refresh balances after deposit
  await refresh();
}

// Auto-refresh balances (silent, doesn't trigger loading states)
async function autoRefreshBalances() {
  try {
    await refresh();
  } catch (error) {
    // Silent auto-refresh - don't show errors
    console.error("Auto-refresh failed:", error);
  }
}

// Fetch balances on mount
onMounted(() => {
  refresh();
});

// Set up auto-refresh interval
useIntervalFn(autoRefreshBalances, BALANCE_REFRESH_INTERVAL_MS);
</script>
