export function useWagmiConfig() {
  const { $wagmiConfig } = useNuxtApp();
  return $wagmiConfig;
}
