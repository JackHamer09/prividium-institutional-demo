<template>
  <div class="max-w-6xl mx-auto space-y-8">
    <div class="border-b border-slate-200">
      <nav class="-mb-px flex space-x-8">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="[
            activeTab === tab.id
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300',
            'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer',
          ]"
          @click="activeTab = tab.id"
        >
          {{ tab.name }}
          <span
            v-if="tab.id === 'current' && currentOffersCount > 0"
            class="ml-2 px-2 py-0.5 text-xs rounded-full"
            :class="activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'"
          >
            {{ currentOffersCount }}
          </span>
          <span
            v-if="tab.id === 'history' && historyOffersCount > 0"
            class="ml-2 px-2 py-0.5 text-xs rounded-full"
            :class="activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'"
          >
            {{ historyOffersCount }}
          </span>
        </button>
      </nav>
    </div>

    <div v-if="activeTab === 'current'" class="space-y-6">
      <div>
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-display font-semibold text-slate-900">
            My Active Offers
          </h3>
          <RepoCreateOfferButton size="sm" @success="refreshOffers" />
        </div>
        <div v-if="isLoading" class="text-center py-8">
          <CommonLoadingSpinner />
        </div>
        <div v-else-if="currentMyOffers.length === 0" class="text-center py-8 text-slate-500">
          No active offers
        </div>
        <RepoOfferTable
          v-else
          :offers="currentMyOffers"
          :user-address="walletStore.address"
          :grace-period-seconds="gracePeriodSeconds"
          :processing-offers="processingOffers"
          @accept="handleAcceptOffer"
          @cancel="handleCancelOffer"
          @repay="handleRepayLoan"
          @claim="handleClaimCollateral"
        />
      </div>

      <div>
        <h3 class="text-lg font-display font-semibold text-slate-900 mb-4">
          Available Offers
        </h3>
        <div v-if="isLoading" class="text-center py-8">
          <CommonLoadingSpinner />
        </div>
        <div v-else-if="availableOffers.length === 0" class="text-center py-8 text-slate-500">
          No available offers
        </div>
        <RepoOfferTable
          v-else
          :offers="availableOffers"
          :user-address="walletStore.address"
          :grace-period-seconds="gracePeriodSeconds"
          :processing-offers="processingOffers"
          @accept="handleAcceptOffer"
          @cancel="handleCancelOffer"
          @repay="handleRepayLoan"
          @claim="handleClaimCollateral"
        />
      </div>
    </div>

    <div v-if="activeTab === 'history'" class="space-y-6">
      <h3 class="text-lg font-display font-semibold text-slate-900 mb-4">
        History
      </h3>
      <div v-if="isLoading" class="text-center py-8">
        <CommonLoadingSpinner />
      </div>
      <div v-else-if="historyOffers.length === 0" class="text-center py-8 text-slate-500">
        No historical offers
      </div>
      <RepoOfferTable
        v-else
        :offers="historyOffers"
        :user-address="walletStore.address"
        :grace-period-seconds="gracePeriodSeconds"
        :processing-offers="processingOffers"
        @accept="handleAcceptOffer"
        @cancel="handleCancelOffer"
        @repay="handleRepayLoan"
        @claim="handleClaimCollateral"
      />
    </div>

    <RepoTokenBalances />
  </div>
</template>

<script lang="ts" setup>
import { isOfferFinished } from "~/utils/repo-status";
import { OFFERS_REFRESH_INTERVAL_MS } from "~/config/repo";

const tabs = [
  { id: "current", name: "Current Offers" },
  { id: "history", name: "History" },
];

const activeTab = ref("current");
const isLoading = ref(false);
const initialLoadComplete = ref(false);
const gracePeriodSeconds = ref(120); // Default fallback
const processingOffers = ref<Set<string>>(new Set());

const walletStore = useWalletStore();
const repoStore = useRepoStore();
const { refreshBalances } = useBalances();
const { getOpenOffers, getLenderOffers, getBorrowerOffers, getGracePeriod, acceptOffer, repayLoan, claimCollateral, cancelOffer } = useRepoContract();
const { ensureApproval } = useTokenContract();
const toast = useToast();

// Current (active) offers for the user, including sticky recently-inactive ones
const currentMyOffers = computed(() => {
  const activeOffers = [
    ...repoStore.myLenderOffers.filter((o) => !isOfferFinished(o)),
    ...repoStore.myBorrowerOffers.filter((o) => !isOfferFinished(o)),
  ];
  return repoStore.getCurrentOffersWithSticky(activeOffers);
});

