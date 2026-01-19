<template>
  <CommonModal :open="open" title="Create Lending Offer" @close="handleClose">
    <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">
            Lending Amount
            <span class="text-red-600">*</span>
          </label>
          <div class="flex gap-2">
            <div class="flex-1">
              <CommonInput
                v-model="form.lendAmount"
                type="number"
                placeholder="0.0"
                required
                :min="0"
                step="any"
              />
            </div>
            <div class="w-40">
              <CommonSelect
                v-model="form.lendToken"
                :options="tokenOptions"
                required
              />
            </div>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">
            Collateral Amount
            <span class="text-red-600">*</span>
          </label>
          <div class="flex gap-2">
            <div class="flex-1">
              <CommonInput
                v-model="form.collateralAmount"
                type="number"
                placeholder="0.0"
                required
                :min="0"
                step="any"
              />
            </div>
            <div class="w-40">
              <CommonSelect
                v-model="form.collateralToken"
                :options="tokenOptions"
                required
              />
            </div>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">
            Duration
            <span class="text-red-600">*</span>
          </label>
          <div class="flex gap-2">
            <div class="flex-1">
              <CommonInput
                v-model="form.durationValue"
                type="number"
                placeholder="0"
                required
                :min="1"
                step="1"
              />
            </div>
            <div class="w-32">
              <CommonSelect
                v-model="form.durationUnit"
                :options="durationUnitOptions"
                required
              />
            </div>
          </div>
        </div>

        <CommonInput
          v-model="form.lenderFee"
          type="number"
          label="Lender Fee (bps)"
          placeholder="0"
          required
          :min="0"
          :max="10000"
          hint="1 bps = 0.01%, max 10000 bps (100%)"
        />

        <div v-if="feeAmount" class="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <p class="text-sm text-slate-700">
            <span class="font-medium">Fee Amount:</span>
            {{ formatTokenAmount(feeAmount, selectedLendToken?.decimals || 18) }}
            {{ selectedLendToken?.symbol }}
          </p>
          <p class="text-sm text-slate-700 mt-1">
            <span class="font-medium">Total Repayment:</span>
            {{ formatTokenAmount(totalRepayment, selectedLendToken?.decimals || 18) }}
            {{ selectedLendToken?.symbol }}
          </p>
        </div>
      </div>

    <template #footer>
      <CommonButton variant="ghost" @click="handleClose">
        Cancel
      </CommonButton>
      <CommonButton
        variant="primary"
        :loading="isSubmitting"
        :disabled="!isFormValid"
        @click="handleSubmit"
      >
        Create Offer
      </CommonButton>
    </template>
  </CommonModal>
</template>

<script lang="ts" setup>
import type { Hex } from "viem";
import { parseUnits } from "viem";
import { DURATION_UNITS, convertDurationToSeconds, calculateFeeAmount, type DurationUnit } from "~/config/repo";
import type { TokenConfig } from "~/config/tokens";

interface Props {
  open: boolean
}

defineProps<Props>();

const emit = defineEmits<{
  close: []
  success: []
}>();

const { tokens, refresh: refreshBalances } = useBalances();
const { createOffer } = useRepoContract();
const walletStore = useWalletStore();
const toast = useToast();

// Get default tokens
const defaultLendToken = tokens.find((t) => t.symbol === "USDC");
const defaultCollateralToken = tokens.find((t) => t.symbol === "TTBILL");

const form = reactive({
  lendToken: (defaultLendToken?.assetId || "") as Hex | "",
  lendAmount: undefined as number | undefined,
  collateralToken: (defaultCollateralToken?.assetId || "") as Hex | "",
  collateralAmount: undefined as number | undefined,
  durationValue: undefined as number | undefined,
  durationUnit: "hours" as DurationUnit,
  lenderFee: undefined as number | undefined,
});

const isSubmitting = ref(false);

const tokenOptions = computed(() => {
  return tokens.map((token) => ({
    label: token.symbol,
    value: token.assetId,
  }));
});

const durationUnitOptions = computed(() => {
  return DURATION_UNITS.map((unit) => ({
    label: unit.label,
    value: unit.value,
  }));
});

const selectedLendToken = computed((): TokenConfig | undefined => {
  return tokens.find((t) => t.assetId === form.lendToken);
});

const lendAmountBigInt = computed((): bigint => {
  if (!selectedLendToken.value || !form.lendAmount) return BigInt(0);
  try {
    return parseUnits(form.lendAmount.toString(), selectedLendToken.value.decimals);
  } catch {
    return BigInt(0);
  }
});

const feeAmount = computed((): bigint => {
  if (!lendAmountBigInt.value || !form.lenderFee) return BigInt(0);
  return calculateFeeAmount(
    lendAmountBigInt.value,
    form.lenderFee,
  );
});

const totalRepayment = computed((): bigint => {
  return lendAmountBigInt.value + feeAmount.value;
});

const isFormValid = computed(() => {
  return (
    form.lendToken &&
    form.lendAmount !== undefined &&
    form.lendAmount > 0 &&
    form.collateralToken &&
    form.collateralAmount !== undefined &&
    form.collateralAmount > 0 &&
    form.durationValue !== undefined &&
    form.durationValue > 0 &&
    form.durationUnit &&
    form.lenderFee !== undefined &&
    form.lenderFee >= 0 &&
    form.lenderFee <= 10000
  );
});

function resetForm() {
  // Reset numeric values but keep default tokens selected
  form.lendAmount = undefined;
  form.collateralAmount = undefined;
  form.durationValue = undefined;
  form.lenderFee = undefined;

  // Keep default tokens
  form.lendToken = (defaultLendToken?.assetId || "") as Hex | "";
  form.collateralToken = (defaultCollateralToken?.assetId || "") as Hex | "";
  form.durationUnit = "hours";
}

function handleClose() {
  emit("close");
}

async function handleSubmit() {
  if (!isFormValid.value || !walletStore.address) return;

  const selectedCollateralToken = tokens.find((t) => t.assetId === form.collateralToken);
  if (!selectedLendToken.value || !selectedCollateralToken) {
    toast.error("Invalid token selection");
    return;
  }

  isSubmitting.value = true;

  try {
    // Parse amounts (validated by isFormValid)
    const lendAmount = parseUnits(form.lendAmount!.toString(), selectedLendToken.value.decimals);
    const collateralAmount = parseUnits(
      form.collateralAmount!.toString(),
      selectedCollateralToken.decimals,
    );

    // Convert duration to seconds (validated by isFormValid)
    const durationInSeconds = convertDurationToSeconds(form.durationValue!, form.durationUnit);

    // Create offer - approval is handled internally for both same-chain and cross-chain
    const result = await createOffer({
      lendAssetId: form.lendToken as Hex,
      lendAmount,
      collateralAssetId: form.collateralToken as Hex,
      collateralAmount,
      duration: BigInt(durationInSeconds),
      lenderFee: BigInt(form.lenderFee!),
    });

    if (result !== null) {
      await refreshBalances();
      resetForm();
      emit("success");
      emit("close");
    }
  } catch (error) {
    console.error("Failed to create offer:", error);
    toast.error("Failed to create offer");
  } finally {
    isSubmitting.value = false;
  }
}
</script>
