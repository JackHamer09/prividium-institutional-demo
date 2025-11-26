<template>
  <span :class="badgeClasses">
    <slot />
  </span>
</template>

<script lang="ts" setup>
interface Props {
  color?: "blue" | "green" | "red" | "yellow" | "gray"
  size?: "sm" | "md"
}

const props = withDefaults(defineProps<Props>(), {
  color: "gray",
  size: "md",
});

const badgeClasses = computed(() => {
  const classes = ["inline-flex items-center font-medium rounded-full"];

  // Color styles
  if (props.color === "blue") {
    classes.push("bg-blue-100 text-blue-800");
  } else if (props.color === "green") {
    classes.push("bg-green-100 text-green-800");
  } else if (props.color === "red") {
    classes.push("bg-red-100 text-red-800");
  } else if (props.color === "yellow") {
    classes.push("bg-yellow-100 text-yellow-800");
  } else if (props.color === "gray") {
    classes.push("bg-slate-100 text-slate-800");
  }

  // Size styles
  if (props.size === "sm") {
    classes.push("px-2 py-0.5 text-xs");
  } else if (props.size === "md") {
    classes.push("px-2.5 py-1 text-sm");
  }

  return classes.join(" ");
});
</script>
