<template>
  <div class="w-full">
    <label v-if="label" class="block text-sm font-medium text-slate-700 mb-1">
      {{ label }}
      <span v-if="required" class="text-red-600">*</span>
    </label>
    <Listbox :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)">
      <div class="relative">
        <ListboxButton
          class="relative w-full cursor-pointer rounded-lg bg-white py-2 pl-3 pr-10 text-left border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <span class="block truncate text-sm">{{ displayValue }}</span>
          <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronDownIcon class="h-5 w-5 text-slate-400" />
          </span>
        </ListboxButton>

        <transition
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <ListboxOptions
            class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-sm shadow-lg ring-1 ring-black/5 focus:outline-none"
          >
            <ListboxOption
              v-for="option in options"
              :key="option.value"
              v-slot="{ active, selected }"
              :value="option.value"
              as="template"
            >
              <li
                :class="[
                  active ? 'bg-blue-100 text-blue-900' : 'text-slate-900',
                  'relative cursor-pointer select-none py-2 pl-10 pr-4',
                ]"
              >
                <span :class="[selected ? 'font-medium' : 'font-normal', 'block truncate']">
                  {{ option.label }}
                </span>
                <span
                  v-if="selected"
                  class="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600"
                >
                  <CheckIcon class="h-5 w-5" />
                </span>
              </li>
            </ListboxOption>
          </ListboxOptions>
        </transition>
      </div>
    </Listbox>
    <p v-if="error" class="mt-1 text-sm text-red-600">{{ error }}</p>
    <p v-else-if="hint" class="mt-1 text-sm text-slate-500">{{ hint }}</p>
  </div>
</template>

<script lang="ts" setup>
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from "@headlessui/vue";
import { ChevronDownIcon, CheckIcon } from "@heroicons/vue/20/solid";

export interface SelectOption<T = unknown> {
  label: string;
  value: T;
}

interface Props {
  modelValue: unknown;
  options: SelectOption[];
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  placeholder?: string;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: "Select an option",
});

const emit = defineEmits<{
  "update:modelValue": [value: unknown];
}>();

const displayValue = computed(() => {
  const option = props.options.find((opt) => opt.value === props.modelValue);
  return option?.label || props.placeholder;
});
</script>
