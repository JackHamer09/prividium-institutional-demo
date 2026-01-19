import type { Hex } from "viem";

export interface TokenConfig {
  assetId: Hex;
  symbol: string;
  name: string;
  decimals: number;
  iconUrl: string;
}

interface RuntimeConfig {
  public: {
    usdcAssetId: string;
    tustAssetId: string;
    sgdAssetId: string;
  };
}

/**
 * Get all supported tokens
 * Asset IDs are loaded from runtime config
 */
export function getTokensConfig(runtimeConfig: RuntimeConfig): TokenConfig[] {
  return [
    {
      assetId: runtimeConfig.public.usdcAssetId as Hex,
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      iconUrl: "tokens/usdc.webp",
    },
    {
      assetId: runtimeConfig.public.tustAssetId as Hex,
      symbol: "TUST",
      name: "Tokenized US Treasuries",
      decimals: 18,
      iconUrl: "tokens/tust.png",
    },
    {
      assetId: runtimeConfig.public.sgdAssetId as Hex,
      symbol: "SGD",
      name: "Singapore Dollar",
      decimals: 18,
      iconUrl: "tokens/sgd.png",
    },
  ];
}

/**
 * Get token by asset ID
 * Note: assetId comparison is case-sensitive (bytes32 values should be consistent)
 */
export function getTokenByAssetId(
  assetId: Hex,
  tokens: TokenConfig[],
): TokenConfig | undefined {
  return tokens.find((token) => token.assetId === assetId);
}

/**
 * Get token by symbol
 */
export function getTokenBySymbol(
  symbol: string,
  tokens: TokenConfig[],
): TokenConfig | undefined {
  return tokens.find((token) => token.symbol === symbol);
}

export const mintAbi = [
  {
    name: "mint",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;
