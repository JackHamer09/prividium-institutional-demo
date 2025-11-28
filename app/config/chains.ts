import type { Chain } from "viem";
import type { PrividiumChain } from "prividium";
import { sepolia } from "viem/chains";

/**
 * L1 chain configuration (Sepolia testnet)
 */
export const CHAIN_L1 = sepolia;

/**
 * Get the main chain from Prividium
 * Must be called after plugins are initialized (in composables/components)
 */
export function getMainChain(): Chain {
  const { $prividium } = useNuxtApp();
  return ($prividium as PrividiumChain).chain;
}

/**
 * Get main chain ID
 */
export function getMainChainId(): number {
  return getMainChain().id;
}

/**
 * Get chain configuration by ID
 */
export function getChainById(chainId: number): Chain {
  const mainChain = getMainChain();
  if (chainId === mainChain.id) {
    return mainChain;
  }
  throw new Error(`Unsupported chain ID: ${chainId}`);
}

/**
 * Get block explorer URL for an address
 */
export function getExplorerUrl(address: string, chainId?: number): string {
  const chain = chainId ? getChainById(chainId) : getMainChain();
  return `${chain.blockExplorers?.default.url}/address/${address}`;
}

/**
 * Get block explorer URL for a transaction
 */
export function getExplorerTxUrl(txHash: string, chainId?: number): string {
  const chain = chainId ? getChainById(chainId) : getMainChain();
  return `${chain.blockExplorers?.default.url}/tx/${txHash}`;
}
