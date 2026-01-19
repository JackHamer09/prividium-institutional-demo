<template>
  <div class="overflow-x-auto bg-white rounded-lg border border-slate-200">
    <table class="min-w-full divide-y divide-slate-200">
      <thead class="bg-slate-50">
        <tr>
          <th scope="col" class="py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
            ID
          </th>
          <th scope="col" class="py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
            Lender
          </th>
          <th scope="col" class="py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
            Borrower
          </th>
          <th scope="col" class="py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
            Lending
          </th>
          <th scope="col" class="py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
            Collateral
          </th>
          <th scope="col" class="py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
            Duration
          </th>
          <th scope="col" class="py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
            Fee
          </th>
          <th scope="col" class="py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
            Status
          </th>
          <th scope="col" class="py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
            Actions
          </th>
        </tr>
      </thead>
      <tbody class="bg-white divide-y divide-slate-200">
        <RepoOfferRow
          v-for="offer in offers"
          :key="offer.offerId.toString()"
          :offer="offer"
          :user-address="userAddress"
          :grace-period-seconds="gracePeriodSeconds"
          :processing-offers="processingOffers"
          @accept="$emit('accept', $event)"
          @cancel="$emit('cancel', $event)"
          @repay="$emit('repay', $event)"
          @claim="$emit('claim', $event)"
        />
      </tbody>
    </table>
  </div>
</template>

<script lang="ts" setup>
import type { Address } from "viem";
import type { RepoOffer } from "~/contracts/intraday-repo";

interface Props {
  offers: RepoOffer[]
  userAddress?: Address
  gracePeriodSeconds: number
  processingOffers: Set<string>
}

defineProps<Props>();

defineEmits<{
  accept: [offerId: bigint]
  cancel: [offerId: bigint]
  repay: [offerId: bigint]
  claim: [offerId: bigint]
}>();
</script>
