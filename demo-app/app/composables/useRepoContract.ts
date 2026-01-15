import { readContract, waitForTransactionReceipt } from "@wagmi/core";
import type { Address, Hex } from "viem";
import { INTRADAY_REPO_ABI, type RepoOffer } from "../contracts/intraday-repo";
import { getMainChainId } from "../config/chains";

/**
 * Intraday Repo contract interactions (deployed on main chain only)
 */
export function useRepoContract() {
  const config = useWagmiConfig();
  const runtimeConfig = useRuntimeConfig();
  const toast = useToast();
  const walletStore = useWalletStore();
  const { executeWrite } = usePrividiumWrite();
  const { address } = storeToRefs(useWalletStore());
  const { getTokenAddress } = useTokenAddress();
  const repoAddress = runtimeConfig.public.intradayRepoContractAddress as Address;

  // Repo contract is always on main chain
  const mainChainId = getMainChainId();

  /**
   * Get all open offers
   */
  async function getOpenOffers(): Promise<RepoOffer[]> {
    try {
      const offers = await readContract(config, {
        account: address.value,
        address: repoAddress,
        abi: INTRADAY_REPO_ABI,
        functionName: "getOpenOffers",
        chainId: mainChainId,
      });
      return offers as RepoOffer[];
    } catch (error) {
      console.error("Failed to get open offers:", error);
      return [];
    }
  }

  /**
   * Get lender offers for a user
   */
  async function getLenderOffers(user: Address): Promise<RepoOffer[]> {
    try {
      const offers = await readContract(config, {
        account: address.value,
        address: repoAddress,
        abi: INTRADAY_REPO_ABI,
        functionName: "getLenderOffers",
        args: [user],
        chainId: mainChainId,
      });
      return offers as RepoOffer[];
    } catch (error) {
      console.error("Failed to get lender offers:", error);
      return [];
    }
  }

  /**
   * Get borrower offers for a user
   */
  async function getBorrowerOffers(user: Address): Promise<RepoOffer[]> {
    try {
      const offers = await readContract(config, {
        account: address.value,
        address: repoAddress,
        abi: INTRADAY_REPO_ABI,
        functionName: "getBorrowerOffers",
        args: [user],
        chainId: mainChainId,
      });
      return offers as RepoOffer[];
    } catch (error) {
      console.error("Failed to get borrower offers:", error);
      return [];
    }
  }

  /**
   * Calculate repayment amount for an offer
   */
  async function calculateRepaymentAmount(offerId: bigint): Promise<bigint> {
    try {
      const amount = await readContract(config, {
        account: address.value,
        address: repoAddress,
        abi: INTRADAY_REPO_ABI,
        functionName: "calculateRepaymentAmount",
        args: [offerId],
        chainId: mainChainId,
      });
      return amount as bigint;
    } catch (error) {
      console.error("Failed to calculate repayment amount:", error);
      return BigInt(0);
    }
  }

  /**
   * Get grace period from contract
   */
  async function getGracePeriod(): Promise<bigint> {
    try {
      const gracePeriod = await readContract(config, {
        account: address.value,
        address: repoAddress,
        abi: INTRADAY_REPO_ABI,
        functionName: "gracePeriod",
        chainId: mainChainId,
      });
      return gracePeriod as bigint;
    } catch (error) {
      console.error("Failed to get grace period:", error);
      return BigInt(120); // Default fallback
    }
  }

  /**
   * Create a new lending offer with cross-chain support
   */
  async function createOffer(params: {
    lendAssetId: Hex;
    lendAmount: bigint;
    collateralAssetId: Hex;
    collateralAmount: bigint;
    duration: bigint;
    lenderFee: bigint;
    lenderChainId?: bigint;
    lenderRefundAddress?: Address;
  }): Promise<bigint | null> {
    if (!walletStore.address) {
      toast.error("Wallet not connected");
      return null;
    }

    try {
      // Resolve asset IDs to addresses on main chain
      const lendToken = await getTokenAddress(mainChainId, params.lendAssetId);
      const collateralToken = await getTokenAddress(mainChainId, params.collateralAssetId);

      // Use wallet chain and address as defaults
      const lenderChainId = params.lenderChainId ?? BigInt(walletStore.chainId ?? mainChainId);
      const lenderRefundAddress = params.lenderRefundAddress ?? walletStore.address;

      const hash = await executeWrite({
        address: repoAddress,
        abi: INTRADAY_REPO_ABI,
        functionName: "createOffer",
        args: [
          lendToken,
          params.lendAmount,
          collateralToken,
          params.collateralAmount,
          params.duration,
          params.lenderFee,
          lenderChainId,
          lenderRefundAddress,
        ],
        chainId: mainChainId,
      });

      await waitForTransactionReceipt(config, { hash, chainId: mainChainId });

      toast.success("Offer created successfully");

      // TODO: Extract offer ID from event logs if needed
      return BigInt(0);
    } catch (error) {
      console.error("Failed to create offer:", error);
      toast.error("Failed to create offer");
      return null;
    }
  }

  /**
   * Accept an offer (borrow) with cross-chain support
   */
  async function acceptOffer(
    offerId: bigint,
    borrowerChainId?: bigint,
    borrowerRefundAddress?: Address,
  ): Promise<boolean> {
    if (!walletStore.address) {
      toast.error("Wallet not connected");
      return false;
    }

    try {
      // Use wallet chain and address as defaults
      const chainId = borrowerChainId ?? BigInt(walletStore.chainId ?? mainChainId);
      const refundAddress = borrowerRefundAddress ?? walletStore.address;

      const hash = await executeWrite({
        address: repoAddress,
        abi: INTRADAY_REPO_ABI,
        functionName: "acceptOffer",
        args: [offerId, chainId, refundAddress],
        chainId: mainChainId,
      });

      await waitForTransactionReceipt(config, { hash, chainId: mainChainId });

      toast.success("Offer accepted successfully");
      return true;
    } catch (error) {
      console.error("Failed to accept offer:", error);
      toast.error("Failed to accept offer");
      return false;
    }
  }

  /**
   * Repay a loan
   */
  async function repayLoan(offerId: bigint): Promise<boolean> {
    try {
      const hash = await executeWrite({
        address: repoAddress,
        abi: INTRADAY_REPO_ABI,
        functionName: "repayLoan",
        args: [offerId],
        chainId: mainChainId,
      });

      await waitForTransactionReceipt(config, { hash, chainId: mainChainId });

      toast.success("Loan repaid successfully");
      return true;
    } catch (error) {
      console.error("Failed to repay loan:", error);
      toast.error("Failed to repay loan");
      return false;
    }
  }

  /**
   * Claim collateral (lender, after default)
   */
  async function claimCollateral(offerId: bigint): Promise<boolean> {
    try {
      const hash = await executeWrite({
        address: repoAddress,
        abi: INTRADAY_REPO_ABI,
        functionName: "claimCollateral",
        args: [offerId],
        chainId: mainChainId,
      });

      await waitForTransactionReceipt(config, { hash, chainId: mainChainId });

      toast.success("Collateral claimed successfully");
      return true;
    } catch (error) {
      console.error("Failed to claim collateral:", error);
      toast.error("Failed to claim collateral");
      return false;
    }
  }

  /**
   * Cancel an offer (lender, before accepted)
   */
  async function cancelOffer(offerId: bigint): Promise<boolean> {
    try {
      const hash = await executeWrite({
        address: repoAddress,
        abi: INTRADAY_REPO_ABI,
        functionName: "cancelOffer",
        args: [offerId],
        chainId: mainChainId,
      });

      await waitForTransactionReceipt(config, { hash, chainId: mainChainId });

      toast.success("Offer cancelled successfully");
      return true;
    } catch (error) {
      console.error("Failed to cancel offer:", error);
      toast.error("Failed to cancel offer");
      return false;
    }
  }

  return {
    repoAddress,
    mainChainId,
    getOpenOffers,
    getLenderOffers,
    getBorrowerOffers,
    calculateRepaymentAmount,
    getGracePeriod,
    createOffer,
    acceptOffer,
    repayLoan,
    claimCollateral,
    cancelOffer,
  };
}
