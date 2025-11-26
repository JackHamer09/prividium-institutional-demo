import type { Address } from "viem";
export { INTRADAY_REPO_ABI } from "../abi/IntradayRepo";

/**
 * Offer status enum (matches contract)
 */
export enum OfferStatus {
  Open = 0,
  Active = 1,
  Completed = 2,
  Cancelled = 3,
  Defaulted = 4,
}

/**
 * TypeScript type for Repo Offer (simplified, native Ethereum only)
 */
export interface RepoOffer {
  offerId: bigint
  lender: Address
  borrower: Address
  lendToken: Address
  lendAmount: bigint
  collateralToken: Address
  collateralAmount: bigint
  duration: bigint
  startTime: bigint
  endTime: bigint
  lenderFee: bigint
  status: OfferStatus
}
