<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import {
  Barcode as BarcodeIcon,
  Sparkles,
  Printer,
  Download,
  Copy,
  Check,
  Settings2,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { productRepo } from '@/repositories'
import { BarcodeService } from '@/services/barcode.service'
import BarcodePrintSheet, { type PrintableLabelItem } from '@/components/BarcodePrintSheet.vue'
import type { Product, BarcodeFormat } from '@/database/core/database.types'

const products = ref<Product[]>([])
const selectedProductId = ref('')
const activeTab = ref<'single' | 'bulk'>('single')

// Single Barcode Generator State
const barcodeValue = ref('793573194012')
const barcodeFormat = ref<BarcodeFormat>('CODE128')
const labelTitle = ref('General Inventory Label')
const labelSku = ref('INV-ITM-1001')
const labelPrice = ref(29.99)
const labelCopies = ref(1)
const copied = ref(false)

const previewSvg = ref<SVGSVGElement | null>(null)

// Bulk Barcode Generator State
const bulkSelected = ref<Record<string, number>>({})
const bulkLabelSize = ref<'compact' | 'standard' | 'large'>('standard')
const showBulkPrintSheet = ref(false)

async function loadProducts() {
  products.value = await productRepo.getAll()
  if (products.value.length > 0 && !selectedProductId.value) {
    selectProductForGeneration(products.value[0]!)
  }
}

function selectProductForGeneration(p: Product) {
  selectedProductId.value = p.id
  barcodeValue.value = p.barcode
  barcodeFormat.value = p.barcodeFormat
  labelTitle.value = p.name
  labelSku.value = p.sku
  labelPrice.value = p.sellingPrice
  renderSingleBarcode()
}

function generateNewRandomBarcode() {
  barcodeValue.value = BarcodeService.generateBarcodeNumber(barcodeFormat.value)
  renderSingleBarcode()
}

function renderSingleBarcode() {
  nextTick(() => {
    if (previewSvg.value) {
      BarcodeService.renderBarcode(previewSvg.value, barcodeValue.value, barcodeFormat.value, {
        width: 2,
        height: 60,
        fontSize: 14,
      })
    }
  })
}

watch([barcodeValue, barcodeFormat], () => {
  renderSingleBarcode()
})

onMounted(() => {
  loadProducts()
  renderSingleBarcode()
})

function copyBarcodeText() {
  navigator.clipboard.writeText(barcodeValue.value)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}

function downloadBarcodeSvg() {
  if (!previewSvg.value) return
  const svgData = new XMLSerializer().serializeToString(previewSvg.value)
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
  const svgUrl = URL.createObjectURL(svgBlob)
  const downloadLink = document.createElement('a')
  downloadLink.href = svgUrl
  downloadLink.download = `barcode_${barcodeValue.value}.svg`
  document.body.appendChild(downloadLink)
  downloadLink.click()
  document.body.removeChild(downloadLink)
}

// Bulk items for printing
const bulkPrintItems = computed<PrintableLabelItem[]>(() => {
  const items: PrintableLabelItem[] = []
  products.value.forEach(p => {
    const qty = bulkSelected.value[p.id] || 0
    if (qty > 0) {
      items.push({ product: p, copies: qty })
    }
  })
  return items
})

function setBulkQuantity(productId: string, qty: number) {
  if (qty <= 0) {
    delete bulkSelected.value[productId]
  } else {
    bulkSelected.value[productId] = qty
  }
}

function selectAllBulk(copies: number = 2) {
  const map: Record<string, number> = {}
  products.value.forEach(p => {
    map[p.id] = copies
  })
  bulkSelected.value = map
}

function clearBulk() {
  bulkSelected.value = {}
}

function triggerSinglePrint() {
  window.print()
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Barcode Generator</h1>
        <p class="text-xs text-muted-foreground">
          Generate Code 128 and EAN-13 barcodes, download SVG vectors, and print label batches
        </p>
      </div>

      <!-- Tab Switcher -->
      <div class="flex items-center gap-1 p-1 bg-muted rounded-lg border border-border">
        <button
          type="button"
          class="px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer"
          :class="activeTab === 'single' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'"
          @click="activeTab = 'single'"
        >
          Single Generator
        </button>
        <button
          type="button"
          class="px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer"
          :class="activeTab === 'bulk' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'"
          @click="activeTab = 'bulk'"
        >
          Batch Label Printing
        </button>
      </div>
    </div>

    <!-- SINGLE GENERATOR MODE -->
    <div v-if="activeTab === 'single'" class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- Parameters Form (7 cols) -->
      <div class="lg:col-span-7 rounded-lg border border-border bg-card p-5 shadow-xs space-y-4">
        <div class="flex items-center justify-between border-b pb-3">
          <h2 class="text-sm font-semibold flex items-center gap-2">
            <Settings2 class="size-4 text-primary" />
            Barcode Configuration
          </h2>
          <span class="text-xs text-muted-foreground">Live Instant Rendering</span>
        </div>

        <!-- Select from existing product -->
        <div v-if="products.length > 0">
          <Label class="text-xs font-semibold">Load from Existing Product</Label>
          <select
            v-model="selectedProductId"
            class="w-full h-8 mt-1 px-2.5 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none"
            @change="() => {
              const p = products.find(prod => prod.id === selectedProductId)
              if (p) selectProductForGeneration(p)
            }"
          >
            <option value="">-- Choose Product to Auto-populate --</option>
            <option v-for="p in products" :key="p.id" :value="p.id">
              {{ p.name }} ({{ p.sku }} &bull; {{ p.barcode }})
            </option>
          </select>
        </div>

        <!-- Symbology & Auto Generate -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label class="text-xs font-semibold">Barcode Symbology</Label>
            <select
              v-model="barcodeFormat"
              class="w-full h-8 mt-1 px-2.5 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none"
              @change="generateNewRandomBarcode"
            >
              <option value="CODE128">Code 128 (Standard Warehouse Alphanumeric)</option>
              <option value="EAN13">EAN-13 (13-Digit Retail Modulo-10)</option>
            </select>
          </div>

          <div>
            <div class="flex items-center justify-between">
              <Label for="barcode-val" class="text-xs font-semibold">Barcode Value</Label>
              <button
                type="button"
                @click="generateNewRandomBarcode"
                class="text-[10px] text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <Sparkles class="size-3" /> Auto-Generate
              </button>
            </div>
            <Input id="barcode-val" v-model="barcodeValue" class="h-8 mt-1 font-mono text-xs" />
          </div>
        </div>

        <!-- Label Metadata (Name, SKU, Price) -->
        <div class="space-y-3 pt-2 border-t">
          <div class="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Label Print Information
          </div>

          <div>
            <Label for="label-name" class="text-xs font-semibold">Label Product Title</Label>
            <Input id="label-name" v-model="labelTitle" class="h-8 mt-1 text-xs" />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label for="label-sku" class="text-xs font-semibold">SKU</Label>
              <Input id="label-sku" v-model="labelSku" class="h-8 mt-1 font-mono text-xs" />
            </div>

            <div>
              <Label for="label-price" class="text-xs font-semibold">Price ($)</Label>
              <Input id="label-price" v-model.number="labelPrice" type="number" step="0.01" class="h-8 mt-1 font-mono text-xs" />
            </div>

            <div>
              <Label for="label-copies" class="text-xs font-semibold">Print Copies</Label>
              <Input id="label-copies" v-model.number="labelCopies" type="number" min="1" max="100" class="h-8 mt-1 font-mono text-xs" />
            </div>
          </div>
        </div>
      </div>

      <!-- Preview & Export Card (5 cols) -->
      <div class="lg:col-span-5 rounded-lg border border-border bg-card p-5 shadow-xs flex flex-col justify-between space-y-4">
        <div>
          <div class="flex items-center justify-between border-b pb-3">
            <h2 class="text-sm font-semibold flex items-center gap-2">
              <BarcodeIcon class="size-4 text-primary" />
              Live Barcode Output
            </h2>
            <span class="text-xs font-mono uppercase text-muted-foreground">{{ barcodeFormat }}</span>
          </div>

          <!-- Label Card Simulator -->
          <div class="mt-4 p-4 rounded-lg border border-neutral-300 bg-white text-black shadow-xs flex flex-col items-center justify-between text-center min-h-[180px]">
            <div class="text-xs font-bold text-neutral-900 truncate max-w-full">
              {{ labelTitle || 'Product Name' }}
            </div>

            <div class="w-full flex justify-between text-[10px] font-mono text-neutral-600 px-2 my-1">
              <span>SKU: {{ labelSku || 'N/A' }}</span>
              <span>{{ barcodeFormat }}</span>
            </div>

            <!-- SVG Container -->
            <div class="my-2 max-w-full flex justify-center overflow-hidden">
              <svg ref="previewSvg" class="max-w-full h-auto"></svg>
            </div>

            <div class="w-full flex justify-between items-center text-[11px] font-semibold text-neutral-900 border-t border-neutral-200 pt-1.5 px-1">
              <span class="text-neutral-500 text-[10px]">RETAIL</span>
              <span class="font-mono text-xs font-bold">${{ labelPrice.toFixed(2) }}</span>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="space-y-2 pt-2 border-t">
          <div class="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" class="h-8 gap-1.5 text-xs cursor-pointer" @click="copyBarcodeText">
              <Check v-if="copied" class="size-3.5 text-emerald-600" />
              <Copy v-else class="size-3.5" />
              <span>{{ copied ? 'Copied!' : 'Copy Code' }}</span>
            </Button>

            <Button variant="outline" size="sm" class="h-8 gap-1.5 text-xs cursor-pointer" @click="downloadBarcodeSvg">
              <Download class="size-3.5" />
              <span>Download SVG</span>
            </Button>
          </div>

          <Button size="sm" class="w-full h-9 gap-1.5 text-xs cursor-pointer" @click="triggerSinglePrint">
            <Printer class="size-4" />
            <span>Print {{ labelCopies }} Label{{ labelCopies > 1 ? 's' : '' }}</span>
          </Button>
        </div>
      </div>
    </div>

    <!-- BULK GENERATOR / BATCH PRINTING MODE -->
    <div v-else class="space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg border border-border bg-card shadow-xs">
        <div>
          <h2 class="text-sm font-semibold">Bulk Product Barcode Labels</h2>
          <p class="text-xs text-muted-foreground">Select quantities for each catalog product to generate a combined print sheet</p>
        </div>

        <div class="flex items-center gap-2">
          <Button variant="outline" size="sm" class="h-8 text-xs cursor-pointer" @click="selectAllBulk(2)">
            Select All (2x each)
          </Button>
          <Button variant="outline" size="sm" class="h-8 text-xs cursor-pointer" @click="clearBulk">
            Clear
          </Button>
          <Button
            size="sm"
            class="h-8 gap-1.5 text-xs cursor-pointer"
            :disabled="bulkPrintItems.length === 0"
            @click="showBulkPrintSheet = !showBulkPrintSheet"
          >
            <Printer class="size-3.5" />
            <span>{{ showBulkPrintSheet ? 'Hide Print View' : `Print Labels (${bulkPrintItems.reduce((a, b) => a + b.copies, 0)})` }}</span>
          </Button>
        </div>
      </div>

      <!-- Printable Area -->
      <div v-if="showBulkPrintSheet" class="rounded-lg border border-border bg-card p-4 shadow-sm">
        <BarcodePrintSheet
          :items="bulkPrintItems"
          :label-size="bulkLabelSize"
          @close="showBulkPrintSheet = false"
        />
      </div>

      <!-- Products Selection List -->
      <div class="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
        <table class="w-full text-xs">
          <thead>
            <tr class="border-b border-border bg-muted/40 text-muted-foreground">
              <th class="py-2.5 px-3 text-left font-medium">Product / SKU</th>
              <th class="py-2.5 px-3 text-left font-medium">Barcode</th>
              <th class="py-2.5 px-3 text-left font-medium">Symbology</th>
              <th class="py-2.5 px-3 text-right font-medium">Retail Price</th>
              <th class="py-2.5 px-3 text-right font-medium">Current Stock</th>
              <th class="py-2.5 px-3 text-center font-medium w-36">Label Copies</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border/60">
            <tr v-for="p in products" :key="p.id" class="hover:bg-muted/20 transition-colors">
              <td class="py-2.5 px-3">
                <div class="font-medium text-foreground">{{ p.name }}</div>
                <div class="font-mono text-[10px] text-muted-foreground">{{ p.sku }}</div>
              </td>
              <td class="py-2.5 px-3 font-mono text-muted-foreground">{{ p.barcode }}</td>
              <td class="py-2.5 px-3 font-mono text-[10px] uppercase text-muted-foreground">{{ p.barcodeFormat }}</td>
              <td class="py-2.5 px-3 text-right font-mono tabular-nums font-medium">${{ p.sellingPrice.toFixed(2) }}</td>
              <td class="py-2.5 px-3 text-right font-mono tabular-nums">{{ p.currentStock }}</td>
              <td class="py-2.5 px-3 text-center">
                <div class="flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    class="size-6 rounded border bg-muted text-xs font-semibold hover:bg-secondary cursor-pointer"
                    @click="setBulkQuantity(p.id, (bulkSelected[p.id] || 0) - 1)"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    :value="bulkSelected[p.id] || 0"
                    class="w-12 h-6 text-center text-xs font-mono border rounded bg-background"
                    @input="(e: any) => setBulkQuantity(p.id, parseInt(e.target.value) || 0)"
                  />
                  <button
                    type="button"
                    class="size-6 rounded border bg-muted text-xs font-semibold hover:bg-secondary cursor-pointer"
                    @click="setBulkQuantity(p.id, (bulkSelected[p.id] || 0) + 1)"
                  >
                    +
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
