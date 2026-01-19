import type { Chain } from "viem";
import { defineChain } from "viem";
import type { PrividiumChain } from "prividium";

/**
 * Get L1 chain configuration from environment variables
 * Uses defineChain() with ETH as native currency
 */
export function getL1Chain(): Chain {
  const runtimeConfig = useRuntimeConfig();

  return defineChain({
    id: Number(runtimeConfig.public.l1ChainId),
    name: String(runtimeConfig.public.l1ChainName),
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: [String(runtimeConfig.public.l1RpcUrl)],
      },
    },
    blockExplorers: {
      default: {
        name: String(runtimeConfig.public.l1BlockExplorerName),
        url: String(runtimeConfig.public.l1BlockExplorerUrl),
      },
    },
  });
}

/**
 * Chain configuration interface
 */
export interface ChainConfig {
  id: number;
  name: string;
  prividium: PrividiumChain;
  chain: Chain;
  isMainChain: boolean;
}

/**
 * Get all configured chains from Nuxt app
 * Must be called after plugins are initialized
 */
export function getAllChains(): ChainConfig[] {
  const { $prividiumChains, $mainChainId } = useNuxtApp();
  const chains = $prividiumChains as Map<number, PrividiumChain>;
  const mainChainId = $mainChainId as number;

  return Array.from(chains.entries()).map(([chainId, prividium]) => ({
    id: chainId,
    name: prividium.chain.name,
    prividium,
    chain: prividium.chain,
    isMainChain: chainId === mainChainId,
  }));
}

/**
 * Get the main chain (where RepoContract is deployed)
 */
export function getMainChain(): ChainConfig {
  const chains = getAllChains();
  const mainChain = chains.find((c) => c.isMainChain);
  if (!mainChain) {throw new Error("Main chain not configured");}
  return mainChain;
}

/**
 * Get main chain ID
 */
export function getMainChainId(): number {
  const { $mainChainId } = useNuxtApp();
  return $mainChainId as number;
}

/**
 * Get chain configuration by ID
 */
export function getChainById(chainId: number): ChainConfig {
  const chains = getAllChains();
  const chain = chains.find((c) => c.id === chainId);
  if (!chain) {throw new Error(`Chain ${chainId} not configured`);}
  return chain;
}

/**
 * Get chain name by ID (returns undefined if not found)
 */
export function getChainName(chainId: number): string | undefined {
  try {
    return getChainById(chainId).name;
  } catch {
    return undefined;
  }
}

/**
 * Get Prividium instance for a specific chain
 */
export function getPrividiumForChain(chainId: number): PrividiumChain {
  return getChainById(chainId).prividium;
}

/**
 * Get block explorer URL for an address
 */
export function getExplorerUrl(address: string, chainId?: number): string {
  const chain = chainId ? getChainById(chainId) : getMainChain();
  return `${chain.chain.blockExplorers?.default.url}/address/${address}`;
}

/**
 * Get block explorer URL for a transaction
 */
export function getExplorerTxUrl(txHash: string, chainId?: number): string {
  const chain = chainId ? getChainById(chainId) : getMainChain();
  return `${chain.chain.blockExplorers?.default.url}/tx/${txHash}`;
}
