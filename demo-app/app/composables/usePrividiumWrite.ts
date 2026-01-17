import { estimateGas, getGasPrice, getTransactionCount, sendTransaction, switchChain } from "@wagmi/core";
import { type Abi, type Address, encodeFunctionData, type Hex } from "viem";

/**
 * Wrapper for contract write operations that enables Prividium wallet token before each transaction
 * For ZKsync SSO connections, sends transactions directly without nonce/gas management
 * Now supports multi-chain by using the correct Prividium instance for each chain
 */
export function usePrividiumWrite() {
  const config = useWagmiConfig();
  const walletStore = useWalletStore();
  const prividiumStore = usePrividiumStore();

  /**
   * Execute a write transaction with Prividium wallet token authorization
   * For ZKsync SSO, sends transaction directly with just to and data
   * Uses the correct Prividium instance for the target chain
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

    // Check if authorized for this specific chain
    if (!prividiumStore.isChainAuthorized(params.chainId)) {
      throw new Error(`Not authorized with Prividium for chain ${params.chainId}`);
    }

    // Get the correct Prividium instance for the target chain
    const prividium = prividiumStore.getPrividium(params.chainId);

    // Encode the function call data
    const calldata = encodeFunctionData({
      abi: params.abi,
      functionName: params.functionName,
      args: params.args ?? [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const isZksyncSso = walletStore.connectorType === "zksync-sso";

    // For ZKsync SSO, just send transaction with to and data
    if (isZksyncSso) {
      const hash = await sendTransaction(config, {
        to: params.address,
        data: calldata,
        chainId: params.chainId,
      });

      return hash;
    }

    // For injected wallets, use full Prividium flow with nonce, gas, and enableWalletToken
    const nonce = await getTransactionCount(config, {
      address: walletStore.address,
      chainId: params.chainId,
    });

    const transactionParams = {
      to: params.address,
      data: calldata,
      chainId: params.chainId,
      type: "legacy",
    } as const;

    // Enable wallet token before transaction
    await prividium.authorizeTransaction({
      walletAddress: walletStore.address,
      toAddress: params.address,
      nonce,
      calldata,
    });
    
    await switchChain(config, { chainId: params.chainId });
    
    const gas = await estimateGas(config, transactionParams);
    const gasPrice = await getGasPrice(config, { chainId: params.chainId });
    const hash = await sendTransaction(config, {
      ...transactionParams,
      nonce,
      gas,
      gasPrice,
    });

    return hash;
  }

  return {
    executeWrite,
  };
}
