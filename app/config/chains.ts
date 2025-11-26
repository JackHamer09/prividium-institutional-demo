import { sepolia } from "viem/chains";
import type { Chain } from "viem";

/**
 * Main chain - can be changed to any chain from viem/chains
 */
export const MAIN_CHAIN: Chain = sepolia;

/**
 * Main chain ID
 */
export const MAIN_CHAIN_ID = MAIN_CHAIN.id;

/**
 * Get chain configuration by ID
 */
export function getChainById(chainId: number): Chain {
  if (chainId === MAIN_CHAIN.id) {
    return MAIN_CHAIN;
  }
  throw new Error(`Unsupported chain ID: ${chainId}`);
}

/**
 * Get block explorer URL for an address
 */
export function getExplorerUrl(address: string, chainId?: number): string {
  const chain = chainId ? getChainById(chainId) : MAIN_CHAIN;
  return `${chain.blockExplorers?.default.url}/address/${address}`;
}

/**
 * Get block explorer URL for a transaction
 */
export function getExplorerTxUrl(txHash: string, chainId?: number): string {
  const chain = chainId ? getChainById(chainId) : MAIN_CHAIN;
  return `${chain.blockExplorers?.default.url}/tx/${txHash}`;
}
