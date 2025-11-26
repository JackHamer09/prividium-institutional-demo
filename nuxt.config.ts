import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  ssr: false,
  devtools: { enabled: true },
  css: [
    "./app/assets/css/main.css",
    "web3-avatar-vue/dist/style.css",
    "vue-toastification/dist/index.css",
  ],
  modules: [
    "@nuxt/eslint",
    "@nuxt/fonts",
    "@pinia/nuxt",
    "@vueuse/nuxt",
  ],
  build: {
    transpile: ["web3-avatar-vue", "vue-toastification"],
  },
  fonts: {
    families: [
      { name: "Inter", provider: "google" },
      { name: "Onest", provider: "google" },
    ],
    defaults: {
      weights: [400, 500, 600, 700],
    },
  },
  runtimeConfig: {
    public: {
      intradayRepoContractAddress: "",
      usdcAddress: "",
      ttbillAddress: "",
      sgdAddress: "",
      // Prividium Configuration
      prividiumClientId: "",
      prividiumRpcUrl: "",
      prividiumAuthBaseUrl: "",
      prividiumPermissionsApiBaseUrl: "",
      // Prividium Chain Configuration
      prividiumChainId: "",
      prividiumChainName: "",
      prividiumBlockExplorerUrl: "",
      prividiumBlockExplorerName: "",
    },
  },
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ["web3-avatar-vue"],
    },
  },
});