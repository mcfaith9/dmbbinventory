<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
import { Printer, X, Barcode, QrCode, Building2, CheckSquare } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { BarcodeService } from '@/services/barcode.service'
import { QRCodeService } from '@/services/qr.service'
import { PrintService } from '@/services/print.service'
import { formatPHP } from '@/lib/currency'
import type { Product } from '@/database/core/database.types'

export interface PrintableLabelItem {
  product: Product
  copies: number
}

export type LabelDimensionPreset = 'standard' | 'compact' | 'large' | 'a4-grid' | 'thermal'

const props = withDefaults(
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
  }>(),
  {
    labelSize: 'standard',
    codeType: 'barcode',
    showPrice: true,
    showSku: true,
    showProductName: true,
    showCompany: true,
    companyName: 'DMBB INVENTORY',
    showAssetTag: true,
    visible: true,
  }
)

const emit = defineEmits<{
  (e: 'close'): void
}>()

// Active print configurations
const activeCodeType = ref<'barcode' | 'qr' | 'both'>(props.codeType)
const activeLabelSize = ref<LabelDimensionPreset>(props.labelSize)
const displayPrice = ref(props.showPrice)
const displaySku = ref(props.showSku)
const displayProductName = ref(props.showProductName)
const displayCompany = ref(props.showCompany)
const activeCompanyName = ref(props.companyName)
const displayAssetTag = ref(props.showAssetTag)

const isPrinting = ref(false)
const printableAreaRef = ref<HTMLElement | null>(null)

const svgRefs = ref<Record<string, SVGSVGElement | null>>({})
const canvasRefs = ref<Record<string, HTMLCanvasElement | null>>({})

function setSvgRef(key: string, el: any) {
  if (el) svgRefs.value[key] = el
}

function setCanvasRef(key: string, el: any) {
  if (el) canvasRefs.value[key] = el
}

async function renderAllCodes() {
  await nextTick()
  for (let itemIdx = 0; itemIdx < props.items.length; itemIdx++) {
    const item = props.items[itemIdx]!
    for (let c = 0; c < item.copies; c++) {
      const idKey = `${item.product.id}-${itemIdx}-${c}`

      // 1. 1D Barcode (Code128 / EAN13)
      if (activeCodeType.value === 'barcode' || activeCodeType.value === 'both') {
        const svgEl = svgRefs.value[`barcode-${idKey}`]
        if (svgEl) {
          const isCompact = activeLabelSize.value === 'compact'
          const isLarge = activeLabelSize.value === 'large'
          const isBoth = activeCodeType.value === 'both'

          BarcodeService.renderBarcode(svgEl, item.product.barcode || item.product.sku, item.product.barcodeFormat || 'CODE128', {
            width: isCompact ? 1.3 : isBoth ? 1.4 : isLarge ? 2.0 : 1.7,
            height: isCompact ? 26 : isBoth ? 30 : isLarge ? 48 : 38,
            fontSize: isCompact ? 9 : 11,
            margin: 2,
            displayValue: true,
          })
        }
      }

      // 2. 2D QR Code
      if (activeCodeType.value === 'qr' || activeCodeType.value === 'both') {
        const canvasEl = canvasRefs.value[`qr-${idKey}`]
        if (canvasEl) {
          const qrText = QRCodeService.formatProductPayload(item.product)
          const qrWidth =
            activeLabelSize.value === 'compact'
              ? 64
              : activeCodeType.value === 'both'
                ? 70
                : activeLabelSize.value === 'large'
                  ? 110
                  : 84

          await QRCodeService.renderToCanvas(canvasEl, qrText, {
            width: qrWidth,
            margin: 1,
            errorCorrectionLevel: 'M',
          })
        }
      }
    }
  }
}

watch(
  () => [
    props.items,
    activeCodeType.value,
    activeLabelSize.value,
    displayPrice.value,
    displaySku.value,
    displayProductName.value,
    displayCompany.value,
    activeCompanyName.value,
    displayAssetTag.value,
  ],
  () => {
    renderAllCodes()
  },
  { deep: true }
)

onMounted(() => {
  renderAllCodes()
})

async function handlePrint() {
  if (!printableAreaRef.value) return
  isPrinting.value = true

  try {
    // 1. Ensure all SVG barcodes and QR canvases are rendered
    await renderAllCodes()

    // 2. Small settle wait for canvas buffer
    await new Promise((r) => setTimeout(r, 60))

    // 3. Delegate to enterprise PrintService (clones into root portal, converts canvas to PNG <img>)
    await PrintService.printElement(printableAreaRef.value, {
      pageTitle: `Inventory_Labels_${activeLabelSize.value}`,
    })
  } catch (err) {
    console.error('Failed to execute label print:', err)
  } finally {
    isPrinting.value = false
  }
}
</script>

