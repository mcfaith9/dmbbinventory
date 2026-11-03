<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
import { Printer, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { BarcodeService } from '@/services/barcode.service'
import type { Product } from '@/database/core/database.types'

export interface PrintableLabelItem {
  product: Product
  copies: number
}

const props = withDefaults(
  defineProps<{
    items: PrintableLabelItem[]
    labelSize?: 'compact' | 'standard' | 'large'
    showPrice?: boolean
    showSku?: boolean
    showProductName?: boolean
    visible?: boolean
  }>(),
  {
    labelSize: 'standard',
    showPrice: true,
    showSku: true,
    showProductName: true,
    visible: true,
  }
)

const emit = defineEmits<{
  (e: 'close'): void
}>()

const svgRefs = ref<Record<string, SVGSVGElement | null>>({})

function setSvgRef(key: string, el: any) {
  if (el) {
    svgRefs.value[key] = el
  }
}

function renderAllBarcodes() {
  nextTick(() => {
    props.items.forEach((item, itemIdx) => {
      for (let c = 0; c < item.copies; c++) {
        const key = `barcode-${item.product.id}-${itemIdx}-${c}`
        const el = svgRefs.value[key]
        if (el) {
          BarcodeService.renderBarcode(el, item.product.barcode, item.product.barcodeFormat, {
            width: props.labelSize === 'compact' ? 1.4 : props.labelSize === 'large' ? 2.2 : 1.8,
            height: props.labelSize === 'compact' ? 35 : props.labelSize === 'large' ? 60 : 45,
            fontSize: props.labelSize === 'compact' ? 10 : 12,
            margin: 2,
          })
        }
      }
    })
  })
}

watch(() => [props.items, props.labelSize], () => {
  renderAllBarcodes()
}, { deep: true })

onMounted(() => {
  renderAllBarcodes()
})

function triggerPrint() {
  window.print()
}
</script>

<template>
  <div v-if="visible" class="space-y-4">
    <!-- Controls (Hidden during print) -->
    <div class="no-print flex items-center justify-between border-b pb-3">
      <div class="flex items-center gap-2">
        <Printer class="size-4 text-muted-foreground" />
        <h3 class="text-sm font-semibold">Print Preview</h3>
        <span class="text-xs text-muted-foreground">
          ({{ items.reduce((acc, i) => acc + i.copies, 0) }} total labels)
        </span>
      </div>
      <div class="flex items-center gap-2">
        <Button size="sm" class="h-8 gap-1.5 cursor-pointer" @click="triggerPrint">
          <Printer class="size-3.5" />
          <span>Print Labels</span>
        </Button>
        <Button variant="ghost" size="sm" class="h-8 size-8 p-0" @click="emit('close')">
          <X class="size-4" />
        </Button>
      </div>
    </div>

    <!-- Printable Area (Formatted strictly for black & white labels) -->
    <div id="printable-area" class="bg-white text-black p-2 font-sans">
      <div
        class="grid gap-2"
        :class="{
          'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 print:grid-cols-3': labelSize === 'standard',
          'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 print:grid-cols-4': labelSize === 'compact',
          'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 print:grid-cols-2': labelSize === 'large',
        }"
      >
        <template v-for="(item, itemIdx) in items" :key="item.product.id">
          <div
            v-for="copyIndex in item.copies"
            :key="`${item.product.id}-${itemIdx}-${copyIndex}`"
            class="label-card flex flex-col items-center justify-between border border-dashed border-neutral-300 p-2.5 text-center break-inside-avoid bg-white"
            :class="{
              'min-h-[110px] w-full': labelSize === 'compact',
              'min-h-[140px] w-full': labelSize === 'standard',
              'min-h-[175px] w-full': labelSize === 'large',
            }"
          >
            <!-- Label Header: Product Name -->
            <div v-if="showProductName" class="w-full truncate text-[11px] font-semibold text-neutral-900 tracking-tight leading-tight">
              {{ item.product.name }}
            </div>

            <!-- SKU & Format Info -->
            <div v-if="showSku" class="w-full flex justify-between items-center text-[10px] font-mono text-neutral-600 px-1">
              <span>SKU: {{ item.product.sku }}</span>
              <span class="text-[9px] uppercase text-neutral-400">{{ item.product.barcodeFormat }}</span>
            </div>

            <!-- Barcode SVG Render -->
            <div class="flex justify-center items-center my-1 w-full overflow-hidden">
              <svg :ref="(el) => setSvgRef(`barcode-${item.product.id}-${itemIdx}-${copyIndex - 1}`, el)" class="max-w-full h-auto"></svg>
            </div>

            <!-- Label Footer: Price -->
            <div v-if="showPrice" class="w-full flex justify-between items-center text-[10px] font-semibold text-neutral-900 border-t border-neutral-200 pt-1">
              <span class="text-[9px] text-neutral-500 font-normal">PRICE</span>
              <span class="font-mono text-xs">${{ item.product.sellingPrice.toFixed(2) }}</span>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media print {
  .label-card {
    border: 1px dashed #d4d4d4 !important;
    page-break-inside: avoid;
    break-inside: avoid;
  }
}
</style>
