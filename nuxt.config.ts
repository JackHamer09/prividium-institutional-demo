import tailwindcss from "@tailwindcss/vite";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  ssr: false,
  devtools: { enabled: true },

  app: {
    head: {
      title: "Intraday Repo",
      htmlAttrs: {
        lang: "en",
      },
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        {
          name: "description",
          content:
            "Short-term collateralized lending market for institutional investors",
        },
        { name: "theme-color", content: "#0f172a" },
      ],
      link: [{ rel: "icon", type: "image/svg+xml", href: "/logo.svg" }],
    },
  },
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
      // ZKsync SSO Configuration
      zksyncSsoAuthServerUrl: "",
    },
  },
  vite: {
    plugins: [tailwindcss(), wasm(), topLevelAwait()],
    optimizeDeps: {
      exclude: ["web3-avatar-vue"],
    },
  },
});