import { defineStore } from "pinia";
import type { RepoOffer } from "../contracts/intraday-repo";
import { isOfferActive, isOfferFinished } from "../utils/repo-status";

const STICKY_DURATION_MS = 30000; // 30 seconds

interface StickyOffer {
  offer: RepoOffer
  inactiveSince: Date
}

export const useRepoStore = defineStore("repo", () => {
  const allOffers = ref<RepoOffer[]>([]);
  const myLenderOffers = ref<RepoOffer[]>([]);
  const myBorrowerOffers = ref<RepoOffer[]>([]);
  const isLoading = ref(false);
  const lastUpdated = ref<Date | null>(null);

  // Track recently inactive offers to keep them visible temporarily
  const recentlyInactiveOffers = ref<Map<string, StickyOffer>>(new Map());

  /**
   * Set all open offers
   */
  function setAllOffers(offers: RepoOffer[]) {
    allOffers.value = offers;
    lastUpdated.value = new Date();
  }

  /**
   * Set user's lender offers
   */
  function setMyLenderOffers(offers: RepoOffer[]) {
    trackInactiveTransitions(myLenderOffers.value, offers);
    myLenderOffers.value = offers;
    lastUpdated.value = new Date();
  }

  /**
   * Set user's borrower offers
   */
  function setMyBorrowerOffers(offers: RepoOffer[]) {
    trackInactiveTransitions(myBorrowerOffers.value, offers);
    myBorrowerOffers.value = offers;
    lastUpdated.value = new Date();
  }

  /**
   * Track offers that transition from active to inactive
   */
  function trackInactiveTransitions(oldOffers: RepoOffer[], newOffers: RepoOffer[]) {
    const now = new Date();

    newOffers.forEach((newOffer) => {
      const oldOffer = oldOffers.find((o) => o.offerId === newOffer.offerId);

      // Detect transition: was active, now finished
      if (oldOffer && isOfferActive(oldOffer) && isOfferFinished(newOffer)) {
        recentlyInactiveOffers.value.set(newOffer.offerId.toString(), {
          offer: newOffer,
          inactiveSince: now,
        });
      }
    });

    // Clean up expired sticky offers
    cleanupExpiredStickyOffers();
  }

  /**
   * Remove sticky offers that have expired
   */
  function cleanupExpiredStickyOffers() {
    const now = new Date();
    const keysToDelete: string[] = [];

    for (const [id, entry] of recentlyInactiveOffers.value.entries()) {
      if (now.getTime() - entry.inactiveSince.getTime() > STICKY_DURATION_MS) {
        keysToDelete.push(id);
      }
    }

    keysToDelete.forEach((key) => recentlyInactiveOffers.value.delete(key));
  }

  /**
   * Get current offers including sticky inactive ones
   */
  function getCurrentOffersWithSticky(activeOffers: RepoOffer[]): RepoOffer[] {
    const stickyOffers = Array.from(recentlyInactiveOffers.value.values()).map((e) => e.offer);
    const combined = [...activeOffers, ...stickyOffers];

    // Deduplicate by offerId (prefer newer version from activeOffers)
    const offerMap = new Map<string, RepoOffer>();
    combined.forEach((offer) => {
      offerMap.set(offer.offerId.toString(), offer);
    });

    return Array.from(offerMap.values());
  }

  /**
   * Get offer by ID
   */
  function getOfferById(offerId: bigint): RepoOffer | undefined {
    const allOffersList = [
      ...allOffers.value,
      ...myLenderOffers.value,
      ...myBorrowerOffers.value,
    ];
    return allOffersList.find((offer) => offer.offerId === offerId);
  }

  /**
   * Clear all offers
   */
  function clearOffers() {
    allOffers.value = [];
    myLenderOffers.value = [];
    myBorrowerOffers.value = [];
    lastUpdated.value = null;
  }

  /**
   * Set loading state
   */
  function setLoading(loading: boolean) {
    isLoading.value = loading;
  }

  return {
    allOffers,
    myLenderOffers,
    myBorrowerOffers,
    isLoading,
    lastUpdated,
    recentlyInactiveOffers,
    setAllOffers,
    setMyLenderOffers,
    setMyBorrowerOffers,
    getOfferById,
    clearOffers,
    setLoading,
    getCurrentOffersWithSticky,
    cleanupExpiredStickyOffers,
  };
});
