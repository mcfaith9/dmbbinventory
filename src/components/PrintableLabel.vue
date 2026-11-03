<script setup lang="ts">
import { ref } from 'vue'
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
  showToolbar?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const innerSheetRef = ref<InstanceType<typeof BarcodePrintSheet> | null>(null)

defineExpose({
  handlePrint: (mode?: PrintModeOption) => innerSheetRef.value?.handlePrint(mode),
  renderAllCodes: () => innerSheetRef.value?.renderAllCodes(),
})
</script>

<template>
  <BarcodePrintSheet ref="innerSheetRef" v-bind="$props" @close="emit('close')" />
</template>

<script lang="ts">
export type { PrintableLabelItem, LabelDimensionPreset, PrintModeOption }
</script>
