import { createPrividiumChain } from "prividium";
import { defineChain } from "viem";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();

  // Define chain from environment variables
  const prividiumChain = defineChain({
    id: Number(config.public.prividiumChainId),
    name: config.public.prividiumChainName,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [] } },
    blockExplorers: {
      default: {
        name: config.public.prividiumBlockExplorerName,
        url: config.public.prividiumBlockExplorerUrl,
      },
    },
  });

  const prividium = createPrividiumChain({
    clientId: config.public.prividiumClientId,
    chain: prividiumChain,
    authBaseUrl: config.public.prividiumAuthBaseUrl,
    prividiumApiBaseUrl: config.public.prividiumApiBaseUrl,
    redirectUrl: `${window.location.origin}/auth/callback`,
    onAuthExpiry: () => {
      // Get store and trigger expiry handling
      const prividiumStore = usePrividiumStore();
      prividiumStore.handleAuthExpiry();
    },
  });

  return {
    provide: {
      prividium: prividium,
    },
  };
});
