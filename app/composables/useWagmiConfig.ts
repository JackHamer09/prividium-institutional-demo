/**
 * Access the Wagmi configuration
 */
export function useWagmiConfig() {
  const { $wagmiConfig } = useNuxtApp();
  return $wagmiConfig;
}
