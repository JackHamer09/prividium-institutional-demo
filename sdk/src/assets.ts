import { ethers } from 'ethers';
import { NativeTokenVaultAbi } from './abis';
import { L2_NATIVE_TOKEN_VAULT_ADDRESS } from './constants';
import { computeAssetId } from './address';

/**
 * Get the asset ID for a token on a specific chain
 * @param provider - The provider for the chain where the token exists
 * @param tokenAddress - The token address
 * @returns The asset ID (bytes32)
 */
export async function getAssetId(
  provider: ethers.Provider,
  tokenAddress: string
): Promise<string> {
  const ntvContract = new ethers.Contract(
    L2_NATIVE_TOKEN_VAULT_ADDRESS,
    NativeTokenVaultAbi,
    provider
  );

  return await ntvContract.assetId(tokenAddress);
}

/**
 * Get the token address for an asset ID on a specific chain
 * @param provider - The provider for the chain where to look up the token
 * @param assetId - The asset ID (bytes32)
 * @returns The token address (zero address if not registered)
 */
export async function getTokenAddress(
  provider: ethers.Provider,
  assetId: string
): Promise<string> {
  const ntvContract = new ethers.Contract(
    L2_NATIVE_TOKEN_VAULT_ADDRESS,
    NativeTokenVaultAbi,
    provider
  );

  return await ntvContract.tokenAddress(assetId);
}

/**
 * Compute the asset ID for a native token using the Native Token Vault
 * This is useful when the token hasn't been queried from the chain yet
 * @param originChainId - The chain ID where the token originates
 * @param tokenAddress - The token address on the origin chain
 * @returns The computed asset ID
 */
export function computeNativeTokenAssetId(
  originChainId: bigint | number,
  tokenAddress: string
): string {
  return computeAssetId(originChainId, L2_NATIVE_TOKEN_VAULT_ADDRESS, tokenAddress);
}

/**
 * Get the bridged token address on a destination chain
 * For tokens bridged via the Native Token Vault, this computes the expected
 * asset ID and looks up the corresponding token address on the destination chain.
 * @param originChainId - The chain ID where the token originates
 * @param originTokenAddress - The token address on the origin chain
 * @param destProvider - The provider for the destination chain
 * @returns The token address on the destination chain (zero address if not yet deployed)
 */
export async function getBridgedTokenAddress(
  originChainId: bigint | number,
  originTokenAddress: string,
  destProvider: ethers.Provider
): Promise<string> {
  const assetId = computeNativeTokenAssetId(originChainId, originTokenAddress);
  return getTokenAddress(destProvider, assetId);
}
