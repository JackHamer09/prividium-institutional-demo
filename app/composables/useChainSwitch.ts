import { switchChain } from "@wagmi/core";
import { getMainChainId } from "../config/chains";

/**
 * Chain switching utilities for ensuring correct network before write operations
 */
export function useChainSwitch() {
  const config = useWagmiConfig();
  const walletStore = useWalletStore();
  const toast = useToast();

  /**
   * Get the current main chain ID
   */
  function getChainId(): number {
    return getMainChainId();
  }

  /**
   * Ensure wallet is on the correct chain
   * Prompts user to switch if on wrong chain
   * @returns true if on correct chain or successfully switched, false otherwise
   */
  async function ensureCorrectChain(): Promise<boolean> {
    if (!walletStore.isConnected) {
      toast.error("Please connect your wallet first");
      return false;
    }

    const mainChainId = getMainChainId();

    if (walletStore.chainId === mainChainId) {
      return true; // Already on correct chain
    }

    try {
      await switchChain(config, { chainId: mainChainId });
      return true;
    } catch (error) {
      console.error("Failed to switch chain:", error);
      toast.error("Please switch to the correct network in your wallet");
      return false;
    }
  }

  return {
    getChainId,
    ensureCorrectChain,
  };
}
