import { z } from "zod";

/**
 * Ethereum address validation schema
 */
const ethereumAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address");

/**
 * Environment configuration schema
 */
export const envSchema = z.object({
  // Contract Addresses
  intradayRepoContractAddress: ethereumAddressSchema,

  // Token Addresses
  usdcAddress: ethereumAddressSchema,
  tustAddress: ethereumAddressSchema,
  sgdAddress: ethereumAddressSchema,
});

export type EnvConfig = z.infer<typeof envSchema>;

interface RuntimeConfig {
  public: {
    intradayRepoContractAddress: string;
    usdcAddress: string;
    tustAddress: string;
    sgdAddress: string;
  };
}

/**
 * Validates and returns the environment configuration from Nuxt runtime config
 */
export function validateEnvConfig(config: RuntimeConfig): EnvConfig {
  try {
    return envSchema.parse({
      intradayRepoContractAddress: config.public.intradayRepoContractAddress,
      usdcAddress: config.public.usdcAddress,
      tustAddress: config.public.tustAddress,
      sgdAddress: config.public.sgdAddress,
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues
        .map((err: z.ZodIssue) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      throw new Error(`Environment configuration validation failed: ${errorMessages}`);
    }
    throw error;
  }
}
