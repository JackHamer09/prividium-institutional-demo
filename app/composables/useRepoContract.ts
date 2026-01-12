import { readContract, waitForTransactionReceipt } from "@wagmi/core";
import type { Address } from "viem";
import { INTRADAY_REPO_ABI, type RepoOffer } from "../contracts/intraday-repo";

/**
 * Intraday Repo contract interactions
 */
export function useRepoContract() {
  const config = useWagmiConfig();
  const runtimeConfig = useRuntimeConfig();
  const toast = useToast();
  const { ensureCorrectChain, getChainId } = useChainSwitch();
  const { executeWrite } = usePrividiumWrite();
  const { address } = storeToRefs(useWalletStore());
  const repoAddress = runtimeConfig.public.intradayRepoContractAddress as Address;

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
        chainId: getChainId(),
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
        chainId: getChainId(),
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
        chainId: getChainId(),
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
        chainId: getChainId(),
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
        chainId: getChainId(),
      });
      return gracePeriod as bigint;
    } catch (error) {
      console.error("Failed to get grace period:", error);
      return BigInt(120); // Default fallback
    }
  }

  /**
   * Create a new lending offer
   */
  async function createOffer(params: {
    lendToken: Address
    lendAmount: bigint
    collateralToken: Address
    collateralAmount: bigint
    duration: bigint
    lenderFee: bigint
  }): Promise<bigint | null> {
    // Ensure wallet is on correct chain
    const chainOk = await ensureCorrectChain();
    if (!chainOk) {
      return null;
    }

    try {
      const hash = await executeWrite({
        address: repoAddress,
        abi: INTRADAY_REPO_ABI,
        functionName: "createOffer",
        args: [
          params.lendToken,
          params.lendAmount,
          params.collateralToken,
          params.collateralAmount,
          params.duration,
          params.lenderFee,
        ],
        chainId: getChainId(),
      });

      await waitForTransactionReceipt(config, { hash, chainId: getChainId() });

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
   * Accept an offer (borrow)
   */
  async function acceptOffer(offerId: bigint): Promise<boolean> {
    // Ensure wallet is on correct chain
    const chainOk = await ensureCorrectChain();
    if (!chainOk) {
      return false;
    }

    try {
      const hash = await executeWrite({
        address: repoAddress,
        abi: INTRADAY_REPO_ABI,
        functionName: "acceptOffer",
        args: [offerId],
        chainId: getChainId(),
      });

      await waitForTransactionReceipt(config, { hash, chainId: getChainId() });

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
    // Ensure wallet is on correct chain
    const chainOk = await ensureCorrectChain();
    if (!chainOk) {
      return false;
    }

    try {
      const hash = await executeWrite({
        address: repoAddress,
        abi: INTRADAY_REPO_ABI,
        functionName: "repayLoan",
        args: [offerId],
        chainId: getChainId(),
      });

      await waitForTransactionReceipt(config, { hash, chainId: getChainId() });

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
    // Ensure wallet is on correct chain
    const chainOk = await ensureCorrectChain();
    if (!chainOk) {
      return false;
    }

    try {
      const hash = await executeWrite({
        address: repoAddress,
        abi: INTRADAY_REPO_ABI,
        functionName: "claimCollateral",
        args: [offerId],
        chainId: getChainId(),
      });

      await waitForTransactionReceipt(config, { hash, chainId: getChainId() });

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
    // Ensure wallet is on correct chain
    const chainOk = await ensureCorrectChain();
    if (!chainOk) {
      return false;
    }

    try {
      const hash = await executeWrite({
        address: repoAddress,
        abi: INTRADAY_REPO_ABI,
        functionName: "cancelOffer",
        args: [offerId],
        chainId: getChainId(),
      });

      await waitForTransactionReceipt(config, { hash, chainId: getChainId() });

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
