import { createConfig, http, injected, reconnect } from "@wagmi/core";
import { MAIN_CHAIN } from "../config/chains";

export default defineNuxtPlugin(async () => {
  // Create Wagmi config with main chain and injected connector
  const config = createConfig({
    chains: [MAIN_CHAIN],
    connectors: [injected()],
    transports: {
      [MAIN_CHAIN.id]: http(),
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
