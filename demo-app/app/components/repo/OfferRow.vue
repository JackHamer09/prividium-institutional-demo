<template>
  <tr class="hover:bg-slate-50 transition-colors">
    <!-- ID -->
    <td class="py-3 px-4 text-sm font-medium text-slate-900">
      #{{ offer.offerId.toString() }}
    </td>

    <!-- Lender -->
    <td class="py-3 px-4">
      <div class="flex items-center gap-2">
        <Web3Avatar v-if="!isLenderUser" :address="offer.lender" class="size-4" />
        <div>
          <div class="font-medium text-slate-900 leading-0">
            <span v-if="isLenderUser" class="text-sm">You</span>
            <span v-else class="text-xs">{{ formatAddress(offer.lender) }}</span>
          </div>
          <div v-if="lenderChainName" class="text-xs text-slate-500">
            on {{ lenderChainName }}
          </div>
        </div>
        <button
          v-if="!isLenderUser"
          class="text-slate-400 hover:text-slate-600 transition-colors"
          title="Copy address"
          @click="copyAddress(offer.lender)"
        >
          <DocumentDuplicateIcon class="h-3.5 w-3.5" />
        </button>
      </div>
    </td>

    <!-- Borrower -->
    <td class="py-3 px-4">
      <div v-if="hasBorrower" class="flex items-center gap-2">
        <Web3Avatar v-if="!isBorrowerUser" :address="offer.borrower" class="size-4" />
        <div>
          <div class="font-medium text-slate-900 leading-0">
            <span v-if="isBorrowerUser" class="text-sm">You</span>
            <span v-else class="text-xs">{{ formatAddress(offer.borrower) }}</span>
          </div>
          <div v-if="borrowerChainName" class="text-xs text-slate-500">
            on {{ borrowerChainName }}
          </div>
        </div>
        <button
          v-if="!isBorrowerUser"
          class="text-slate-400 hover:text-slate-600 transition-colors"
          title="Copy address"
          @click="copyAddress(offer.borrower!)"
        >
          <DocumentDuplicateIcon class="h-3.5 w-3.5" />
        </button>
      </div>
      <span v-else class="text-sm text-slate-400">-</span>
    </td>

    <!-- Lending -->
    <td class="py-3 px-4">
      <div class="flex items-center gap-1.5">
        <img
v-if="lendTokenConfig"
:src="`/${lendTokenConfig.iconUrl}`"
class="h-5 w-5"
alt="" />
        <div class="text-sm">
          <span class="font-semibold text-slate-900">
            {{ formatTokenAmount(offer.lendAmount, lendTokenConfig?.decimals || 18) }}
          </span>
          <span class="text-slate-600 ml-1">{{ lendTokenConfig?.symbol }}</span>
        </div>
      </div>
    </td>

    <!-- Collateral -->
    <td class="py-3 px-4">
      <div class="flex items-center gap-1.5">
        <img
v-if="collateralTokenConfig"
:src="`/${collateralTokenConfig.iconUrl}`"
class="h-5 w-5"
alt="" />
        <div class="text-sm">
          <span class="font-semibold text-slate-900">
            {{ formatTokenAmount(offer.collateralAmount, collateralTokenConfig?.decimals || 18) }}
          </span>
          <span class="text-slate-600 ml-1">{{ collateralTokenConfig?.symbol }}</span>
        </div>
      </div>
    </td>

    <!-- Duration / Time -->
    <td class="py-3 px-4">
      <div v-if="showCountdown" class="text-sm">
        <div class="font-mono font-semibold" :class="countdownColor">
          {{ formattedCountdown }}
        </div>
        <div class="text-xs text-slate-500">
          {{ statusInfo.status === 'grace_period' ? 'Grace Period' : 'Remaining' }}
        </div>
      </div>
      <div v-else class="text-sm text-slate-900">
        {{ formatDuration(Number(offer.duration)) }}
      </div>
    </td>

    <!-- Fee -->
    <td class="py-3 px-4">
      <div class="text-sm">
        <div class="font-medium text-slate-900">{{ formatBps(Number(offer.lenderFee)) }}</div>
        <div v-if="feeTokenAmount && lendTokenConfig" class="flex items-center gap-1 text-xs text-slate-600 text-nowrap">
          <img :src="`/${lendTokenConfig.iconUrl}`" class="h-3 w-3" alt="" />
          {{ formatTokenAmount(feeTokenAmount, lendTokenConfig.decimals, 2) }} {{ lendTokenConfig.symbol }}
        </div>
      </div>
    </td>

    <!-- Status -->
    <td class="py-3 px-4">
      <CommonBadge v-if="shouldShowStatus" :color="statusInfo.color" size="sm">
        {{ statusInfo.label }}
      </CommonBadge>
      <span v-else class="text-sm text-slate-400">-</span>
    </td>

    <!-- Actions -->
    <td class="py-3 px-4">
      <div class="flex gap-2">
        <CommonButton
          v-if="canAccept"
          variant="primary"
          size="sm"
          :loading="isProcessing"
          @click="emit('accept', offer.offerId)"
        >
          Borrow
        </CommonButton>

        <CommonButton
          v-if="canCancel"
          variant="danger"
          size="sm"
          :loading="isProcessing"
          @click="emit('cancel', offer.offerId)"
        >
          Cancel
        </CommonButton>

        <CommonButton
          v-if="canRepay"
          variant="primary"
          size="sm"
          :loading="isProcessing"
          @click="emit('repay', offer.offerId)"
        >
          Repay
        </CommonButton>

        <CommonButton
          v-if="canClaim"
          variant="primary"
          size="sm"
          :loading="isProcessing"
          @click="emit('claim', offer.offerId)"
        >
          Claim
        </CommonButton>
      </div>
    </td>
  </tr>
