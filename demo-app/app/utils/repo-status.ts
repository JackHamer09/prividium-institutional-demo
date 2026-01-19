import { OfferStatus, type RepoOffer } from "../contracts/intraday-repo";

export type OfferDisplayStatus =
  | "open"
  | "active"
  | "grace_period"
  | "past_due"
  | "completed"
  | "cancelled"
  | "defaulted"

export interface OfferStatusInfo {
  status: OfferDisplayStatus
  label: string
  color: "blue" | "green" | "red" | "yellow"
  timeRemaining?: number // seconds
  canRepay: boolean
  canClaim: boolean
  canCancel: boolean
}

/**
 * Calculate current status and available actions for an offer
 */
export function calculateOfferStatus(offer: RepoOffer, currentTime: number, gracePeriodSeconds: number): OfferStatusInfo {
  const endTime = Number(offer.endTime);
  const gracePeriodEnd = endTime + gracePeriodSeconds;

  // Handle completed states
  if (offer.status === OfferStatus.Completed) {
    return {
      status: "completed",
      label: "Completed",
      color: "blue",
      canRepay: false,
      canClaim: false,
      canCancel: false,
    };
  }

  if (offer.status === OfferStatus.Cancelled) {
    return {
      status: "cancelled",
      label: "Cancelled",
      color: "red",
      canRepay: false,
      canClaim: false,
      canCancel: false,
    };
  }

  if (offer.status === OfferStatus.Defaulted) {
    return {
      status: "defaulted",
      label: "Defaulted",
      color: "yellow",
      canRepay: false,
      canClaim: false,
      canCancel: false,
    };
  }

  // Handle open offer (not yet accepted)
  if (offer.status === OfferStatus.Open) {
    return {
      status: "open",
      label: "Open",
      color: "blue",
      canRepay: false,
      canClaim: false,
      canCancel: true,
    };
  }

  // Handle active offer (accepted by borrower)
  if (offer.status === OfferStatus.Active) {
    const timeRemaining = endTime - currentTime;

    // Past grace period - can claim collateral
    if (currentTime > gracePeriodEnd) {
      return {
        status: "past_due",
        label: "Past Due",
        color: "red",
        timeRemaining: 0,
        canRepay: false,
        canClaim: true,
        canCancel: false,
      };
    }

    // In grace period - can still repay but urgent
    if (currentTime > endTime) {
      const gracePeriodRemaining = gracePeriodEnd - currentTime;
      return {
        status: "grace_period",
        label: "Grace Period",
        color: "red",
        timeRemaining: gracePeriodRemaining,
        canRepay: true,
        canClaim: false,
        canCancel: false,
      };
    }

    // Normal active state
    return {
      status: "active",
      label: "Time Remaining",
      color: "green",
      timeRemaining,
      canRepay: true,
      canClaim: false,
      canCancel: false,
    };
  }

  // Default fallback
  return {
    status: "open",
    label: "Unknown",
    color: "blue",
    canRepay: false,
    canClaim: false,
    canCancel: false,
  };
}

/**
 * Check if an offer is in an active/ongoing state
 */
export function isOfferActive(offer: RepoOffer): boolean {
  return offer.status === OfferStatus.Active;
}

/**
 * Check if an offer is in a final/completed state
 */
export function isOfferFinished(offer: RepoOffer): boolean {
  return (
    offer.status === OfferStatus.Completed ||
    offer.status === OfferStatus.Cancelled ||
    offer.status === OfferStatus.Defaulted
  );
}

/**
 * Get status color for styling
 */
export function getStatusColor(status: OfferDisplayStatus): string {
  switch (status) {
    case "open":
    case "completed":
      return "blue";
    case "active":
      return "green";
    case "grace_period":
    case "past_due":
    case "cancelled":
      return "red";
    case "defaulted":
      return "yellow";
    default:
      return "blue";
  }
}
