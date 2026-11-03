<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
import { Printer, X, Barcode, QrCode, FileText } from '@lucide/vue'
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
export type PrintModeOption = 'full' | 'code-only'

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
    initialPrintMode?: PrintModeOption
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
    initialPrintMode: 'full',
  }
)

const emit = defineEmits<{
  (e: 'close'): void
}>()

// Active print configurations
const printMode = ref<PrintModeOption>(props.initialPrintMode)
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
const codeOnlyPrintRef = ref<HTMLElement | null>(null)

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

      // --- 1. Full Label Elements ---
      if (activeCodeType.value === 'barcode' || activeCodeType.value === 'both') {
        const fullSvgEl = svgRefs.value[`barcode-${idKey}`]
        if (fullSvgEl) {
          const isCompact = activeLabelSize.value === 'compact'
          const isLarge = activeLabelSize.value === 'large'
          const isBoth = activeCodeType.value === 'both'

          BarcodeService.renderBarcode(
            fullSvgEl,
            item.product.barcode || item.product.sku,
            item.product.barcodeFormat || 'CODE128',
            {
              width: isCompact ? 1.3 : isBoth ? 1.4 : isLarge ? 2.0 : 1.7,
              height: isCompact ? 26 : isBoth ? 30 : isLarge ? 48 : 38,
              fontSize: isCompact ? 9 : 11,
              margin: 2,
              displayValue: true,
            }
          )
        }
      }

      if (activeCodeType.value === 'qr' || activeCodeType.value === 'both') {
        const fullCanvasEl = canvasRefs.value[`qr-${idKey}`]
        if (fullCanvasEl) {
          const qrText = QRCodeService.formatProductPayload(item.product)
          const qrWidth =
            activeLabelSize.value === 'compact'
              ? 64
              : activeCodeType.value === 'both'
                ? 70
                : activeLabelSize.value === 'large'
                  ? 110
                  : 84

          await QRCodeService.renderToCanvas(fullCanvasEl, qrText, {
            width: qrWidth,
            margin: 1,
            errorCorrectionLevel: 'M',
          })
        }
      }

      // --- 2. Code-Only Elements (Clean, Unbounded, Sharp Scannability) ---
      if (activeCodeType.value === 'barcode' || activeCodeType.value === 'both') {
        const codeOnlySvg = svgRefs.value[`codeonly-barcode-${idKey}`]
        if (codeOnlySvg) {
          const isCompact = activeLabelSize.value === 'compact'
          const isLarge = activeLabelSize.value === 'large'
          const isBoth = activeCodeType.value === 'both'

          BarcodeService.renderBarcode(
            codeOnlySvg,
            item.product.barcode || item.product.sku,
            item.product.barcodeFormat || 'CODE128',
            {
              width: isCompact ? 1.4 : isBoth ? 1.5 : isLarge ? 2.2 : 1.8,
              height: isCompact ? 34 : isBoth ? 38 : isLarge ? 64 : 48,
              fontSize: isCompact ? 10 : 12,
              margin: 4,
              displayValue: true,
            }
          )
        }
      }

      if (activeCodeType.value === 'qr' || activeCodeType.value === 'both') {
        const codeOnlyCanvas = canvasRefs.value[`codeonly-qr-${idKey}`]
        if (codeOnlyCanvas) {
          const qrText = QRCodeService.formatProductPayload(item.product)
          const qrWidth =
            activeLabelSize.value === 'compact'
              ? 84
              : activeCodeType.value === 'both'
                ? 88
                : activeLabelSize.value === 'large'
                  ? 144
                  : 108

          await QRCodeService.renderToCanvas(codeOnlyCanvas, qrText, {
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
    printMode.value,
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

async function handlePrint(modeToPrint: PrintModeOption = printMode.value) {
  printMode.value = modeToPrint
  const targetElement = modeToPrint === 'code-only' ? codeOnlyPrintRef.value : printableAreaRef.value
  if (!targetElement) return
  isPrinting.value = true

  try {
    // 1. Ensure all SVG barcodes and QR canvases are rendered
    await renderAllCodes()

    // 2. Small settle wait for canvas buffer
    await new Promise((r) => setTimeout(r, 60))

    // 3. Delegate to enterprise PrintService (clones target into root portal, converts canvas to PNG <img>)
    await PrintService.printElement(targetElement, {
      pageTitle:
        modeToPrint === 'code-only'
          ? `Inventory_Codes_${activeCodeType.value}_${activeLabelSize.value}`
          : `Inventory_Labels_${activeLabelSize.value}`,
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
            ({{ items.reduce((acc, i) => acc + i.copies, 0) }} item{{ items.reduce((acc, i) => acc + i.copies, 0) > 1 ? 's' : '' }})
          </span>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <!-- Print Full Labels Button -->
          <Button
            size="sm"
            class="h-8 gap-1.5 cursor-pointer font-semibold transition-colors"
            :class="printMode === 'full' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/80'"
            :disabled="isPrinting || items.length === 0"
            @click="handlePrint('full')"
          >
            <FileText class="size-3.5" />
            <span>{{ isPrinting && printMode === 'full' ? 'Preparing Spool...' : 'Print Full Label' }}</span>
          </Button>

          <!-- Print Code Only Button -->
          <Button
            size="sm"
            class="h-8 gap-1.5 cursor-pointer font-semibold transition-colors"
            :class="printMode === 'code-only' ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-foreground hover:bg-muted'"
            :disabled="isPrinting || items.length === 0"
            @click="handlePrint('code-only')"
          >
            <component :is="activeCodeType === 'qr' ? QrCode : Barcode" class="size-3.5" />
            <span>{{ isPrinting && printMode === 'code-only' ? 'Preparing Spool...' : 'Print Code Only' }}</span>
          </Button>

          <Button variant="ghost" size="sm" class="h-8 size-8 p-0" @click="emit('close')">
            <X class="size-4" />
          </Button>
        </div>
      </div>

      <!-- Controls Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
        <!-- Print Mode Selector -->
        <div>
          <label class="text-muted-foreground font-medium block mb-1">Print Mode</label>
          <div class="inline-flex rounded-md p-0.5 bg-muted w-full">
            <button
              type="button"
              class="flex-1 flex items-center justify-center gap-1 py-1 text-xs font-medium rounded cursor-pointer transition-colors"
              :class="printMode === 'full' ? 'bg-background text-foreground shadow-xs font-semibold' : 'text-muted-foreground hover:text-foreground'"
              @click="printMode = 'full'"
            >
              <FileText class="size-3.5" />
              <span>Full Label</span>
            </button>
            <button
              type="button"
              class="flex-1 flex items-center justify-center gap-1 py-1 text-xs font-medium rounded cursor-pointer transition-colors"
              :class="printMode === 'code-only' ? 'bg-background text-foreground shadow-xs font-semibold' : 'text-muted-foreground hover:text-foreground'"
              @click="printMode = 'code-only'"
            >
              <component :is="activeCodeType === 'qr' ? QrCode : Barcode" class="size-3.5" />
              <span>Code Only</span>
            </button>
          </div>
        </div>

        <!-- Code Format Type -->
        <div>
          <label class="text-muted-foreground font-medium block mb-1">Code Format</label>
          <div class="inline-flex rounded-md p-0.5 bg-muted w-full">
            <button
              type="button"
              class="flex-1 flex items-center justify-center gap-1 py-1 text-xs font-medium rounded cursor-pointer transition-colors"
              :class="activeCodeType === 'barcode' ? 'bg-background text-foreground shadow-xs font-semibold' : 'text-muted-foreground hover:text-foreground'"
              @click="activeCodeType = 'barcode'"
            >
              <Barcode class="size-3.5" />
              <span>Barcode</span>
            </button>
            <button
              type="button"
              class="flex-1 flex items-center justify-center gap-1 py-1 text-xs font-medium rounded cursor-pointer transition-colors"
              :class="activeCodeType === 'qr' ? 'bg-background text-foreground shadow-xs font-semibold' : 'text-muted-foreground hover:text-foreground'"
              @click="activeCodeType = 'qr'"
            >
              <QrCode class="size-3.5" />
              <span>QR Code</span>
            </button>
            <button
              type="button"
              class="flex-1 flex items-center justify-center py-1 text-xs font-medium rounded cursor-pointer transition-colors"
              :class="activeCodeType === 'both' ? 'bg-background text-foreground shadow-xs font-semibold' : 'text-muted-foreground hover:text-foreground'"
              @click="activeCodeType = 'both'"
            >
              <span>Both</span>
            </button>
          </div>
        </div>

        <!-- Label Size / Paper Layout Preset -->
        <div>
          <label class="text-muted-foreground font-medium block mb-1">Layout Preset</label>
          <select
            v-model="activeLabelSize"
            class="w-full h-8 px-2 rounded-md border border-input bg-background text-xs font-medium focus:outline-none"
          >
            <option value="standard">Standard Bin (50×30mm - 3 cols)</option>
            <option value="a4-grid">A4 Full Sheet Grid (3×8 Sticker Sheet)</option>
            <option value="compact">Compact Tag (40×20mm - 4 cols)</option>
            <option value="large">Large Shipping (70×40mm - 2 cols)</option>
            <option value="thermal">Thermal Continuous Roll (1 col)</option>
          </select>
        </div>

        <!-- Company Wordmark (Full Label Mode only) -->
        <div :class="{ 'opacity-50 pointer-events-none': printMode === 'code-only' }">
          <label class="text-muted-foreground font-medium block mb-1">
            Company Wordmark
            <span v-if="printMode === 'code-only'" class="text-[10px] text-muted-foreground">(omitted)</span>
          </label>
          <input
            v-model="activeCompanyName"
            :disabled="printMode === 'code-only'"
            placeholder="e.g. DMBB INVENTORY"
            class="w-full h-8 px-2 rounded-md border border-input bg-background text-xs font-mono"
          />
        </div>

        <!-- Visible Field Checkboxes (Full Label Mode only) -->
        <div :class="{ 'opacity-50 pointer-events-none': printMode === 'code-only' }">
          <label class="text-muted-foreground font-medium block mb-1">
            Label Content Fields
            <span v-if="printMode === 'code-only'" class="text-[10px] text-muted-foreground">(omitted)</span>
          </label>
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
            <label class="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" v-model="displayCompany" :disabled="printMode === 'code-only'" class="rounded border-input size-3" />
              <span>Company</span>
            </label>
            <label class="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" v-model="displayProductName" :disabled="printMode === 'code-only'" class="rounded border-input size-3" />
              <span>Name</span>
            </label>
            <label class="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" v-model="displaySku" :disabled="printMode === 'code-only'" class="rounded border-input size-3" />
              <span>SKU</span>
            </label>
            <label class="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" v-model="displayAssetTag" :disabled="printMode === 'code-only'" class="rounded border-input size-3" />
              <span>Tag</span>
            </label>
            <label class="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" v-model="displayPrice" :disabled="printMode === 'code-only'" class="rounded border-input size-3" />
              <span>₱ Price</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Mode Explanation Banner -->
      <div v-if="printMode === 'code-only'" class="bg-primary/5 border border-primary/20 rounded-md p-2 flex items-center justify-between text-xs text-foreground">
        <span class="flex items-center gap-1.5 font-medium">
          <component :is="activeCodeType === 'qr' ? QrCode : Barcode" class="size-3.5 text-primary" />
          Code-Only Mode active: Only the isolated barcode/QR matrix will print with zero card borders, text, or company branding.
        </span>
        <span class="text-[11px] text-muted-foreground">White background · Scannable vector/image</span>
      </div>
    </div>

    <!-- 1. FULL LABEL PRINT CONTAINER (Rendered in preview & cloned when Print Full Label is called) -->
    <div
      v-show="printMode === 'full'"
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
            :key="`full-${item.product.id}-${itemIdx}-${copyIndex}`"
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

    <!-- 2. DEDICATED CODE-ONLY PRINT CONTAINER (Rendered in preview & cloned when Print Code Only is called) -->
    <!-- Contains ONLY the generated SVG barcode and/or QR canvas. NO borders, NO branding, NO text, NO prices. Pure white background. -->
    <div
      v-show="printMode === 'code-only'"
      ref="codeOnlyPrintRef"
      id="code-only-printable-area"
      class="bg-white text-black p-3 font-sans rounded-lg border border-neutral-200"
    >
      <div
        class="grid gap-3"
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
            :key="`codeonly-${item.product.id}-${itemIdx}-${copyIndex}`"
            class="code-only-item flex items-center justify-center p-2 text-center bg-white"
            style="page-break-inside: avoid; break-inside: avoid; background-color: #ffffff;"
          >
            <!-- 1. Barcode Only (Clean SVG, centered, no card border, scannable digits included under bars) -->
            <div v-if="activeCodeType === 'barcode'" class="w-full flex justify-center items-center">
              <svg
                :ref="(el) => setSvgRef(`codeonly-barcode-${item.product.id}-${itemIdx}-${copyIndex - 1}`, el)"
                class="max-w-full h-auto"
              ></svg>
            </div>

            <!-- 2. QR Code Only (Clean canvas, high resolution, centered, zero clutter) -->
            <div v-else-if="activeCodeType === 'qr'" class="flex justify-center items-center">
              <canvas
                :ref="(el) => setCanvasRef(`codeonly-qr-${item.product.id}-${itemIdx}-${copyIndex - 1}`, el)"
                class="max-h-full max-w-full"
              ></canvas>
            </div>

            <!-- 3. Both Barcode & QR Code (Dual matrix side-by-side, no surrounding text or box) -->
            <div v-else class="w-full flex items-center justify-center gap-3">
              <div class="flex-1 flex justify-center overflow-hidden">
                <svg
                  :ref="(el) => setSvgRef(`codeonly-barcode-${item.product.id}-${itemIdx}-${copyIndex - 1}`, el)"
                  class="max-w-full h-auto"
                ></svg>
              </div>
              <div class="shrink-0 flex justify-center">
                <canvas
                  :ref="(el) => setCanvasRef(`codeonly-qr-${item.product.id}-${itemIdx}-${copyIndex - 1}`, el)"
                  class="size-20"
                ></canvas>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.label-card,
.code-only-item {
  page-break-inside: avoid;
  break-inside: avoid;
}
</style>
