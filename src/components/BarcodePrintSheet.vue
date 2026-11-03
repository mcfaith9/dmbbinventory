<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
import { Printer, X, Barcode, QrCode } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { BarcodeService } from '@/services/barcode.service'
import { QRCodeService } from '@/services/qr.service'
import { formatPHP } from '@/lib/currency'
import type { Product } from '@/database/core/database.types'

export interface PrintableLabelItem {
  product: Product
  copies: number
}

const props = withDefaults(
  defineProps<{
    items: PrintableLabelItem[]
    labelSize?: 'compact' | 'standard' | 'large'
    codeType?: 'barcode' | 'qr' | 'both'
    showPrice?: boolean
    showSku?: boolean
    showProductName?: boolean
    visible?: boolean
  }>(),
  {
    labelSize: 'standard',
    codeType: 'barcode',
    showPrice: true,
    showSku: true,
    showProductName: true,
    visible: true,
  }
)

const emit = defineEmits<{
  (e: 'close'): void
}>()

// Active print configurations
const activeCodeType = ref<'barcode' | 'qr' | 'both'>(props.codeType)
const activeLabelSize = ref<'compact' | 'standard' | 'large'>(props.labelSize)
const displayPrice = ref(props.showPrice)
const displaySku = ref(props.showSku)
const displayProductName = ref(props.showProductName)

const svgRefs = ref<Record<string, SVGSVGElement | null>>({})
const canvasRefs = ref<Record<string, HTMLCanvasElement | null>>({})

function setSvgRef(key: string, el: any) {
  if (el) svgRefs.value[key] = el
}

function setCanvasRef(key: string, el: any) {
  if (el) canvasRefs.value[key] = el
}

function renderAllCodes() {
  nextTick(async () => {
    for (let itemIdx = 0; itemIdx < props.items.length; itemIdx++) {
      const item = props.items[itemIdx]!
      for (let c = 0; c < item.copies; c++) {
        const idKey = `${item.product.id}-${itemIdx}-${c}`

        // 1D Barcode
        if (activeCodeType.value === 'barcode' || activeCodeType.value === 'both') {
          const svgEl = svgRefs.value[`barcode-${idKey}`]
          if (svgEl) {
            BarcodeService.renderBarcode(svgEl, item.product.barcode, item.product.barcodeFormat, {
              width: activeLabelSize.value === 'compact' ? 1.2 : activeLabelSize.value === 'large' ? 2.0 : 1.6,
              height: activeLabelSize.value === 'compact' ? 28 : activeLabelSize.value === 'large' ? 45 : 36,
              fontSize: activeLabelSize.value === 'compact' ? 9 : 11,
              margin: 2,
            })
          }
        }

        // 2D QR Code
        if (activeCodeType.value === 'qr' || activeCodeType.value === 'both') {
          const canvasEl = canvasRefs.value[`qr-${idKey}`]
          if (canvasEl) {
            const qrText = QRCodeService.formatProductPayload(item.product)
            const qrWidth = activeLabelSize.value === 'compact' ? 68 : activeLabelSize.value === 'large' ? 110 : 88
            await QRCodeService.renderToCanvas(canvasEl, qrText, {
              width: qrWidth,
              margin: 1,
            })
          }
        }
      }
    }
  })
}

watch(
  () => [props.items, activeCodeType.value, activeLabelSize.value, displayPrice.value, displaySku.value, displayProductName.value],
  () => {
    renderAllCodes()
  },
  { deep: true }
)

onMounted(() => {
  renderAllCodes()
})

function triggerPrint() {
  window.print()
}
</script>

