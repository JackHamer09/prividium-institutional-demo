<template>
  <div :class="containerClasses">
    <div :class="spinnerClasses"/>
    <p v-if="message" class="mt-2 text-sm text-slate-600">{{ message }}</p>
  </div>
</template>

<script lang="ts" setup>
interface Props {
  size?: "sm" | "md" | "lg"
  message?: string
  centered?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: "md",
  centered: false,
});

const containerClasses = computed(() => {
  const classes = ["flex flex-col items-center"];
  if (props.centered) {
    classes.push("justify-center min-h-[200px]");
  }
  return classes.join(" ");
});

const spinnerClasses = computed(() => {
  const classes = [
    "animate-spin rounded-full border-2 border-slate-300 border-t-blue-600",
  ];

  if (props.size === "sm") {
    classes.push("h-4 w-4");
  } else if (props.size === "md") {
    classes.push("h-8 w-8");
  } else if (props.size === "lg") {
    classes.push("h-12 w-12");
  }

  return classes.join(" ");
});
</script>
