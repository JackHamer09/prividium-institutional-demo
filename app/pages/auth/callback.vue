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

onMounted(() => {
  handleAuthCallback((err) => {
    error.value = err;
  });
});
</script>
