import { readContract, waitForTransactionReceipt } from "@wagmi/core";
import type { Address, Hex } from "viem";
import { encodeFunctionData } from "viem";
import {
  INTRADAY_REPO_ABI,
  type OfferStatus,
  type RepoOffer,
} from "../contracts/intraday-repo";
import { getMainChainId } from "../config/chains";
import type { BundleResult } from "./useInteropBundle";

/**
 * Intraday Repo contract interactions (deployed on main chain only)
 */
export function useRepoContract() {
  const config = useWagmiConfig();
  const runtimeConfig = useRuntimeConfig();
  const toast = useToast();
  const walletStore = useWalletStore();
  const prividiumStore = usePrividiumStore();
  const { executeWrite } = usePrividiumWrite();
  const { address } = storeToRefs(useWalletStore());
  const { getTokenAddress } = useTokenAddress();
  const { ensureApproval } = useTokenContract();
  const {
    isCrossChain,
    getShadowAccount,
    getAssetIdForToken,
    buildApproveCalldata,
    createBridgeToShadowCall,
    createBundle,
    sendInteropBundle,
  } = useInteropBundle();
  const repoAddress = runtimeConfig.public
    .intradayRepoContractAddress as Address;

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
   * Get a single offer by ID
   */
  async function getOfferById(offerId: bigint): Promise<RepoOffer | null> {
    try {
      const result = await readContract(config, {
        account: address.value,
        address: repoAddress,
        abi: INTRADAY_REPO_ABI,
        functionName: "offers",
        args: [offerId],
        chainId: mainChainId,
      });

      // The offers function returns individual fields, need to map to RepoOffer
      const [
        returnedOfferId,
        lender,
        borrower,
        lenderRefundAddress,
        borrowerRefundAddress,
        lenderChainId,
        borrowerChainId,
        lendToken,
        lendAmount,
        collateralToken,
        collateralAmount,
        duration,
        startTime,
        endTime,
        lenderFee,
        status,
      ] = result as [
        bigint,
        Address,
        Address,
        Address,
        Address,
        bigint,
        bigint,
        Address,
        bigint,
        Address,
        bigint,
        bigint,
        bigint,
        bigint,
        bigint,
        number,
      ];

      return {
        offerId: returnedOfferId,
        lender,
        borrower,
        lenderRefundAddress,
        borrowerRefundAddress,
        lenderChainId,
        borrowerChainId,
        lendToken,
        lendAmount,
        collateralToken,
        collateralAmount,
        duration,
        startTime,
        endTime,
        lenderFee,
        status: status as OfferStatus,
      };
    } catch (error) {
      console.error("Failed to get offer:", error);
      return null;
    }
  }

  /**
   * Create a new lending offer with cross-chain support
   * If on a different chain than mainChainId, uses interop bundle
   * Handles approval internally for both same-chain and cross-chain flows
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
  }): Promise<bigint | BundleResult | null> {
    if (!walletStore.address) {
      toast.error("Wallet not connected");
      return null;
    }

    try {
      // Resolve asset IDs to addresses on main chain
      const lendToken = await getTokenAddress(mainChainId, params.lendAssetId);
      const collateralToken = await getTokenAddress(
        mainChainId,
        params.collateralAssetId,
      );

      // Use selected chain and wallet address as defaults
      const sourceChainId = prividiumStore.selectedChainId ?? mainChainId;
      const lenderChainId = params.lenderChainId ?? BigInt(sourceChainId);
      const lenderRefundAddress =
        params.lenderRefundAddress ?? walletStore.address;

      // Check if we need cross-chain interop
      if (isCrossChain()) {
        return await createOfferCrossChain({
          lendToken,
          lendAmount: params.lendAmount,
          collateralToken,
          collateralAmount: params.collateralAmount,
          duration: params.duration,
          lenderFee: params.lenderFee,
          lenderChainId,
          lenderRefundAddress,
          lendAssetId: params.lendAssetId,
        });
      }

      // Same-chain: Handle approval and contract call
      const approved = await ensureApproval({
        chainId: mainChainId,
        assetId: params.lendAssetId,
        owner: walletStore.address,
        spender: repoAddress,
        amount: params.lendAmount,
      });

      if (!approved) return null;

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
          lenderChainId,
          lenderRefundAddress,
          params.lenderFee,
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
   * Create offer via cross-chain interop bundle
   */
  async function createOfferCrossChain(params: {
    lendToken: Address;
    lendAmount: bigint;
    collateralToken: Address;
    collateralAmount: bigint;
    duration: bigint;
    lenderFee: bigint;
    lenderChainId: bigint;
    lenderRefundAddress: Address;
    lendAssetId: Hex;
  }): Promise<BundleResult | null> {
    const shadowAccount = await getShadowAccount();

    // Build createOffer calldata
    const createOfferCalldata = encodeFunctionData({
      abi: INTRADAY_REPO_ABI,
      functionName: "createOffer",
      args: [
        params.lendToken,
        params.lendAmount,
        params.collateralToken,
        params.collateralAmount,
        params.duration,
        params.lenderChainId,
        params.lenderRefundAddress,
        params.lenderFee,
      ],
    });

    // Build approve calldata for lend token
    const approveCalldata = buildApproveCalldata(
      repoAddress,
      params.lendAmount,
    );

    // Build bundle:
    // 1. IndirectCall: Bridge lend tokens TO shadow account
    // 2. ShadowAccountCall: Approve lend tokens to repo contract
    // 3. ShadowAccountCall: createOffer()
    const bundle = createBundle()
      .addCall(
        createBridgeToShadowCall(
          params.lendAssetId,
          params.lendAmount,
          shadowAccount,
        ),
      )
      .addShadowAccountCall(params.lendToken, approveCalldata)
      .addShadowAccountCall(repoAddress, createOfferCalldata);

    const result = await sendInteropBundle(bundle, "Create Offer");
    toast.success("Offer created successfully");
    return result;
  }

  /**
   * Accept an offer (borrow) with cross-chain support
   * If on a different chain than mainChainId, uses interop bundle
   * Handles approval internally for both same-chain and cross-chain flows
   */
  async function acceptOffer(
    offerId: bigint,
    borrowerChainId?: bigint,
    borrowerRefundAddress?: Address,
  ): Promise<boolean | BundleResult> {
    if (!walletStore.address) {
      toast.error("Wallet not connected");
      return false;
    }

    try {
      // Use selected chain and wallet address as defaults
      const sourceChainId = prividiumStore.selectedChainId ?? mainChainId;
      const chainId = borrowerChainId ?? BigInt(sourceChainId);
      const refundAddress = borrowerRefundAddress ?? walletStore.address;

      // Get offer details for collateral info (needed for both flows)
      const offer = await getOfferById(offerId);
      if (!offer) {
        toast.error("Offer not found");
        return false;
      }

      // Check if we need cross-chain interop
      if (isCrossChain()) {
        const result = await acceptOfferCrossChain(
          offerId,
          offer,
          chainId,
          refundAddress,
        );
        return result ?? false;
      }

      // Same-chain: Handle approval and contract call
      const collateralAssetId = getAssetIdForToken(offer.collateralToken);
      const approved = await ensureApproval({
        chainId: mainChainId,
        assetId: collateralAssetId,
        owner: walletStore.address,
        spender: repoAddress,
        amount: offer.collateralAmount,
      });

      if (!approved) return false;

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
   * Accept offer via cross-chain interop bundle
   */
  async function acceptOfferCrossChain(
    offerId: bigint,
    offer: RepoOffer,
    borrowerChainId: bigint,
    borrowerRefundAddress: Address,
  ): Promise<BundleResult | null> {
    const shadowAccount = await getShadowAccount();

    // Get asset ID for collateral token
    const collateralAssetId = getAssetIdForToken(offer.collateralToken);

    // Build approve calldata for collateral token
    const approveCalldata = buildApproveCalldata(
      repoAddress,
      offer.collateralAmount,
    );

    // Build acceptOffer calldata
    const acceptOfferCalldata = encodeFunctionData({
      abi: INTRADAY_REPO_ABI,
      functionName: "acceptOffer",
      args: [offerId, borrowerChainId, borrowerRefundAddress],
    });

    // Build bundle:
    // 1. IndirectCall: Bridge collateral TO shadow account
    // 2. ShadowAccountCall: Approve collateral to repo contract
    // 3. ShadowAccountCall: acceptOffer()
    // Note: Contract handles lend token transfer to borrower via _transferTokens() internally
    const bundle = createBundle()
      .addCall(
        createBridgeToShadowCall(
          collateralAssetId,
          offer.collateralAmount,
          shadowAccount,
        ),
      )
      .addShadowAccountCall(offer.collateralToken, approveCalldata)
      .addShadowAccountCall(repoAddress, acceptOfferCalldata);

    const result = await sendInteropBundle(bundle, "Accept Offer");
    toast.success("Offer accepted successfully");
    return result;
  }

  /**
   * Repay a loan with cross-chain support
   * If on a different chain than mainChainId, uses interop bundle
   * Handles approval internally for both same-chain and cross-chain flows
   */
  async function repayLoan(offerId: bigint): Promise<boolean | BundleResult> {
    if (!walletStore.address) {
      toast.error("Wallet not connected");
      return false;
    }

    try {
      // Get offer details for token info (needed for both flows)
      const offer = await getOfferById(offerId);
      if (!offer) {
        toast.error("Offer not found");
        return false;
      }

      // Get repayment amount
      const repaymentAmount = await calculateRepaymentAmount(offerId);

      // Check if we need cross-chain interop
      if (isCrossChain()) {
        const result = await repayLoanCrossChain(
          offerId,
          offer,
          repaymentAmount,
        );
        return result ?? false;
      }

      // Same-chain: Handle approval and contract call
      const lendAssetId = getAssetIdForToken(offer.lendToken);
      const approved = await ensureApproval({
        chainId: mainChainId,
        assetId: lendAssetId,
        owner: walletStore.address,
        spender: repoAddress,
        amount: repaymentAmount,
      });

      if (!approved) return false;

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
   * Repay loan via cross-chain interop bundle
   */
  async function repayLoanCrossChain(
    offerId: bigint,
    offer: RepoOffer,
    repaymentAmount: bigint,
  ): Promise<BundleResult | null> {
    const shadowAccount = await getShadowAccount();

    // Get asset ID for lend token
    const lendAssetId = getAssetIdForToken(offer.lendToken);

    // Build approve calldata for repayment
    const approveCalldata = buildApproveCalldata(
      repoAddress,
      repaymentAmount,
    );

    // Build repayLoan calldata
    const repayLoanCalldata = encodeFunctionData({
      abi: INTRADAY_REPO_ABI,
      functionName: "repayLoan",
      args: [offerId],
    });

    // Build bundle:
    // 1. IndirectCall: Bridge lend tokens (repayment) TO shadow account
    // 2. ShadowAccountCall: Approve lend tokens to repo contract
    // 3. ShadowAccountCall: repayLoan()
    // Note: Contract handles collateral transfer to borrower via _transferTokens() internally
    const bundle = createBundle()
      .addCall(
        createBridgeToShadowCall(lendAssetId, repaymentAmount, shadowAccount),
      )
      .addShadowAccountCall(offer.lendToken, approveCalldata)
      .addShadowAccountCall(repoAddress, repayLoanCalldata);

    const result = await sendInteropBundle(bundle, "Repay Loan");
    toast.success("Loan repaid successfully");
    return result;
  }

  /**
   * Claim collateral (lender, after default) with cross-chain support
   * If on a different chain than mainChainId, uses interop bundle
   */
  async function claimCollateral(
    offerId: bigint,
  ): Promise<boolean | BundleResult> {
    if (!walletStore.address) {
      toast.error("Wallet not connected");
      return false;
    }

    try {
      // Check if we need cross-chain interop
      if (isCrossChain()) {
        // Get offer details for collateral info
        const offer = await getOfferById(offerId);
        if (!offer) {
          toast.error("Offer not found");
          return false;
        }

        const result = await claimCollateralCrossChain(offerId, offer);
        return result ?? false;
      }

      // Same-chain: Use existing direct flow
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
   * Claim collateral via cross-chain interop bundle
   */
  async function claimCollateralCrossChain(
    offerId: bigint,
    _offer: RepoOffer,
  ): Promise<BundleResult | null> {
    // Build claimCollateral calldata
    const claimCollateralCalldata = encodeFunctionData({
      abi: INTRADAY_REPO_ABI,
      functionName: "claimCollateral",
      args: [offerId],
    });

    // Build bundle:
    // 1. ShadowAccountCall: claimCollateral()
    // Note: Contract handles collateral transfer to lender via _transferTokens() internally
    const bundle = createBundle().addShadowAccountCall(
      repoAddress,
      claimCollateralCalldata,
    );

    const result = await sendInteropBundle(bundle, "Claim Collateral");
    toast.success("Collateral claimed successfully");
    return result;
  }

  /**
   * Cancel an offer (lender, before accepted) with cross-chain support
   * If on a different chain than mainChainId, uses interop bundle
   */
  async function cancelOffer(offerId: bigint): Promise<boolean | BundleResult> {
    if (!walletStore.address) {
      toast.error("Wallet not connected");
      return false;
    }

    try {
      // Check if we need cross-chain interop
      if (isCrossChain()) {
        // Get offer details for lend token info
        const offer = await getOfferById(offerId);
        if (!offer) {
          toast.error("Offer not found");
          return false;
        }

        const result = await cancelOfferCrossChain(offerId, offer);
        return result ?? false;
      }

      // Same-chain: Use existing direct flow
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

  /**
   * Cancel offer via cross-chain interop bundle
   */
  async function cancelOfferCrossChain(
    offerId: bigint,
    _offer: RepoOffer,
  ): Promise<BundleResult | null> {
    // Build cancelOffer calldata
    const cancelOfferCalldata = encodeFunctionData({
      abi: INTRADAY_REPO_ABI,
      functionName: "cancelOffer",
      args: [offerId],
    });

    // Build bundle:
    // 1. ShadowAccountCall: cancelOffer()
    // Note: Contract handles lend token transfer to lender via _transferTokens() internally
    const bundle = createBundle().addShadowAccountCall(
      repoAddress,
      cancelOfferCalldata,
      );

    const result = await sendInteropBundle(bundle, "Cancel Offer");
    toast.success("Offer cancelled successfully");
    return result;
  }

  return {
    repoAddress,
    mainChainId,
    getOpenOffers,
    getLenderOffers,
    getBorrowerOffers,
    calculateRepaymentAmount,
    getGracePeriod,
    getOfferById,
    createOffer,
    acceptOffer,
    repayLoan,
    claimCollateral,
    cancelOffer,
    // Cross-chain helpers
    isCrossChain,
  };
}
