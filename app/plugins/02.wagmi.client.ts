import { createConfig, injected, reconnect } from "@wagmi/core";
import { callPolicy, zksyncSsoConnector } from "zksync-sso/connector";
import type { PrividiumChain } from "prividium";

import { INTRADAY_REPO_ABI } from "@/contracts/intraday-repo";
import { getTokensConfig, mintAbi } from "@/config/tokens";
import { type Address, erc20Abi, parseEther } from "viem";

export default defineNuxtPlugin(async (nuxtApp) => {
  // Get Prividium instance from earlier plugin
  const prividium = nuxtApp.$prividium as PrividiumChain;
  const runtimeConfig = useRuntimeConfig();

  const tokens = getTokensConfig(runtimeConfig);
  const repoAddress = runtimeConfig.public.intradayRepoContractAddress as Address;

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
    session: {
      feeLimit: parseEther("0.1"),
      contractCalls: [
        ...(["createOffer", "acceptOffer", "cancelOffer", "repayLoan", "claimCollateral"] as const).map((functionName) =>
          callPolicy({
            address: repoAddress,
            abi: INTRADAY_REPO_ABI,
            functionName,
          }),
        ),
        ...(["mint", "approve"] as const).map((functionName) =>
          tokens.map((token) =>
            callPolicy({
              address: token.address,
              abi: [
                ...erc20Abi,
                ...mintAbi,
              ],
              functionName,
            }),
          ),
        ).flat(),
      ],
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