// Available offers (from other users) - only show open/active ones
const availableOffers = computed(() => {
  if (!walletStore.address) return [];
  return repoStore.allOffers.filter(
    (offer) =>
      !isOfferFinished(offer) &&
      offer.lender.toLowerCase() !== walletStore.address?.toLowerCase(),
  );
});

// Historical offers (completed/cancelled/defaulted)
const historyOffers = computed(() => {
  return [
    ...repoStore.myLenderOffers.filter((o) => isOfferFinished(o)),
    ...repoStore.myBorrowerOffers.filter((o) => isOfferFinished(o)),
  ];
});

// Badge counts for tabs
const currentOffersCount = computed(() => currentMyOffers.value.length + availableOffers.value.length);
const historyOffersCount = computed(() => historyOffers.value.length);

async function refreshOffers() {
  if (!walletStore.address) return;

  // Only show loading spinner on initial load, not on auto-refresh
  if (!initialLoadComplete.value) {
    isLoading.value = true;
  }

  try {
    const [allOffers, lenderOffers, borrowerOffers] = await Promise.all([
      getOpenOffers(),
      getLenderOffers(walletStore.address),
      getBorrowerOffers(walletStore.address),
    ]);

    repoStore.setAllOffers(allOffers);
    repoStore.setMyLenderOffers(lenderOffers);
    repoStore.setMyBorrowerOffers(borrowerOffers);

    initialLoadComplete.value = true;
  } catch (error) {
    console.error("Failed to refresh offers:", error);
    toast.error("Failed to load offers");
  } finally {
    isLoading.value = false;
  }
}

async function handleAcceptOffer(offerId: bigint) {
  if (!walletStore.address) return;

  const offer = repoStore.getOfferById(offerId);
  if (!offer) return;

  const offerKey = offerId.toString();
  processingOffers.value.add(offerKey);

  try {
    const approved = await ensureApproval(
      offer.collateralToken,
      walletStore.address,
      useRepoContract().repoAddress,
      offer.collateralAmount,
    );

    if (!approved) return;

    const success = await acceptOffer(offerId);
    if (success) {
      await Promise.all([refreshOffers(), refreshBalances()]);
    }
  } catch (error) {
    console.error("Failed to accept offer:", error);
  } finally {
    processingOffers.value.delete(offerKey);
  }
}

async function handleRepayLoan(offerId: bigint) {
  if (!walletStore.address) return;

  const offer = repoStore.getOfferById(offerId);
  if (!offer) return;

  const offerKey = offerId.toString();
  processingOffers.value.add(offerKey);

  try {
    const repaymentAmount = offer.lendAmount + (offer.lendAmount * offer.lenderFee) / BigInt(10000);

    const approved = await ensureApproval(
      offer.lendToken,
      walletStore.address,
      useRepoContract().repoAddress,
      repaymentAmount,
    );

    if (!approved) return;

    const success = await repayLoan(offerId);
    if (success) {
      await Promise.all([refreshOffers(), refreshBalances()]);
    }
  } catch (error) {
    console.error("Failed to repay loan:", error);
  } finally {
    processingOffers.value.delete(offerKey);
  }
}

async function handleClaimCollateral(offerId: bigint) {
  const offerKey = offerId.toString();
  processingOffers.value.add(offerKey);

  try {
    const success = await claimCollateral(offerId);
    if (success) {
      await Promise.all([refreshOffers(), refreshBalances()]);
    }
  } catch (error) {
    console.error("Failed to claim collateral:", error);
  } finally {
    processingOffers.value.delete(offerKey);
  }
}

async function handleCancelOffer(offerId: bigint) {
  const offerKey = offerId.toString();
  processingOffers.value.add(offerKey);

  try {
    const success = await cancelOffer(offerId);
    if (success) {
      await Promise.all([refreshOffers(), refreshBalances()]);
    }
  } catch (error) {
    console.error("Failed to cancel offer:", error);
  } finally {
    processingOffers.value.delete(offerKey);
  }
}

// Load grace period and offers on mount
onMounted(async () => {
  // Fetch grace period from contract
  const gracePeriod = await getGracePeriod();
  gracePeriodSeconds.value = Number(gracePeriod);

  // Load offers
  refreshOffers();
});

// Refresh offers at configured interval
useIntervalFn(refreshOffers, OFFERS_REFRESH_INTERVAL_MS);
</script>
