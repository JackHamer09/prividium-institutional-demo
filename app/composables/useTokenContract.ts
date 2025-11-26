import { readContract, waitForTransactionReceipt, writeContract } from "@wagmi/core";
import { type Address, erc20Abi } from "viem";
import { MAIN_CHAIN_ID } from "../config/chains";

/**
 * ERC20 token contract interactions
 */
export function useTokenContract() {
  const config = useWagmiConfig();
  const toast = useToast();
  const { ensureCorrectChain } = useChainSwitch();

  /**
   * Get token balance for an address
   */
  async function getBalance(tokenAddress: Address, account: Address): Promise<bigint> {
    try {
      const balance = await readContract(config, {
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [account],
        chainId: MAIN_CHAIN_ID,
      });
      return balance as bigint;
    } catch (error) {
      console.error("Failed to get token balance:", error);
      return BigInt(0);
    }
  }

  /**
   * Get token allowance
   */
  async function getAllowance(
    tokenAddress: Address,
    owner: Address,
    spender: Address,
  ): Promise<bigint> {
    try {
      const allowance = await readContract(config, {
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "allowance",
        args: [owner, spender],
        chainId: MAIN_CHAIN_ID,
      });
      return allowance as bigint;
    } catch (error) {
      console.error("Failed to get token allowance:", error);
      return BigInt(0);
    }
  }

  /**
   * Approve token spending
   */
  async function approve(tokenAddress: Address, spender: Address, amount: bigint): Promise<boolean> {
    // Ensure wallet is on correct chain
    const chainOk = await ensureCorrectChain();
    if (!chainOk) {
      return false;
    }

    try {
      const hash = await writeContract(config, {
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [spender, amount],
        chainId: MAIN_CHAIN_ID,
      });

      toast.loading("Approving token...");

      await waitForTransactionReceipt(config, { hash, chainId: MAIN_CHAIN_ID });

      toast.success("Token approved successfully");
      return true;
    } catch (error) {
      console.error("Failed to approve token:", error);
      toast.error("Failed to approve token");
      return false;
    }
  }

  /**
   * Check if approval is needed and approve if necessary
   */
  async function ensureApproval(
    tokenAddress: Address,
    owner: Address,
    spender: Address,
    amount: bigint,
  ): Promise<boolean> {
    const allowance = await getAllowance(tokenAddress, owner, spender);

    if (allowance >= amount) {
      return true;
    }

    return await approve(tokenAddress, spender, amount);
  }

  return {
    getBalance,
    getAllowance,
    approve,
    ensureApproval,
  };
}
