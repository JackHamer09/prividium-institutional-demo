import { readContract, waitForTransactionReceipt } from "@wagmi/core";
import { type Address, erc20Abi, type Hex, zeroAddress } from "viem";
import { getCachedAddress } from "./useTokenAddress";

export function useTokenContract() {
  const config = useWagmiConfig();
  const toast = useToast();
  const { executeWrite } = usePrividiumWrite();
  const { address: accountAddress } = storeToRefs(useWalletStore());

  /**
   * Resolve assetId to token address (sync, from preloaded cache)
   * Returns zeroAddress if not found in cache
   */
  function resolveAddress(params: { chainId: number; assetId: Hex }): Address {
    const address = getCachedAddress(params.chainId, params.assetId);
    if (!address) {
      console.warn(`Token address not found in cache for assetId ${params.assetId} on chain ${params.chainId}`);
      return zeroAddress;
    }
    return address;
  }

  async function getBalance(params: {
    chainId: number;
    assetId: Hex;
    account: Address;
  }): Promise<bigint> {
    const tokenAddress = resolveAddress({ chainId: params.chainId, assetId: params.assetId });
    if (tokenAddress === zeroAddress) {
      return 0n;
    }

    try {
      const balance = await readContract(config, {
        account: accountAddress.value,
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [params.account],
        chainId: params.chainId,
      });
      return balance as bigint;
    } catch (error) {
      console.error("Failed to get token balance:", error);
      return 0n;
    }
  }

  async function getAllowance(params: {
    chainId: number;
    assetId: Hex;
    owner: Address;
    spender: Address;
  }): Promise<bigint> {
    const tokenAddress = resolveAddress({ chainId: params.chainId, assetId: params.assetId });
    if (tokenAddress === zeroAddress) {
      return 0n;
    }

    try {
      const allowance = await readContract(config, {
        account: accountAddress.value,
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "allowance",
        args: [params.owner, params.spender],
        chainId: params.chainId,
      });
      return allowance as bigint;
    } catch (error) {
      console.error("Failed to get token allowance:", error);
      return 0n;
    }
  }

  async function approve(params: {
    chainId: number;
    assetId: Hex;
    spender: Address;
    amount: bigint;
  }): Promise<boolean> {
    const tokenAddress = resolveAddress({ chainId: params.chainId, assetId: params.assetId });
    if (tokenAddress === zeroAddress) {
      toast.error("Token not registered on this chain");
      return false;
    }

    try {
      const hash = await executeWrite({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [params.spender, params.amount],
        chainId: params.chainId,
      });

      toast.loading("Approving token...");

      await waitForTransactionReceipt(config, { hash, chainId: params.chainId });

      toast.success("Token approved successfully");
      return true;
    } catch (error) {
      console.error("Failed to approve token:", error);
      toast.error("Failed to approve token");
      return false;
    }
  }

  async function ensureApproval(params: {
    chainId: number;
    assetId: Hex;
    owner: Address;
    spender: Address;
    amount: bigint;
  }): Promise<boolean> {
    const allowance = await getAllowance({
      chainId: params.chainId,
      assetId: params.assetId,
      owner: params.owner,
      spender: params.spender,
    });

    if (allowance >= params.amount) {
      return true;
    }

    return await approve({
      chainId: params.chainId,
      assetId: params.assetId,
      spender: params.spender,
      amount: params.amount,
    });
  }

  return {
    getBalance,
    getAllowance,
    approve,
    ensureApproval,
    resolveAddress,
  };
}
