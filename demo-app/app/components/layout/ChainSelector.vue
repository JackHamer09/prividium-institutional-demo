<template>
  <Menu as="div" class="relative">
    <MenuButton class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
      <span
        class="w-2 h-2 rounded-full shrink-0"
        :class="mainButtonChain.statusDotClass"
      />
      <div class="flex flex-col text-left">
        <span class="text-sm font-medium text-slate-900 leading-tight">{{ mainButtonChain.name }}</span>
        <p v-if="mainButtonChain.shortMessage" class="text-xs" :class="mainButtonChain.statusMessageClass">
          {{ mainButtonChain.shortMessage }}
        </p>
      </div>
      <svg
        class="size-4 text-slate-500 shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </MenuButton>

    <transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <MenuItems class="absolute right-0 mt-2 w-56 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black/5 focus:outline-none">
        <div class="p-1">
          <div class="px-3 py-2 border-b border-slate-100 mb-1">
            <span class="text-xs text-slate-500 font-medium">Select Chain</span>
          </div>

          <MenuItem v-for="chain in chainItems" :key="chain.id" v-slot="{ active }">
            <button
              :class="[
                active ? 'bg-slate-100' : '',
                'group flex w-full items-center rounded-lg px-3 py-2 text-sm text-slate-700 cursor-pointer',
              ]"
              @click="handleChainSelect(chain.id)"
            >
              <span
                class="mr-2 w-2 h-2 rounded-full shrink-0"
                :class="chain.statusDotClass"
              />
              <div class="flex-1 text-left">
                <span>{{ chain.name }}</span>
                <p v-if="chain.longMessage" class="text-[0.65rem] leading-tight" :class="chain.statusMessageClass">
                  {{ chain.longMessage }}
                </p>
              </div>
              <svg
                v-if="chain.isSelected"
                class="w-4 h-4 text-blue-600 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </button>
          </MenuItem>
        </div>
      </MenuItems>
    </transition>
  </Menu>
</template>

<script lang="ts" setup>
import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/vue";
import { getAllChains } from "~/config/chains";

const prividiumStore = usePrividiumStore();
const walletStore = useWalletStore();
const { switchToChain } = useChainSwitch();
const toast = useToast();
const { isHealthy, shouldPoll } = useChainHealthCheck();

// Get all configured chains
const allChains = computed(() => {
  try {
    return getAllChains();
  } catch {
    return [];
  }
});

// Chain items with status info for dropdown
const chainItems = computed(() => {
  return allChains.value.map((chain) => {
    const isSelected = chain.id === prividiumStore.selectedChainId;
    const isAuthorized = prividiumStore.isChainAuthorized(chain.id);
    const isWalletOnChain = walletStore.chainId === chain.id;

    // Determine status
    let statusDotClass: string;
    let statusMessageClass: string;
    let shortMessage: string | null = null;
    let longMessage: string | null = null;

    if (isSelected && isWalletOnChain) {
      // Selected and wallet is on this chain - check health
      if (shouldPoll.value && !isHealthy.value) {
        // Health check active but failing
        statusDotClass = "bg-yellow-500";
        statusMessageClass = "text-yellow-600";
        shortMessage = "Connection issue";
        longMessage = "Wallet unable to reach network";
      } else {
        // Healthy or not yet checked
        statusDotClass = "bg-green-500";
        statusMessageClass = "";
      }
    } else if (isSelected && !isWalletOnChain) {
      // Selected but wallet is on different chain
      statusDotClass = "bg-yellow-500";
      statusMessageClass = "text-yellow-600";
      shortMessage = "Switch network";
      longMessage = "Click to switch wallet network";
    } else if (isAuthorized) {
      // Authorized but not selected
      statusDotClass = "bg-green-500";
      statusMessageClass = "";
    } else {
      // Not authorized
      statusDotClass = "bg-slate-300";
      statusMessageClass = "text-slate-500";
      longMessage = "Requires authorization";
    }

    return {
      id: chain.id,
      name: chain.name,
      isSelected,
      isAuthorized,
      isWalletOnChain,
      statusDotClass,
      statusMessageClass,
      shortMessage,
      longMessage,
    };
  });
});

// Get selected chain data for main button
const mainButtonChain = computed(() => {
  return chainItems.value.find((c) => c.isSelected) ?? {
    name: "Select Chain",
    statusDotClass: "bg-slate-300",
    statusMessageClass: "",
    shortMessage: null,
    longMessage: null,
    isWalletOnChain: false,
  };
});

/**
 * Handle chain selection from dropdown:
 * 1. Set selectedChainId in store (triggers auth screen if not authorized)
 * 2. If already authorized, try to switch wallet chain
 */
async function handleChainSelect(chainId: number) {
  // Set selected chain - if not authorized, layout will show auth screen
  prividiumStore.selectChain(chainId);

  // If chain is authorized, try to switch wallet
  if (prividiumStore.isChainAuthorized(chainId)) {
    const switched = await switchToChain(chainId);
    if (!switched) {
      toast.error("Please switch to the correct network in your wallet");
    }
  }
  // If not authorized, isSelectedChainAuthorized becomes false,
  // and layout will show auth screen automatically
}
</script>
