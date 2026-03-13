import type { Address } from "viem";

export interface TokenConfig {
  address: Address
  symbol: string
  name: string
  decimals: number
  iconUrl: string
}

interface RuntimeConfig {
  public: {
    usdcAddress: string;
    tustAddress: string;
    sgdAddress: string;
  };
}

/**
 * Get all supported tokens
 * Addresses are loaded from runtime config
 */
export function getTokensConfig(runtimeConfig: RuntimeConfig): TokenConfig[] {
  return [
    {
      address: runtimeConfig.public.usdcAddress as Address,
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      iconUrl: "tokens/usdc.webp",
    },
    {
      address: runtimeConfig.public.tustAddress as Address,
      symbol: "TUST",
      name: "Tokenized US Treasuries",
      decimals: 18,
      iconUrl: "tokens/tust.png",
    },
    {
      address: runtimeConfig.public.sgdAddress as Address,
      symbol: "SGD",
      name: "Singapore Dollar",
      decimals: 18,
      iconUrl: "tokens/sgd.png",
    },
  ];
}

/**
 * Get token by address
 */
export function getTokenByAddress(address: Address, tokens: TokenConfig[]): TokenConfig | undefined {
  return tokens.find((token) => token.address.toLowerCase() === address.toLowerCase());
}

/**
 * Get token by symbol
 */
export function getTokenBySymbol(symbol: string, tokens: TokenConfig[]): TokenConfig | undefined {
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