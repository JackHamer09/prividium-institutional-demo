import { createConfig, injected, reconnect } from "@wagmi/core";
import { callPolicy, zksyncSsoConnector } from "zksync-sso/connector";
import type { PrividiumChain } from "prividium";
import { http, type Address, type Chain, /* erc20Abi, */ parseEther, type Transport } from "viem";
import { INTRADAY_REPO_ABI } from "../contracts/intraday-repo";
import { getL1Chain } from "~/config/chains";
/* import { mintAbi } from "../config/tokens"; */

export default defineNuxtPlugin(async (nuxtApp) => {
  // Get all Prividium instances from earlier plugin
  const prividiumChains = nuxtApp.$prividiumChains as Map<number, PrividiumChain>;
  const runtimeConfig = useRuntimeConfig();

  // Collect all chains and transports
  const chains: [Chain, ...Chain[]] = [] as unknown as [Chain, ...Chain[]];
  const transports: Record<number, Transport> = {};

  for (const [chainId, prividium] of prividiumChains) {
    chains.push(prividium.chain);
    transports[chainId] = prividium.transport;
  }

  if (chains.length === 0) {
    throw new Error("No chains configured for wagmi");
  }

  // Add L1 chain with HTTP transport for balance fetching
  const l1Chain = getL1Chain();
  chains.push(l1Chain);
  transports[l1Chain.id] = http(l1Chain.rpcUrls.default.http[0]);

  // Get repo contract address for session policies
  const repoAddress = runtimeConfig.public.intradayRepoContractAddress as Address;

  // Create SSO connector with auth server URL from environment
  const authServerUrl = runtimeConfig.public.zksyncSsoAuthServerUrl as string | undefined;
  const ssoConnector = zksyncSsoConnector({
    authServerUrl: authServerUrl || undefined,
    session: {
      feeLimit: parseEther("0.1"),
      contractCalls: [
        // Repo contract calls
        ...(["createOffer", "acceptOffer", "cancelOffer", "repayLoan", "claimCollateral"] as const).map((functionName) =>
          callPolicy({
            address: repoAddress,
            abi: INTRADAY_REPO_ABI,
            functionName,
          }),
        ),
        // Allow any ERC20 approve/mint (token addresses resolved dynamically in multichain)
        // callPolicy({
        //   abi: [...erc20Abi, ...mintAbi],
        //   functionName: "approve",
        // }),
        // callPolicy({
        //   abi: [...erc20Abi, ...mintAbi],
        //   functionName: "mint",
        // }),
      ],
    },
  });

  // Create Wagmi config with all chains and SSO connector
  const config = createConfig({
    chains,
    connectors: [injected(), ssoConnector],
    transports,
  });

  // Reconnect to previously connected wallet immediately
  await reconnect(config);

  return {
    provide: {
      wagmiConfig: config,
    },
  };
});
