import { estimateGas, getGasPrice, getTransactionCount, sendTransaction } from "@wagmi/core";
import { type Abi, type Address, encodeFunctionData, type Hex } from "viem";
import type { PrividiumChain } from "prividium";

/**
 * Wrapper for contract write operations that enables Prividium wallet token before each transaction
 */
export function usePrividiumWrite() {
  const config = useWagmiConfig();
  const walletStore = useWalletStore();
  const prividiumStore = usePrividiumStore();
  const { $prividium } = useNuxtApp();
  const prividium = $prividium as PrividiumChain;

  /**
   * Execute a write transaction with Prividium wallet token authorization
   */
  async function executeWrite<TAbi extends Abi>(params: {
    address: Address;
    abi: TAbi;
    functionName: string;
    args?: readonly unknown[];
    chainId: number;
  }): Promise<Hex> {
    if (!walletStore.address) {
      throw new Error("Wallet not connected");
    }

    if (!prividiumStore.isAuthorized) {
      throw new Error("Not authorized with Prividium");
    }

    // Encode the function call data
    const calldata = encodeFunctionData({
      abi: params.abi,
      functionName: params.functionName,
      args: params.args ?? [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    // Get current nonce for the wallet
    const nonce = await getTransactionCount(config, {
      address: walletStore.address,
      chainId: params.chainId,
    });

    // Estimate gas for the transaction
    const gas = await estimateGas(config, {
      to: params.address,
      data: calldata,
      chainId: params.chainId,
    });

    // Get current gas price
    const gasPrice = await getGasPrice(config, {
      chainId: params.chainId,
    });

    // Enable wallet token before transaction
    await prividium.enableWalletToken({
      walletAddress: walletStore.address,
      contractAddress: params.address,
      nonce,
      calldata,
    });

    const hash = await sendTransaction(config, {
      to: params.address,
      data: calldata,
      chainId: params.chainId,
      nonce,
      gas: gas,
      gasPrice,
    });

    return hash;
  }

  return {
    executeWrite,
  };
}
