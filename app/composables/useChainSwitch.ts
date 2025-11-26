import { switchChain } from "@wagmi/core";
import { MAIN_CHAIN_ID } from "../config/chains";

/**
 * Chain switching utilities for ensuring correct network before write operations
 */
export function useChainSwitch() {
  const config = useWagmiConfig();
  const walletStore = useWalletStore();
  const toast = useToast();

  /**
   * Ensure wallet is on the correct chain (MAIN_CHAIN_ID)
   * Prompts user to switch if on wrong chain
   * @returns true if on correct chain or successfully switched, false otherwise
   */
  async function ensureCorrectChain(): Promise<boolean> {
    if (!walletStore.isConnected) {
      toast.error("Please connect your wallet first");
      return false;
    }

    if (walletStore.chainId === MAIN_CHAIN_ID) {
      return true; // Already on correct chain
    }

    try {
      await switchChain(config, { chainId: MAIN_CHAIN_ID });
      return true;
    } catch (error) {
      console.error("Failed to switch chain:", error);
      toast.error("Please switch to the correct network in your wallet");
      return false;
    }
  }

  return {
    ensureCorrectChain,
  };
}
