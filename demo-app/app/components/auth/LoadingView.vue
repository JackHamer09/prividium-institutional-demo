<template>
  <div class="min-h-screen flex items-center justify-center bg-white px-4">
    <div class="text-center max-w-3xl">
      <!-- Loading state -->
      <template v-if="!error">
        <CommonLoadingSpinner class="mx-auto" />
        <p class="mt-4 text-slate-600">
          {{ loadingMessage }}
        </p>
      </template>

      <!-- Error state -->
      <template v-else>
        <div class="text-red-500 mb-4">
          <svg
            class="w-12 h-12 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <p class="text-slate-900 font-medium mb-2">Failed to load</p>
        <p class="text-sm text-red-600 mb-4 wrap-break-word">
          {{ error }}
        </p>
        <CommonButton
          variant="primary"
          size="md"
          :loading="isRetrying"
          @click="handleRetry"
        >
          Retry
        </CommonButton>

        <button
          class="text-sm text-slate-500 hover:text-slate-700 mt-4 underline block mx-auto"
          @click="handleLogout"
        >
          Logout
        </button>
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
const emit = defineEmits<{
  ready: []
}>();

const prividiumStore = usePrividiumStore();
const { preloadAddressesForChain, isPreloaded } = useTokenAddress();

const loadingMessage = ref("Loading...");
const error = ref<string | null>(null);
const isRetrying = ref(false);

/**
 * Preload token addresses for all authorized chains
 */
async function preloadAllChains() {
  const authorizedChains = prividiumStore.authorizedChainIds;

  if (authorizedChains.length === 0) {
    // No chains to preload, we're ready
    emit("ready");
    return;
  }

  loadingMessage.value = "Loading token addresses...";
  error.value = null;

  try {
    // Preload addresses for all authorized chains in parallel
    await Promise.all(
      authorizedChains.map(async (chainId) => {
        if (!isPreloaded(chainId)) {
          await preloadAddressesForChain(chainId);
        }
      }),
    );

    emit("ready");
  } catch (e) {
    console.error("Failed to preload token addresses:", e);
    error.value = e instanceof Error ? e.message : "Failed to load token data";
  }
}

async function handleRetry() {
  isRetrying.value = true;
  try {
    await preloadAllChains();
  } finally {
    isRetrying.value = false;
  }
}

function handleLogout() {
  prividiumStore.unauthorizeAll();
}

onMounted(() => {
  preloadAllChains();
});
</script>
