<template>
  <div class="w-full">
    <label v-if="label" :for="id" class="block text-sm font-medium text-slate-700 mb-1">
      {{ label }}
      <span v-if="required" class="text-red-600">*</span>
    </label>
    <div class="relative">
      <input
        :id="id"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :min="min"
        :max="max"
        :step="step"
        :class="inputClasses"
        @input="handleInput"
        @blur="emit('blur')"
        @focus="emit('focus')"
      />
      <div v-if="suffix" class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
        <span class="text-slate-500 text-sm">{{ suffix }}</span>
      </div>
    </div>
    <p v-if="error" class="mt-1 text-sm text-red-600">{{ error }}</p>
    <p v-else-if="hint" class="mt-1 text-sm text-slate-500">{{ hint }}</p>
  </div>
</template>

<script lang="ts" setup>
interface Props {
  id?: string
  type?: "text" | "number" | "email" | "password"
  modelValue?: string | number
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
  hint?: string
  suffix?: string
  min?: string | number
  max?: string | number
  step?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  type: "text",
  modelValue: "",
});

const emit = defineEmits<{
  "update:modelValue": [value: string | number]
  blur: []
  focus: []
}>();

const inputClasses = computed(() => {
  const classes = [
    "block w-full rounded-lg border px-3 py-2 text-sm",
    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50",
  ];

  if (props.error) {
    classes.push("border-red-300 text-red-900 focus:ring-red-500");
  } else {
    classes.push("border-slate-300 text-slate-900");
  }

  if (props.suffix) {
    classes.push("pr-12");
  }

  return classes.join(" ");
});

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement;
  const value = props.type === "number" ? parseFloat(target.value) || 0 : target.value;
  emit("update:modelValue", value);
}
</script>
