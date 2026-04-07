import { waitForUserOperationReceipt as waitForTransactionReceiptViem, type WaitForUserOperationReceiptParameters } from "viem/account-abstraction";
import { type Config, getPublicClient } from "@wagmi/core";
import type { PublicClient } from "viem";

export const waitForUserOperationReceipt = async (
  config: Config,
  parameters: WaitForUserOperationReceiptParameters & { chainId: number },
) => {
  const publicClient = getPublicClient(config, { chainId: parameters.chainId });
  return await waitForTransactionReceiptViem(publicClient as PublicClient, parameters);
};
