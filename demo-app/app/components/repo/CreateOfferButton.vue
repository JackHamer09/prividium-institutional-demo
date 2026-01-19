<template>
  <div>
    <CommonButton variant="primary" :size="size" @click="isModalOpen = true">
      Create Offer
    </CommonButton>

    <RepoCreateOfferModal
      :open="isModalOpen"
      @close="isModalOpen = false"
      @success="handleSuccess"
    />
  </div>
</template>

<script lang="ts" setup>
withDefaults(
  defineProps<{
    size?: "sm" | "md" | "lg"
  }>(),
  {
    size: "md",
  },
);

const isModalOpen = ref(false);

const emit = defineEmits<{
  success: []
}>();

function handleSuccess() {
  emit("success");
}
</script>
