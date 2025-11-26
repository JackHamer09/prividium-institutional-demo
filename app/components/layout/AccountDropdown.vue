<template>
  <Menu as="div" class="relative">
    <MenuButton v-if="walletStore.address" class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
      <Web3Avatar class="size-7" :address="walletStore.address" />
      <div class="flex flex-col items-start">
        <span class="text-sm font-medium leading-tight text-slate-900">
          Connected Account
        </span>
        <span class="text-xs text-slate-500">
          {{ formattedAddress }}
        </span>
      </div>
      <svg
        class="size-4 text-slate-500"
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
          <MenuItem v-slot="{ active }">
            <button
              :class="[
                active ? 'bg-slate-100' : '',
                'group flex w-full items-center rounded-lg px-3 py-2 text-sm text-slate-700 cursor-pointer',
              ]"
              @click="copyAddress"
            >
              <svg
class="mr-2 h-4 w-4"
fill="none"
stroke="currentColor"
viewBox="0 0 24 24">
                <path
stroke-linecap="round"
stroke-linejoin="round"
stroke-width="2"
d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Address
            </button>
          </MenuItem>

          <MenuItem v-slot="{ active }">
            <a
              :href="explorerUrl"
              target="_blank"
              rel="noopener noreferrer"
              :class="[
                active ? 'bg-slate-100' : '',
                'group flex w-full items-center rounded-lg px-3 py-2 text-sm text-slate-700',
              ]"
            >
              <svg
class="mr-2 h-4 w-4"
fill="none"
stroke="currentColor"
viewBox="0 0 24 24">
                <path
stroke-linecap="round"
stroke-linejoin="round"
stroke-width="2"
d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View in Explorer
            </a>
          </MenuItem>

          <div class="my-1 h-px bg-slate-200" />

          <MenuItem v-slot="{ active }">
            <button
              :class="[
                active ? 'bg-red-100' : '',
                'group flex w-full items-center rounded-lg px-3 py-2 text-sm text-red-700 cursor-pointer',
              ]"
              @click="handleDisconnect"
            >
              <svg
class="mr-2 h-4 w-4"
fill="none"
stroke="currentColor"
viewBox="0 0 24 24">
                <path
stroke-linecap="round"
stroke-linejoin="round"
stroke-width="2"
d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Disconnect
            </button>
          </MenuItem>
        </div>
      </MenuItems>
    </transition>
  </Menu>
</template>

<script lang="ts" setup>
import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/vue";
import Web3Avatar from "web3-avatar-vue";
import { getExplorerUrl } from "~/config/chains";

const walletStore = useWalletStore();
const toast = useToast();

const formattedAddress = computed(() => {
  if (!walletStore.address) return "";
  return formatAddress(walletStore.address);
});

const explorerUrl = computed(() => {
  if (!walletStore.address) return "#";
  return getExplorerUrl(walletStore.address);
});

async function copyAddress() {
  if (!walletStore.address) return;

  try {
    await navigator.clipboard.writeText(walletStore.address);
    toast.success("Address copied to clipboard");
  } catch (error) {
    console.error("Failed to copy address:", error);
    toast.error("Failed to copy address");
  }
}

async function handleDisconnect() {
  try {
    await walletStore.disconnectWallet();
    toast.info("Wallet disconnected");
  } catch (error) {
    console.error("Failed to disconnect:", error);
    toast.error("Failed to disconnect wallet");
  }
}
</script>