<template>
  <div v-if="visible" class="space-y-4">
    <!-- Configuration Toolbar (Hidden during print) -->
    <div class="no-print space-y-3 rounded-lg border border-border bg-card p-4 shadow-xs">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-3">
        <div class="flex items-center gap-2">
          <Printer class="size-4 text-primary" />
          <h3 class="text-sm font-semibold">Inventory Label Print Studio</h3>
          <span class="text-xs text-muted-foreground font-mono">
            ({{ items.reduce((acc, i) => acc + i.copies, 0) }} label{{ items.reduce((acc, i) => acc + i.copies, 0) > 1 ? 's' : '' }})
          </span>
        </div>

        <div class="flex items-center gap-2">
          <Button
            size="sm"
            class="h-8 gap-1.5 cursor-pointer bg-primary text-primary-foreground font-semibold"
            :disabled="isPrinting || items.length === 0"
            @click="handlePrint"
          >
            <Printer class="size-3.5" />
            <span>{{ isPrinting ? 'Preparing Spool...' : 'Print Label Sheet' }}</span>
          </Button>
          <Button variant="ghost" size="sm" class="h-8 size-8 p-0" @click="emit('close')">
            <X class="size-4" />
          </Button>
        </div>
      </div>

      <!-- Controls Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <!-- Code Format Type -->
        <div>
          <label class="text-muted-foreground font-medium block mb-1">Code Format</label>
          <div class="inline-flex rounded-md p-0.5 bg-muted w-full">
            <button
              type="button"
              class="flex-1 flex items-center justify-center gap-1 py-1 text-xs font-medium rounded cursor-pointer transition-colors"
              :class="activeCodeType === 'barcode' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'"
              @click="activeCodeType = 'barcode'"
            >
              <Barcode class="size-3.5" />
              <span>Barcode</span>
            </button>
            <button
              type="button"
              class="flex-1 flex items-center justify-center gap-1 py-1 text-xs font-medium rounded cursor-pointer transition-colors"
              :class="activeCodeType === 'qr' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'"
              @click="activeCodeType = 'qr'"
            >
              <QrCode class="size-3.5" />
              <span>QR Code</span>
            </button>
            <button
              type="button"
              class="flex-1 flex items-center justify-center py-1 text-xs font-medium rounded cursor-pointer transition-colors"
              :class="activeCodeType === 'both' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'"
              @click="activeCodeType = 'both'"
            >
              <span>Both (1D+2D)</span>
            </button>
          </div>
        </div>

        <!-- Label Size / Paper Layout Preset -->
        <div>
          <label class="text-muted-foreground font-medium block mb-1">Sheet / Label Layout</label>
          <select
            v-model="activeLabelSize"
            class="w-full h-8 px-2 rounded-md border border-input bg-background text-xs font-medium focus:outline-none"
          >
            <option value="standard">Standard Bin Tag (50×30mm - 3 cols)</option>
            <option value="a4-grid">A4 Full Sheet Grid (3×8 Sticker Sheet)</option>
            <option value="compact">Compact Asset Tag (40×20mm - 4 cols)</option>
            <option value="large">Large Shipping Carton (70×40mm - 2 cols)</option>
            <option value="thermal">Thermal Roll Printer (Single Continuous)</option>
          </select>
        </div>

        <!-- Company Branding Input -->
        <div>
          <label class="text-muted-foreground font-medium block mb-1">Company Wordmark</label>
          <input
            v-model="activeCompanyName"
            placeholder="e.g. DMBB INVENTORY"
            class="w-full h-8 px-2 rounded-md border border-input bg-background text-xs font-mono"
          />
        </div>

        <!-- Visible Field Checkboxes -->
        <div>
          <label class="text-muted-foreground font-medium block mb-1">Included Content</label>
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
            <label class="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" v-model="displayCompany" class="rounded border-input size-3" />
              <span>Company</span>
            </label>
            <label class="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" v-model="displayProductName" class="rounded border-input size-3" />
              <span>Name</span>
            </label>
            <label class="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" v-model="displaySku" class="rounded border-input size-3" />
              <span>SKU</span>
            </label>
            <label class="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" v-model="displayAssetTag" class="rounded border-input size-3" />
              <span>Asset Tag</span>
            </label>
            <label class="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" v-model="displayPrice" class="rounded border-input size-3" />
              <span>Price (₱)</span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Printable Area (Rendered in preview & cloned to print portal on print) -->
    <div
      ref="printableAreaRef"
      id="printable-area"
      class="bg-white text-black p-3 font-sans rounded-lg border border-neutral-200"
    >
      <div
        class="grid gap-2.5"
        :class="{
          'grid-cols-2 sm:grid-cols-3 print:grid-cols-3': activeLabelSize === 'standard' || activeLabelSize === 'a4-grid',
          'grid-cols-3 sm:grid-cols-4 print:grid-cols-4': activeLabelSize === 'compact',
          'grid-cols-1 sm:grid-cols-2 print:grid-cols-2': activeLabelSize === 'large',
          'grid-cols-1 print:grid-cols-1 max-w-[280px] mx-auto': activeLabelSize === 'thermal',
        }"
      >
        <template v-for="(item, itemIdx) in items" :key="item.product.id">
          <div
            v-for="copyIndex in item.copies"
            :key="`${item.product.id}-${itemIdx}-${copyIndex}`"
            class="label-card flex flex-col justify-between border border-dashed border-neutral-300 p-2 text-center bg-white text-black relative"
            :class="{
              'min-h-[115px]': activeLabelSize === 'compact',
              'min-h-[155px]': activeLabelSize === 'standard' || activeLabelSize === 'a4-grid',
              'min-h-[195px]': activeLabelSize === 'large',
              'min-h-[160px]': activeLabelSize === 'thermal',
            }"
            style="page-break-inside: avoid; break-inside: avoid;"
          >
            <!-- 1. Label Top: Company Header & Asset Tracking ID -->
            <div class="w-full flex items-center justify-between border-b border-neutral-200 pb-1 mb-1">
              <span v-if="displayCompany" class="text-[9px] font-bold tracking-wider font-mono uppercase text-neutral-800 truncate">
                {{ activeCompanyName || 'COMPANY INVENTORY' }}
              </span>
              <span v-if="displayAssetTag" class="text-[8px] font-mono uppercase font-semibold text-neutral-500 tracking-tight ml-auto">
                PROP #{{ item.product.id.slice(-6).toUpperCase() }}
              </span>
            </div>

            <!-- 2. Product Name -->
            <div v-if="displayProductName" class="w-full truncate text-[11px] font-bold text-neutral-900 tracking-tight leading-tight px-1">
              {{ item.product.name }}
            </div>

            <!-- 3. SKU Subtext -->
            <div v-if="displaySku" class="w-full flex justify-between items-center text-[9px] font-mono text-neutral-600 px-1 my-0.5">
              <span>SKU: {{ item.product.sku }}</span>
              <span class="text-[8px] uppercase text-neutral-400">
                {{ activeCodeType === 'qr' ? 'QR MATRIX' : activeCodeType === 'both' ? '1D + 2D' : item.product.barcodeFormat }}
              </span>
            </div>

            <!-- 4. Barcode / QR Code Media Zone -->
            <div class="w-full my-1 flex justify-center items-center overflow-hidden flex-1">
              <!-- Mode: Barcode Only -->
              <div v-if="activeCodeType === 'barcode'" class="w-full flex justify-center items-center">
                <svg
                  :ref="(el) => setSvgRef(`barcode-${item.product.id}-${itemIdx}-${copyIndex - 1}`, el)"
                  class="max-w-full h-auto"
                ></svg>
              </div>

              <!-- Mode: QR Code Only -->
              <div v-else-if="activeCodeType === 'qr'" class="flex justify-center items-center">
                <canvas
                  :ref="(el) => setCanvasRef(`qr-${item.product.id}-${itemIdx}-${copyIndex - 1}`, el)"
                  class="max-h-full max-w-full"
                ></canvas>
              </div>

              <!-- Mode: Both Barcode & QR Code (Dual Matrix) -->
              <div v-else class="w-full flex items-center justify-between gap-1.5 px-0.5">
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

            <!-- 5. Label Bottom: Price in Philippine Peso (₱) or Verification Footer -->
            <div class="w-full flex justify-between items-center text-[9px] font-semibold text-neutral-900 border-t border-neutral-200 pt-1 mt-0.5 px-1">
              <span class="text-[8px] text-neutral-500 font-mono uppercase">
                {{ item.product.barcode || item.product.sku }}
              </span>
              <span v-if="displayPrice" class="font-mono text-[11px] font-bold text-neutral-950">
                {{ formatPHP(item.product.sellingPrice) }}
              </span>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.label-card {
  page-break-inside: avoid;
  break-inside: avoid;
}
</style>
