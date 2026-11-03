<script setup lang="ts">
import BarcodePrintSheet, {
  type PrintableLabelItem,
  type LabelDimensionPreset,
  type PrintModeOption,
} from './BarcodePrintSheet.vue'

defineProps<{
  items: PrintableLabelItem[]
  labelSize?: LabelDimensionPreset
  codeType?: 'barcode' | 'qr' | 'both'
  showPrice?: boolean
  showSku?: boolean
  showProductName?: boolean
  showCompany?: boolean
  companyName?: string
  showAssetTag?: boolean
  visible?: boolean
  initialPrintMode?: PrintModeOption
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()
</script>

<template>
  <BarcodePrintSheet v-bind="$props" @close="emit('close')" />
</template>

<script lang="ts">
export type { PrintableLabelItem, LabelDimensionPreset, PrintModeOption }
</script>
