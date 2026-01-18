<template>
  <div class="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
    <!-- Header: Avatar + ID + Address + Status -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <Web3Avatar :address="offer.lender" :size="32" />
        <div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-slate-900">#{{ offer.offerId.toString() }}</span>
            <button
              v-if="offer.lender"
              class="text-slate-400 hover:text-slate-600 transition-colors"
              title="Copy lender address"
              @click="copyAddress(offer.lender)"
            >
              <DocumentDuplicateIcon class="h-4 w-4" />
            </button>
          </div>
          <div class="text-xs text-slate-500">
            {{ isLenderUser ? 'You' : formatAddress(offer.lender) }}
          </div>
        </div>
      </div>

      <!-- Status Badge (only show when not open/default) -->
      <CommonBadge v-if="shouldShowStatus" :color="statusInfo.color" size="sm">
        {{ statusInfo.label }}
      </CommonBadge>
    </div>

    <!-- Borrower Info (when loan is active) -->
    <div v-if="hasBorrower" class="flex items-center gap-2 mb-3 pl-10">
      <Web3Avatar :address="offer.borrower" :size="24" />
      <div class="text-xs">
        <span class="text-slate-500">Borrower: </span>
        <span class="font-medium">{{ isBorrowerUser ? 'You' : formatAddress(offer.borrower) }}</span>
        <button
          v-if="offer.borrower"
          class="ml-1 text-slate-400 hover:text-slate-600 transition-colors inline-block"
          title="Copy borrower address"
          @click="copyAddress(offer.borrower)"
        >
          <DocumentDuplicateIcon class="h-3 w-3" />
        </button>
      </div>
    </div>

    <!-- Token Info Grid -->
    <div class="space-y-2 mb-3">
      <!-- Lending Token -->
      <div class="flex items-center gap-2">
        <img
v-if="lendTokenConfig"
:src="`/${lendTokenConfig.iconUrl}`"
class="h-5 w-5"
alt="" />
        <div class="flex items-baseline gap-1">
          <span class="font-semibold text-slate-900">
            {{ formatTokenAmount(offer.lendAmount, lendTokenConfig?.decimals || 18) }}
          </span>
          <span class="text-sm text-slate-600">{{ lendTokenConfig?.symbol }}</span>
        </div>
        <ArrowRightIcon class="h-4 w-4 text-slate-400 ml-auto" />
      </div>

      <!-- Collateral Token -->
      <div class="flex items-center gap-2">
        <img
v-if="collateralTokenConfig"
:src="`/${collateralTokenConfig.iconUrl}`"
class="h-5 w-5"
alt="" />
        <div class="flex items-baseline gap-1">
          <span class="font-semibold text-slate-900">
            {{ formatTokenAmount(offer.collateralAmount, collateralTokenConfig?.decimals || 18) }}
          </span>
          <span class="text-sm text-slate-600">{{ collateralTokenConfig?.symbol }}</span>
        </div>
        <span class="text-xs text-slate-500 ml-auto">Collateral</span>
      </div>
    </div>

    <!-- Info Grid: Duration & Fee -->
    <div class="grid grid-cols-2 gap-3 mb-3 text-sm">
      <div>
        <div class="text-xs text-slate-500 mb-0.5">Duration</div>
        <div class="font-medium text-slate-900">{{ formatDuration(Number(offer.duration)) }}</div>
      </div>
      <div>
        <div class="text-xs text-slate-500 mb-0.5">Fee</div>
        <div class="flex items-center gap-1">
          <span class="font-medium text-slate-900">{{ formatBps(Number(offer.lenderFee)) }}</span>
          <span v-if="feeTokenAmount && lendTokenConfig" class="text-xs text-slate-600">
            ({{ formatTokenAmount(feeTokenAmount, lendTokenConfig.decimals, 6) }} {{ lendTokenConfig.symbol }})
          </span>
        </div>
      </div>
    </div>

    <!-- Countdown Timer (for active loans) -->
    <div v-if="showCountdown" class="mb-3">
      <div class="text-center py-3 bg-slate-50 rounded-lg">
        <div class="text-xs text-slate-500 mb-1">
          {{ statusInfo.status === 'grace_period' ? 'Grace Period Ends In' : 'Time Remaining' }}
        </div>
        <div class="text-2xl font-mono font-bold" :class="countdownColor">
          {{ formattedCountdown }}
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex gap-2">
      <CommonButton
        v-if="canAccept"
        variant="primary"
        size="sm"
        class="flex-1"
        @click="emit('accept', offer.offerId)"
      >
        Borrow
      </CommonButton>

      <CommonButton
        v-if="canCancel"
        variant="danger"
        size="sm"
        class="flex-1"
        @click="emit('cancel', offer.offerId)"
      >
        Cancel
      </CommonButton>

      <CommonButton
        v-if="canRepay"
        variant="primary"
        size="sm"
        class="flex-1"
        @click="emit('repay', offer.offerId)"
      >
        Repay
      </CommonButton>

      <CommonButton
        v-if="canClaim"
        variant="primary"
        size="sm"
        class="flex-1"
        @click="emit('claim', offer.offerId)"
      >
        Claim
      </CommonButton>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { Address } from "viem";
import { isAddressEqual } from "viem";
import Web3Avatar from "web3-avatar-vue";
import { DocumentDuplicateIcon, ArrowRightIcon } from "@heroicons/vue/24/outline";
import type { RepoOffer } from "~/contracts/intraday-repo";
import { calculateOfferStatus } from "~/utils/repo-status";
import { formatTokenAmount, formatAddress, formatBps, formatCountdown } from "~/utils/formatters";
import { formatDuration } from "~/config/repo";
import { getMainChainId } from "~/config/chains";

interface Props {
  offer: RepoOffer
  userAddress?: Address
  gracePeriodSeconds: number
}

const props = defineProps<Props>();

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

// Show status badge only when not "Open"
const shouldShowStatus = computed(() => statusInfo.value.status !== "open");

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
