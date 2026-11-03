<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import {
  ArrowLeft,
  Package,
  Printer,
  ArrowDownToLine,
  ArrowUpFromLine,
  SlidersHorizontal,
  DollarSign,
  Boxes,
  Truck,
  FolderTree,
  Ruler,
  AlertTriangle,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  productRepo,
  categoryRepo,
  brandRepo,
  unitRepo,
  supplierRepo,
  transactionRepo,
} from '@/repositories'
import { BarcodeService } from '@/services/barcode.service'
import { QRCodeService } from '@/services/qr.service'
import { formatPHP } from '@/lib/currency'
import BarcodePrintSheet from '@/components/BarcodePrintSheet.vue'
import type {
  Product,
  Category,
  Brand,
  UnitOfMeasurement,
  Supplier,
  InventoryTransaction,
} from '@/database/core/database.types'

const route = useRoute()
const router = useRouter()
const productId = route.params.id as string

const product = ref<Product | null>(null)
const category = ref<Category | null>(null)
const brand = ref<Brand | null>(null)
const unit = ref<UnitOfMeasurement | null>(null)
const supplier = ref<Supplier | null>(null)
const transactions = ref<InventoryTransaction[]>([])
const isLoading = ref(true)

const barcodeSvg = ref<SVGSVGElement | null>(null)
const qrCanvas = ref<HTMLCanvasElement | null>(null)
const activeCodeTab = ref<'barcode' | 'qr'>('barcode')
const showPrintSheet = ref(false)

async function loadProductData() {
  isLoading.value = true
  try {
    const prod = await productRepo.getById(productId)
    if (!prod) {
      router.push('/products')
      return
    }
    product.value = prod

    const [cat, br, un, sup, txs] = await Promise.all([
      prod.categoryId ? categoryRepo.getById(prod.categoryId) : Promise.resolve(undefined),
      prod.brandId ? brandRepo.getById(prod.brandId) : Promise.resolve(undefined),
      prod.unitId ? unitRepo.getById(prod.unitId) : Promise.resolve(undefined),
      prod.supplierId ? supplierRepo.getById(prod.supplierId) : Promise.resolve(undefined),
      transactionRepo.getByProductId(productId),
    ])

    category.value = cat || null
    brand.value = br || null
    unit.value = un || null
    supplier.value = sup || null
    transactions.value = txs

    renderCodes()
  } catch (err) {
    console.error('Failed to load product details:', err)
  } finally {
    isLoading.value = false
  }
}

function renderCodes() {
  nextTick(() => {
    if (barcodeSvg.value && product.value) {
      BarcodeService.renderBarcode(
        barcodeSvg.value,
        product.value.barcode,
        product.value.barcodeFormat,
        {
          width: 2,
          height: 60,
          fontSize: 14,
        }
      )
    }
    if (qrCanvas.value && product.value) {
      QRCodeService.renderToCanvas(
        qrCanvas.value,
        product.value.sku || product.value.barcode,
        { width: 130, margin: 1 }
      )
    }
  })
}

function switchCodeTab(tab: 'barcode' | 'qr') {
  activeCodeTab.value = tab
  renderCodes()
}

onMounted(() => {
  loadProductData()
})
</script>

