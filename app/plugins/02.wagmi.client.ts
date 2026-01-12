import { createConfig, injected, reconnect } from "@wagmi/core";
import { zksyncSsoConnector } from "zksync-sso/connector";
import type { PrividiumChain } from "prividium";

export default defineNuxtPlugin(async (nuxtApp) => {
  // Get Prividium instance from earlier plugin
  const prividium = nuxtApp.$prividium as PrividiumChain;
  const runtimeConfig = useRuntimeConfig();

  // Create SSO connector with auth server URL from environment
  const authServerUrl = runtimeConfig.public.zksyncSsoAuthServerUrl as string | undefined;
  const ssoConnector = zksyncSsoConnector({
    authServerUrl: authServerUrl || undefined,
    connectorMetadata: {
      id: "zksync-sso",
      name: "ZKsync SSO",
      icon: "https://zksync.io/favicon.ico",
      type: "zksync-sso",
    },
  });

  // Create Wagmi config with both injected and SSO connectors
  const config = createConfig({
    chains: [prividium.chain],
    connectors: [injected(), ssoConnector],
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
