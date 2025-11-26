import { createConfig, injected, reconnect } from "@wagmi/core";
import type { PrividiumChain } from "prividium";

export default defineNuxtPlugin(async (nuxtApp) => {
  // Get Prividium instance from earlier plugin
  const prividium = nuxtApp.$prividium as PrividiumChain;

  // Create Wagmi config using Prividium chain and transport
  const config = createConfig({
    chains: [prividium.chain],
    connectors: [injected()],
    transports: {
      [prividium.chain.id]: prividium.transport,
    },
  });

  // Reconnect to previously connected wallet immediately
  await reconnect(config);

  return {
    provide: {
      wagmiConfig: config,
    },
  };
});
