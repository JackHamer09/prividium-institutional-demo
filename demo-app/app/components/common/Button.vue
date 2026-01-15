<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="buttonClasses"
    @click="handleClick"
  >
    <span v-if="loading" class="animate-spin mr-2">⏳</span>
    <slot />
  </button>
</template>

<script lang="ts" setup>
interface Props {
  variant?: "primary" | "secondary" | "danger" | "ghost"
  size?: "sm" | "md" | "lg"
  type?: "button" | "submit" | "reset"
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: "primary",
  size: "md",
  type: "button",
  disabled: false,
  loading: false,
  fullWidth: false,
});

const emit = defineEmits<{
  click: [event: MouseEvent]
}>();

const buttonClasses = computed(() => {
  const classes = [
    "inline-flex items-center justify-center font-medium transition-colors",
    "focus:outline-none focus:ring-2 focus:ring-offset-2",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    "cursor-pointer",
    "rounded-lg",
  ];

  // Variant styles
  if (props.variant === "primary") {
    classes.push("bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500");
  } else if (props.variant === "secondary") {
    classes.push("bg-slate-200 text-slate-900 hover:bg-slate-300 focus:ring-slate-500");
  } else if (props.variant === "danger") {
    classes.push("bg-red-700 text-white hover:bg-red-800 focus:ring-rose-600");
  } else if (props.variant === "ghost") {
    classes.push("bg-transparent text-slate-700 hover:bg-slate-100 focus:ring-slate-500");
  }

  // Size styles
  if (props.size === "sm") {
    classes.push("px-3 py-1.5 text-sm");
  } else if (props.size === "md") {
    classes.push("px-4 py-2 text-base");
  } else if (props.size === "lg") {
    classes.push("px-6 py-3 text-lg");
  }

  // Full width
  if (props.fullWidth) {
    classes.push("w-full");
  }

  return classes.join(" ");
});

function handleClick(event: MouseEvent) {
  if (!props.disabled && !props.loading) {
    emit("click", event);
  }
}
</script>
