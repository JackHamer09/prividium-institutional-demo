import { createPrividiumChain } from "prividium";
import type { PrividiumChain } from "prividium";
import { defineChain } from "viem";

interface ChainEnvConfig {
  id: number;
  name: string;
  clientId: string;
  rpcUrl: string;
  authBaseUrl: string;
  permissionsApiBaseUrl: string;
  blockExplorerUrl: string;
  blockExplorerName: string;
}

function parseChainConfig(config: ReturnType<typeof useRuntimeConfig>, index: number): ChainEnvConfig | null {
  const prefix = `prividiumChain${index}`;
  const id = config.public[`${prefix}Id` as keyof typeof config.public] as string;

  if (!id) {return null;}

  return {
    id: Number(id),
    name: config.public[`${prefix}Name` as keyof typeof config.public] as string,
    clientId: config.public[`${prefix}OauthClientId` as keyof typeof config.public] as string,
    rpcUrl: config.public[`${prefix}RpcUrl` as keyof typeof config.public] as string,
    authBaseUrl: config.public[`${prefix}AuthBaseUrl` as keyof typeof config.public] as string,
    permissionsApiBaseUrl: config.public[`${prefix}PermissionsApiBaseUrl` as keyof typeof config.public] as string,
    blockExplorerUrl: config.public[`${prefix}BlockExplorerUrl` as keyof typeof config.public] as string,
    blockExplorerName: config.public[`${prefix}BlockExplorerName` as keyof typeof config.public] as string,
  };
}

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const mainChainId = Number(config.public.mainChainId);

  // Parse all chain configs (up to 10 chains)
  const chainConfigs: ChainEnvConfig[] = [];
  for (let i = 1; i <= 10; i++) {
    const chainConfig = parseChainConfig(config, i);
    if (chainConfig) {
      chainConfigs.push(chainConfig);
    }
  }

  if (chainConfigs.length === 0) {
    throw new Error("No Prividium chains configured");
  }

  // Create Prividium instances for all chains
  const prividiumChains = new Map<number, PrividiumChain>();

  for (const chainConfig of chainConfigs) {
    const chain = defineChain({
      id: chainConfig.id,
      name: chainConfig.name,
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: [] } },
      blockExplorers: {
        default: {
          name: chainConfig.blockExplorerName,
          url: chainConfig.blockExplorerUrl,
        },
      },
    });

    const prividium = createPrividiumChain({
      clientId: chainConfig.clientId,
      chain,
      rpcUrl: chainConfig.rpcUrl,
      authBaseUrl: chainConfig.authBaseUrl,
      permissionsApiBaseUrl: chainConfig.permissionsApiBaseUrl,
      redirectUrl: `${window.location.origin}/auth/callback?chainId=${chainConfig.id}`,
      onAuthExpiry: () => {
        const prividiumStore = usePrividiumStore();
        prividiumStore.handleAuthExpiry(chainConfig.id);
      },
    });

    prividiumChains.set(chainConfig.id, prividium);
  }

  // Get main chain prividium instance
  const mainPrividium = prividiumChains.get(mainChainId);
  if (!mainPrividium) {
    throw new Error(`Main chain ${mainChainId} not found in configured chains`);
  }

  return {
    provide: {
      prividium: mainPrividium,
      prividiumChains,
      mainChainId,
    },
  };
});
