<template>
  <div class="min-h-screen flex items-center justify-center bg-white">
    <div class="text-center">
      <CommonLoadingSpinner v-if="!error" class="mx-auto" />
      <p class="mt-4 text-slate-600">
        {{ error ? 'Authentication failed' : 'Completing authentication...' }}
      </p>
      <p v-if="error" class="mt-2 text-sm text-red-600">
        {{ error }}
      </p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { handleAuthCallback } from "prividium";

definePageMeta({
  layout: false,
});

const error = ref<string | null>(null);
const route = useRoute();

onMounted(() => {
  // Get chainId from query params if present
  const chainIdParam = route.query.chainId;
  const chainId = chainIdParam ? Number(chainIdParam) : undefined;

  // Log for debugging
  if (chainId) {
    console.log(`Processing auth callback for chain ${chainId}`);
  }

  // handleAuthCallback will automatically find the correct Prividium instance
  // based on the state parameter in the callback URL
  handleAuthCallback((err) => {
    error.value = err;
    if (err) {
      console.error("Auth callback error:", err);
    }
  });
});
</script>