</template>

<script lang="ts" setup>
import type { Address } from "viem";
import { isAddressEqual } from "viem";
import Web3Avatar from "web3-avatar-vue";
import { DocumentDuplicateIcon } from "@heroicons/vue/24/outline";
import type { RepoOffer } from "~/contracts/intraday-repo";
import { calculateOfferStatus } from "~/utils/repo-status";
import { formatTokenAmount, formatAddress, formatBps, formatCountdown } from "~/utils/formatters";
import { formatDuration } from "~/config/repo";
import { getChainName, getMainChainId } from "~/config/chains";

interface Props {
  offer: RepoOffer
  userAddress?: Address
  gracePeriodSeconds: number
  processingOffers: Set<string>
}

const props = defineProps<Props>();

// Check if this offer is currently being processed
const isProcessing = computed(() =>
  props.processingOffers.has(props.offer.offerId.toString()),
);

const emit = defineEmits<{
  accept: [offerId: bigint]
  cancel: [offerId: bigint]
  repay: [offerId: bigint]
  claim: [offerId: bigint]
}>();

const toast = useToast();

// Main chain ID for token lookups (contract stores addresses from main chain)
const mainChainId = getMainChainId();

// Token configs - reactive lookup by address using preloaded cache
const lendTokenConfig = useTokenConfig(mainChainId, computed(() => props.offer.lendToken));
const collateralTokenConfig = useTokenConfig(mainChainId, computed(() => props.offer.collateralToken));

// Chain names for lender and borrower
const lenderChainName = computed(() => {
  if (!props.offer.lenderChainId) return undefined;
  return getChainName(Number(props.offer.lenderChainId));
});

const borrowerChainName = computed(() => {
  if (!props.offer.borrowerChainId || props.offer.borrowerChainId === 0n) return undefined;
  return getChainName(Number(props.offer.borrowerChainId));
});

// User identity checks using viem's isAddressEqual for proper comparison
const isLenderUser = computed(() =>
  props.userAddress && isAddressEqual(props.offer.lender, props.userAddress),
);
const isBorrowerUser = computed(() =>
  props.userAddress && props.offer.borrower && isAddressEqual(props.offer.borrower, props.userAddress),
);

// Check if borrower exists (not zero address)
const hasBorrower = computed(() =>
  props.offer.borrower && props.offer.borrower !== "0x0000000000000000000000000000000000000000",
);

// Live status with countdown
const now = useNow({ interval: 1000 });
const statusInfo = computed(() => {
  const currentTime = Math.floor(now.value.getTime() / 1000);
  return calculateOfferStatus(props.offer, currentTime, props.gracePeriodSeconds);
});

// Show status badge only for terminal states and grace period, not for open or normal active
const shouldShowStatus = computed(() =>
  statusInfo.value.status !== "open" && statusInfo.value.status !== "active",
);

// Countdown display
const showCountdown = computed(() => statusInfo.value.timeRemaining !== undefined && statusInfo.value.timeRemaining > 0);
const formattedCountdown = computed(() =>
  formatCountdown(statusInfo.value.timeRemaining || 0),
);
const countdownColor = computed(() => {
  if (statusInfo.value.status === "grace_period") return "text-red-600";
  if (statusInfo.value.status === "active") return "text-green-600";
  return "text-slate-600";
});

// Fee calculation
const feeTokenAmount = computed(() => {
  if (!props.offer.lendAmount || !props.offer.lenderFee) return null;
  return (props.offer.lendAmount * props.offer.lenderFee) / BigInt(10000);
});

// Action permissions
const canAccept = computed(() =>
  statusInfo.value.status === "open" && !isLenderUser.value,
);
const canCancel = computed(() =>
  statusInfo.value.canCancel && isLenderUser.value,
);
const canRepay = computed(() =>
  statusInfo.value.canRepay && isBorrowerUser.value,
);
const canClaim = computed(() =>
  statusInfo.value.canClaim && isLenderUser.value,
);

// Copy to clipboard
function copyAddress(address: Address) {
  navigator.clipboard.writeText(address);
  toast.success("Address copied to clipboard");
}
</script>