<template>
  <div v-if="visible" class="space-y-4">
    <!-- Configuration Toolbar (Hidden during print) -->
    <div class="no-print space-y-3 border-b pb-3">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div class="flex items-center gap-2">
          <Printer class="size-4 text-primary" />
          <h3 class="text-sm font-semibold">Print Label Sheet Studio</h3>
          <span class="text-xs text-muted-foreground">
            ({{ items.reduce((acc, i) => acc + i.copies, 0) }} total labels)
          </span>
        </div>

        <div class="flex items-center gap-2">
          <Button size="sm" class="h-8 gap-1.5 cursor-pointer bg-primary text-primary-foreground" @click="triggerPrint">
            <Printer class="size-3.5" />
            <span>Print Sheet</span>
          </Button>
          <Button variant="ghost" size="sm" class="h-8 size-8 p-0" @click="emit('close')">
            <X class="size-4" />
          </Button>
        </div>
      </div>

      <!-- Quick Toggles -->
      <div class="flex flex-wrap items-center gap-4 text-xs pt-1">
        <!-- Code Format Type -->
        <div class="flex items-center gap-1.5">
          <span class="text-muted-foreground font-medium">Code Type:</span>
          <div class="inline-flex rounded-md p-0.5 bg-muted">
            <button
              type="button"
              class="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded cursor-pointer transition-colors"
              :class="activeCodeType === 'barcode' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'"
              @click="activeCodeType = 'barcode'"
            >
              <Barcode class="size-3.5" />
              <span>Barcode</span>
            </button>
            <button
              type="button"
              class="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded cursor-pointer transition-colors"
              :class="activeCodeType === 'qr' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'"
              @click="activeCodeType = 'qr'"
            >
              <QrCode class="size-3.5" />
              <span>QR Code</span>
            </button>
            <button
              type="button"
              class="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded cursor-pointer transition-colors"
              :class="activeCodeType === 'both' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'"
              @click="activeCodeType = 'both'"
            >
              <span>Both (1D & 2D)</span>
            </button>
          </div>
        </div>

        <!-- Label Physical Size Presets -->
        <div class="flex items-center gap-1.5">
          <span class="text-muted-foreground font-medium">Label Size:</span>
          <div class="inline-flex rounded-md p-0.5 bg-muted">
            <button
              type="button"
              class="px-2.5 py-1 text-xs font-medium rounded cursor-pointer transition-colors"
              :class="activeLabelSize === 'compact' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'"
              @click="activeLabelSize = 'compact'"
            >
              Compact (40×20mm)
            </button>
            <button
              type="button"
              class="px-2.5 py-1 text-xs font-medium rounded cursor-pointer transition-colors"
              :class="activeLabelSize === 'standard' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'"
              @click="activeLabelSize = 'standard'"
            >
              Standard (50×30mm)
            </button>
            <button
              type="button"
              class="px-2.5 py-1 text-xs font-medium rounded cursor-pointer transition-colors"
              :class="activeLabelSize === 'large' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'"
              @click="activeLabelSize = 'large'"
            >
              Large (70×40mm)
            </button>
          </div>
        </div>

        <!-- Content Checkboxes -->
        <div class="flex items-center gap-3">
          <label class="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
            <input type="checkbox" v-model="displayProductName" class="rounded border-input size-3.5" />
            <span>Title</span>
          </label>
          <label class="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
            <input type="checkbox" v-model="displaySku" class="rounded border-input size-3.5" />
            <span>SKU</span>
          </label>
          <label class="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
            <input type="checkbox" v-model="displayPrice" class="rounded border-input size-3.5" />
            <span>Price (₱)</span>
          </label>
        </div>
      </div>
    </div>

    <!-- Printable Area (Optimized strictly for black & white thermal & laser sheet labels) -->
    <div id="printable-area" class="bg-white text-black p-2 font-sans">
      <div
        class="grid gap-2.5"
        :class="{
          'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 print:grid-cols-3': activeLabelSize === 'standard',
          'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 print:grid-cols-4': activeLabelSize === 'compact',
          'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 print:grid-cols-2': activeLabelSize === 'large',
        }"
      >
        <template v-for="(item, itemIdx) in items" :key="item.product.id">
          <div
            v-for="copyIndex in item.copies"
            :key="`${item.product.id}-${itemIdx}-${copyIndex}`"
            class="label-card flex flex-col items-center justify-between border border-dashed border-neutral-300 p-2 text-center break-inside-avoid bg-white"
            :class="{
              'min-h-[110px] w-full': activeLabelSize === 'compact',
              'min-h-[145px] w-full': activeLabelSize === 'standard',
              'min-h-[185px] w-full': activeLabelSize === 'large',
            }"
          >
            <!-- Label Header: Product Name -->
            <div v-if="displayProductName" class="w-full truncate text-[11px] font-semibold text-neutral-900 tracking-tight leading-tight">
              {{ item.product.name }}
            </div>

            <!-- SKU & Info -->
            <div v-if="displaySku" class="w-full flex justify-between items-center text-[10px] font-mono text-neutral-600 px-1">
              <span>SKU: {{ item.product.sku }}</span>
              <span class="text-[9px] uppercase text-neutral-400">
                {{ activeCodeType === 'qr' ? 'QR 2D' : activeCodeType === 'both' ? '1D + QR' : item.product.barcodeFormat }}
              </span>
            </div>

            <!-- Codes Display Zone -->
            <div class="w-full my-1 flex justify-center items-center overflow-hidden">
              <!-- Mode: Barcode Only -->
              <div v-if="activeCodeType === 'barcode'" class="w-full flex justify-center">
                <svg
                  :ref="(el) => setSvgRef(`barcode-${item.product.id}-${itemIdx}-${copyIndex - 1}`, el)"
                  class="max-w-full h-auto"
                ></svg>
              </div>

              <!-- Mode: QR Code Only -->
              <div v-else-if="activeCodeType === 'qr'" class="flex justify-center">
                <canvas
                  :ref="(el) => setCanvasRef(`qr-${item.product.id}-${itemIdx}-${copyIndex - 1}`, el)"
                  class="max-h-full max-w-full"
                ></canvas>
              </div>

              <!-- Mode: Both Barcode and QR Code -->
              <div v-else class="w-full flex items-center justify-between gap-1 px-1">
                <div class="flex-1 flex justify-center overflow-hidden">
                  <svg
                    :ref="(el) => setSvgRef(`barcode-${item.product.id}-${itemIdx}-${copyIndex - 1}`, el)"
                    class="max-w-full h-auto"
                  ></svg>
                </div>
                <div class="shrink-0 flex justify-center">
                  <canvas
                    :ref="(el) => setCanvasRef(`qr-${item.product.id}-${itemIdx}-${copyIndex - 1}`, el)"
                    class="size-16"
                  ></canvas>
                </div>
              </div>
            </div>

            <!-- Label Footer: Price in Philippine Peso (₱) -->
            <div v-if="displayPrice" class="w-full flex justify-between items-center text-[10px] font-semibold text-neutral-900 border-t border-neutral-200 pt-1">
              <span class="text-[9px] text-neutral-500 font-normal">PRICE</span>
              <span class="font-mono text-xs font-bold text-neutral-950">{{ formatPHP(item.product.sellingPrice) }}</span>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media print {
  body {
    background: #ffffff !important;
    color: #000000 !important;
  }
  .no-print {
    display: none !important;
  }
  .label-card {
    border: 1px dashed #d4d4d4 !important;
    page-break-inside: avoid;
    break-inside: avoid;
  }
}
</style>