<template>
  <div v-if="product" class="space-y-6">
    <!-- Header with Back Button and Quick Actions -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <Button variant="outline" size="sm" as-child class="size-8 p-0">
          <RouterLink to="/products">
            <ArrowLeft class="size-4" />
          </RouterLink>
        </Button>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl font-bold tracking-tight">{{ product.name }}</h1>
            <span
              class="font-mono text-[10px] uppercase font-semibold px-2 py-0.5 rounded"
              :class="product.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'"
            >
              {{ product.status }}
            </span>
          </div>
          <div class="flex items-center gap-3 text-xs text-muted-foreground font-mono mt-0.5">
            <span>SKU: {{ product.sku }}</span>
            <span>&bull;</span>
            <span>Barcode: {{ product.barcode }} ({{ product.barcodeFormat }})</span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <Button variant="outline" size="sm" class="h-8 gap-1.5 text-xs cursor-pointer font-medium" @click="showPrintSheet = !showPrintSheet">
          <Printer class="size-3.5" />
          <span>{{ showPrintSheet ? 'Hide Label Print' : 'Print Barcode & QR' }}</span>
        </Button>

        <Button variant="outline" size="sm" as-child class="h-8 gap-1.5 text-xs">
          <RouterLink :to="{ path: '/stock-in', query: { productId: product.id } }">
            <ArrowDownToLine class="size-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Stock In</span>
          </RouterLink>
        </Button>

        <Button variant="outline" size="sm" as-child class="h-8 gap-1.5 text-xs">
          <RouterLink :to="{ path: '/stock-out', query: { productId: product.id } }">
            <ArrowUpFromLine class="size-3.5 text-amber-600 dark:text-amber-400" />
            <span>Stock Out</span>
          </RouterLink>
        </Button>

        <Button size="sm" as-child class="h-8 gap-1.5 text-xs">
          <RouterLink :to="{ path: '/stock-adjustments', query: { productId: product.id } }">
            <SlidersHorizontal class="size-3.5" />
            <span>Adjust</span>
          </RouterLink>
        </Button>
      </div>
    </div>

    <!-- Print Label Sheet Preview (if open) -->
    <div v-if="showPrintSheet" class="rounded-lg border border-border bg-card p-4 shadow-sm">
      <BarcodePrintSheet
        :items="[{ product, copies: 4 }]"
        :code-type="activeCodeTab"
        label-size="standard"
        @close="showPrintSheet = false"
      />
    </div>

    <!-- Overview Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- Live Barcode & QR Code Card -->
      <div class="rounded-lg border border-border bg-card p-4 text-card-foreground shadow-xs flex flex-col items-center justify-between text-center">
        <div class="w-full flex justify-between items-center text-xs text-muted-foreground pb-2 border-b">
          <span class="font-medium uppercase tracking-wider text-[10px]">Code Preview</span>
          <div class="inline-flex rounded-md p-0.5 bg-muted">
            <button
              type="button"
              class="px-2 py-0.5 text-[10px] font-medium rounded cursor-pointer transition-colors"
              :class="activeCodeTab === 'barcode' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'"
              @click="switchCodeTab('barcode')"
            >
              Barcode
            </button>
            <button
              type="button"
              class="px-2 py-0.5 text-[10px] font-medium rounded cursor-pointer transition-colors"
              :class="activeCodeTab === 'qr' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'"
              @click="switchCodeTab('qr')"
            >
              QR Code
            </button>
          </div>
        </div>

        <div class="py-3 w-full flex justify-center items-center bg-white rounded-md my-2 min-h-[120px]">
          <div v-show="activeCodeTab === 'barcode'" class="w-full flex justify-center">
            <svg ref="barcodeSvg" class="max-w-full h-auto"></svg>
          </div>
          <div v-show="activeCodeTab === 'qr'" class="flex justify-center">
            <canvas ref="qrCanvas" class="max-w-[130px] max-h-[130px]"></canvas>
          </div>
        </div>

        <div class="font-mono text-xs font-semibold text-muted-foreground">
          {{ activeCodeTab === 'barcode' ? product.barcode : (product.sku || product.barcode) }}
        </div>
      </div>

      <!-- Stock Status Card -->
      <div class="rounded-lg border border-border bg-card p-4 text-card-foreground shadow-xs space-y-3">
        <div class="flex items-center justify-between text-xs text-muted-foreground pb-2 border-b">
          <span class="font-medium uppercase tracking-wider text-[10px]">Inventory Balance</span>
          <Boxes class="size-4 text-muted-foreground" />
        </div>

        <div class="flex items-baseline justify-between">
          <div>
            <div class="text-3xl font-bold font-mono tabular-nums text-foreground">
              {{ product.currentStock }}
            </div>
            <div class="text-xs text-muted-foreground">
              Units in stock {{ unit ? `(${unit.abbreviation})` : '' }}
            </div>
          </div>

          <div class="text-right">
            <span
              class="font-mono text-xs font-semibold"
              :class="{
                'text-destructive': product.currentStock <= 0,
                'text-amber-600 dark:text-amber-400': product.currentStock > 0 && product.currentStock <= product.minStockLevel,
                'text-emerald-600 dark:text-emerald-400': product.currentStock > product.minStockLevel,
              }"
            >
              {{ product.currentStock <= 0 ? 'Out of Stock' : product.currentStock <= product.minStockLevel ? 'Low Stock Warning' : 'Optimal Stock' }}
            </span>
            <div class="text-[11px] text-muted-foreground mt-0.5">
              Reorder threshold: {{ product.minStockLevel }}
            </div>
          </div>
        </div>

        <div v-if="product.currentStock <= product.minStockLevel" class="flex items-center gap-2 p-2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs">
          <AlertTriangle class="size-4 shrink-0" />
          <span>Current balance is at or below recommended minimum stock level.</span>
        </div>
      </div>

      <!-- Pricing & Valuation Card -->
      <div class="rounded-lg border border-border bg-card p-4 text-card-foreground shadow-xs space-y-3">
        <div class="flex items-center justify-between text-xs text-muted-foreground pb-2 border-b">
          <span class="font-medium uppercase tracking-wider text-[10px]">Pricing & Valuation</span>
          <DollarSign class="size-4 text-muted-foreground" />
        </div>

        <div class="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span class="text-muted-foreground text-[11px]">Cost Price:</span>
            <div class="text-base font-bold font-mono tabular-nums">{{ formatPHP(product.costPrice) }}</div>
          </div>
          <div>
            <span class="text-muted-foreground text-[11px]">Selling Price:</span>
            <div class="text-base font-bold font-mono tabular-nums text-foreground">{{ formatPHP(product.sellingPrice) }}</div>
          </div>
          <div class="pt-2 border-t">
            <span class="text-muted-foreground text-[11px]">Unit Margin:</span>
            <div class="font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
              {{ formatPHP(product.sellingPrice - product.costPrice) }}
              ({{ product.costPrice > 0 ? (((product.sellingPrice - product.costPrice) / product.costPrice) * 100).toFixed(0) : '0' }}%)
            </div>
          </div>
          <div class="pt-2 border-t">
            <span class="text-muted-foreground text-[11px]">Total Asset Value:</span>
            <div class="font-mono tabular-nums font-semibold text-foreground">
              {{ formatPHP(product.currentStock * product.costPrice) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Specifications & Metadata -->
    <div class="rounded-lg border border-border bg-card p-4 shadow-xs space-y-4">
      <h3 class="text-sm font-semibold border-b pb-2">Product Specifications</h3>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div>
          <span class="text-muted-foreground flex items-center gap-1.5 mb-1">
            <FolderTree class="size-3.5" /> Category
          </span>
          <span class="font-medium">{{ category?.name || 'Unassigned' }}</span>
        </div>

        <div>
          <span class="text-muted-foreground flex items-center gap-1.5 mb-1">
            <Package class="size-3.5" /> Brand
          </span>
          <span class="font-medium">{{ brand?.name || 'Unassigned' }}</span>
        </div>

        <div>
          <span class="text-muted-foreground flex items-center gap-1.5 mb-1">
            <Ruler class="size-3.5" /> Unit of Measure
          </span>
          <span class="font-medium">{{ unit?.name ? `${unit.name} (${unit.abbreviation})` : 'Unassigned' }}</span>
        </div>

        <div>
          <span class="text-muted-foreground flex items-center gap-1.5 mb-1">
            <Truck class="size-3.5" /> Primary Supplier
          </span>
          <span class="font-medium">{{ supplier?.name || 'Unassigned' }}</span>
        </div>
      </div>

      <div v-if="product.description" class="pt-2 border-t text-xs">
        <span class="text-muted-foreground font-medium">Description / Location:</span>
        <p class="mt-1 text-foreground leading-relaxed">{{ product.description }}</p>
      </div>
    </div>

    <!-- Product Audit Trail & Movement History -->
    <div class="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
      <div class="p-4 border-b border-border">
        <h3 class="text-sm font-semibold">Stock Movement History for this Item</h3>
        <p class="text-[11px] text-muted-foreground">Immutable audit ledger of stock ins, outs, and reconciliations</p>
      </div>

      <div v-if="transactions.length === 0" class="p-8 text-center text-xs text-muted-foreground">
        No transactions recorded yet for this product.
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="border-b border-border bg-muted/40 text-muted-foreground">
              <th class="py-2.5 px-3 text-left font-medium">Type</th>
              <th class="py-2.5 px-3 text-right font-medium">Qty Changed</th>
              <th class="py-2.5 px-3 text-right font-medium">Previous</th>
              <th class="py-2.5 px-3 text-right font-medium">Resulting Stock</th>
              <th class="py-2.5 px-3 text-left font-medium">Reference</th>
              <th class="py-2.5 px-3 text-left font-medium">Destination / Party</th>
              <th class="py-2.5 px-3 text-left font-medium">User</th>
              <th class="py-2.5 px-3 text-right font-medium">Date & Time</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border/60">
            <tr v-for="t in transactions" :key="t.id" class="hover:bg-muted/20 transition-colors">
              <td class="py-2.5 px-3">
                <span
                  class="font-mono text-[10px] font-semibold uppercase"
                  :class="{
                    'text-emerald-600 dark:text-emerald-400': t.type === 'stock_in',
                    'text-amber-600 dark:text-amber-400': t.type === 'stock_out',
                    'text-blue-600 dark:text-blue-400': t.type === 'adjustment',
                  }"
                >
                  {{ t.type.replace('_', ' ') }}
                </span>
              </td>
              <td class="py-2.5 px-3 text-right font-mono tabular-nums font-semibold" :class="t.quantityChanged > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'">
                {{ t.quantityChanged > 0 ? `+${t.quantityChanged}` : t.quantityChanged }}
              </td>
              <td class="py-2.5 px-3 text-right font-mono tabular-nums text-muted-foreground">{{ t.previousStock }}</td>
              <td class="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-foreground">{{ t.newStock }}</td>
              <td class="py-2.5 px-3 font-mono text-[11px] text-foreground">{{ t.referenceNumber }}</td>
              <td class="py-2.5 px-3 text-muted-foreground">{{ t.destinationOrSupplier }}</td>
              <td class="py-2.5 px-3 text-muted-foreground">{{ t.user }}</td>
              <td class="py-2.5 px-3 text-right font-mono text-muted-foreground">
                {{ t.transactionDate.replace('T', ' ').slice(0, 16) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
