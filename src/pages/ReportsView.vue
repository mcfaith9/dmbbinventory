<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Download,
  Printer,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { productRepo, transactionRepo } from '@/repositories'
import { ReportService } from '@/services/report.service'
import type { Product, InventoryTransaction } from '@/database/core/database.types'

type ReportType =
  | 'stock_summary'
  | 'low_stock'
  | 'out_of_stock'
  | 'valuation'
  | 'stock_in'
  | 'stock_out'

const activeReport = ref<ReportType>('stock_summary')
const products = ref<Product[]>([])
const transactions = ref<InventoryTransaction[]>([])
const isLoading = ref(true)

async function loadReportData() {
  isLoading.value = true
  try {
    const [prods, txs] = await Promise.all([
      productRepo.getAll({ status: 'active' }),
      transactionRepo.getAll(),
    ])
    products.value = prods
    transactions.value = txs
  } catch (err) {
    console.error('Failed to load report data:', err)
  } finally {
    isLoading.value = false
  }
}

// Filtered lists for report categories
const lowStockProducts = computed(() => {
  return products.value.filter(p => p.currentStock > 0 && p.currentStock <= p.minStockLevel)
})

const outOfStockProducts = computed(() => {
  return products.value.filter(p => p.currentStock <= 0)
})

const stockInTransactions = computed(() => {
  return transactions.value.filter(t => t.type === 'stock_in')
})

const stockOutTransactions = computed(() => {
  return transactions.value.filter(t => t.type === 'stock_out')
})

const totalCostValuation = computed(() => {
  return products.value.reduce((acc, p) => acc + p.currentStock * p.costPrice, 0)
})

const totalRetailValuation = computed(() => {
  return products.value.reduce((acc, p) => acc + p.currentStock * p.sellingPrice, 0)
})

const productsMap = computed(() => {
  const map: Record<string, Product> = {}
  products.value.forEach(p => (map[p.id] = p))
  return map
})

function exportCurrentReportCsv() {
  if (activeReport.value === 'stock_summary' || activeReport.value === 'valuation') {
    ReportService.exportProductsCsv(products.value)
  } else if (activeReport.value === 'low_stock') {
    ReportService.exportProductsCsv(lowStockProducts.value)
  } else if (activeReport.value === 'out_of_stock') {
    ReportService.exportProductsCsv(outOfStockProducts.value)
  } else if (activeReport.value === 'stock_in') {
    ReportService.exportTransactionsCsv(stockInTransactions.value, productsMap.value)
  } else if (activeReport.value === 'stock_out') {
    ReportService.exportTransactionsCsv(stockOutTransactions.value, productsMap.value)
  }
}

function printReport() {
  window.print()
}

onMounted(() => {
  loadReportData()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Inventory Reports</h1>
        <p class="text-xs text-muted-foreground">
          Audit balances, stockout forecasts, financial valuation, and printable records
        </p>
      </div>

      <div class="flex items-center gap-2">
        <Button variant="outline" size="sm" class="h-8 gap-1.5 text-xs cursor-pointer" @click="printReport">
          <Printer class="size-3.5" />
          <span>Print Report</span>
        </Button>
        <Button size="sm" class="h-8 gap-1.5 text-xs cursor-pointer" @click="exportCurrentReportCsv">
          <Download class="size-3.5" />
          <span>Export CSV</span>
        </Button>
      </div>
    </div>

    <!-- Valuation KPI Summary Strip -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="p-3 rounded-lg border border-border bg-card shadow-xs">
        <span class="text-[10px] uppercase font-medium text-muted-foreground">Catalog Items</span>
        <div class="text-xl font-bold font-mono tabular-nums mt-0.5">{{ products.length }}</div>
      </div>
      <div class="p-3 rounded-lg border border-border bg-card shadow-xs">
        <span class="text-[10px] uppercase font-medium text-muted-foreground">Total Units In Stock</span>
        <div class="text-xl font-bold font-mono tabular-nums mt-0.5">
          {{ products.reduce((acc, p) => acc + p.currentStock, 0) }}
        </div>
      </div>
      <div class="p-3 rounded-lg border border-border bg-card shadow-xs">
        <span class="text-[10px] uppercase font-medium text-muted-foreground">Inventory Cost Asset</span>
        <div class="text-xl font-bold font-mono tabular-nums text-foreground mt-0.5">
          ${{ totalCostValuation.toFixed(2) }}
        </div>
      </div>
      <div class="p-3 rounded-lg border border-border bg-card shadow-xs">
        <span class="text-[10px] uppercase font-medium text-muted-foreground">Potential Retail Value</span>
        <div class="text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
          ${{ totalRetailValuation.toFixed(2) }}
        </div>
      </div>
    </div>

    <!-- Report Selector Tabs -->
    <div class="flex flex-wrap items-center gap-1.5 p-1 bg-muted rounded-lg border border-border text-xs">
      <button
        type="button"
        class="px-3 py-1.5 font-medium rounded-md transition-colors cursor-pointer"
        :class="activeReport === 'stock_summary' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'"
        @click="activeReport = 'stock_summary'"
      >
        Current Stock ({{ products.length }})
      </button>

      <button
        type="button"
        class="px-3 py-1.5 font-medium rounded-md transition-colors cursor-pointer flex items-center gap-1"
        :class="activeReport === 'low_stock' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'"
        @click="activeReport = 'low_stock'"
      >
        <span class="size-1.5 rounded-full bg-amber-500"></span>
        Low Stock ({{ lowStockProducts.length }})
      </button>

      <button
        type="button"
        class="px-3 py-1.5 font-medium rounded-md transition-colors cursor-pointer flex items-center gap-1"
        :class="activeReport === 'out_of_stock' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'"
        @click="activeReport = 'out_of_stock'"
      >
        <span class="size-1.5 rounded-full bg-destructive"></span>
        Out of Stock ({{ outOfStockProducts.length }})
      </button>

      <button
        type="button"
        class="px-3 py-1.5 font-medium rounded-md transition-colors cursor-pointer"
        :class="activeReport === 'valuation' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'"
        @click="activeReport = 'valuation'"
      >
        Valuation Breakdown
      </button>

      <button
        type="button"
        class="px-3 py-1.5 font-medium rounded-md transition-colors cursor-pointer"
        :class="activeReport === 'stock_in' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'"
        @click="activeReport = 'stock_in'"
      >
        Stock-In ({{ stockInTransactions.length }})
      </button>

      <button
        type="button"
        class="px-3 py-1.5 font-medium rounded-md transition-colors cursor-pointer"
        :class="activeReport === 'stock_out' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'"
        @click="activeReport = 'stock_out'"
      >
        Stock-Out ({{ stockOutTransactions.length }})
      </button>
    </div>

    <!-- Active Report Table -->
    <div class="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
      <!-- 1. Stock Summary / Low Stock / Out of Stock View -->
      <table
        v-if="activeReport === 'stock_summary' || activeReport === 'low_stock' || activeReport === 'out_of_stock'"
        class="w-full text-xs"
      >
        <thead>
          <tr class="border-b border-border bg-muted/40 text-muted-foreground">
            <th class="py-2.5 px-3 text-left font-medium">Product / SKU</th>
            <th class="py-2.5 px-3 text-left font-medium">Barcode</th>
            <th class="py-2.5 px-3 text-right font-medium">Current Stock</th>
            <th class="py-2.5 px-3 text-right font-medium">Min Threshold</th>
            <th class="py-2.5 px-3 text-right font-medium">Cost Value</th>
            <th class="py-2.5 px-3 text-right font-medium">Retail Value</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border/60">
          <tr
            v-for="p in (activeReport === 'low_stock' ? lowStockProducts : activeReport === 'out_of_stock' ? outOfStockProducts : products)"
            :key="p.id"
            class="hover:bg-muted/20 transition-colors"
          >
            <td class="py-2.5 px-3">
              <div class="font-semibold text-foreground">{{ p.name }}</div>
              <div class="font-mono text-[10px] text-muted-foreground">{{ p.sku }}</div>
            </td>
            <td class="py-2.5 px-3 font-mono text-muted-foreground">{{ p.barcode }}</td>
            <td
              class="py-2.5 px-3 text-right font-mono tabular-nums font-bold"
              :class="{ 'text-destructive': p.currentStock <= 0, 'text-amber-600 dark:text-amber-400': p.currentStock > 0 && p.currentStock <= p.minStockLevel }"
            >
              {{ p.currentStock }}
            </td>
            <td class="py-2.5 px-3 text-right font-mono tabular-nums text-muted-foreground">{{ p.minStockLevel }}</td>
            <td class="py-2.5 px-3 text-right font-mono tabular-nums">${{ (p.currentStock * p.costPrice).toFixed(2) }}</td>
            <td class="py-2.5 px-3 text-right font-mono tabular-nums font-medium text-foreground">
              ${{ (p.currentStock * p.sellingPrice).toFixed(2) }}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 2. Valuation Breakdown View -->
      <table v-else-if="activeReport === 'valuation'" class="w-full text-xs">
        <thead>
          <tr class="border-b border-border bg-muted/40 text-muted-foreground">
            <th class="py-2.5 px-3 text-left font-medium">Product / SKU</th>
            <th class="py-2.5 px-3 text-right font-medium">Units On Hand</th>
            <th class="py-2.5 px-3 text-right font-medium">Unit Cost</th>
            <th class="py-2.5 px-3 text-right font-medium">Total Cost Basis</th>
            <th class="py-2.5 px-3 text-right font-medium">Unit Retail</th>
            <th class="py-2.5 px-3 text-right font-medium">Total Retail Value</th>
            <th class="py-2.5 px-3 text-right font-medium">Potential Profit</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border/60">
          <tr v-for="p in products" :key="p.id" class="hover:bg-muted/20 transition-colors">
            <td class="py-2.5 px-3 font-medium text-foreground">
              {{ p.name }}
              <div class="font-mono text-[10px] text-muted-foreground">{{ p.sku }}</div>
            </td>
            <td class="py-2.5 px-3 text-right font-mono tabular-nums">{{ p.currentStock }}</td>
            <td class="py-2.5 px-3 text-right font-mono tabular-nums">${{ p.costPrice.toFixed(2) }}</td>
            <td class="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-foreground">
              ${{ (p.currentStock * p.costPrice).toFixed(2) }}
            </td>
            <td class="py-2.5 px-3 text-right font-mono tabular-nums">${{ p.sellingPrice.toFixed(2) }}</td>
            <td class="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
              ${{ (p.currentStock * p.sellingPrice).toFixed(2) }}
            </td>
            <td class="py-2.5 px-3 text-right font-mono tabular-nums font-semibold">
              ${{ (p.currentStock * (p.sellingPrice - p.costPrice)).toFixed(2) }}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 3. Stock In / Stock Out Ledger View -->
      <table v-else class="w-full text-xs">
        <thead>
          <tr class="border-b border-border bg-muted/40 text-muted-foreground">
            <th class="py-2.5 px-3 text-left font-medium">Date & Time</th>
            <th class="py-2.5 px-3 text-left font-medium">Product Name</th>
            <th class="py-2.5 px-3 text-right font-medium">Quantity</th>
            <th class="py-2.5 px-3 text-left font-medium">Ref #</th>
            <th class="py-2.5 px-3 text-left font-medium">{{ activeReport === 'stock_in' ? 'Supplier / Source' : 'Destination' }}</th>
            <th class="py-2.5 px-3 text-left font-medium">User</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border/60">
          <tr
            v-for="t in (activeReport === 'stock_in' ? stockInTransactions : stockOutTransactions)"
            :key="t.id"
            class="hover:bg-muted/20 transition-colors"
          >
            <td class="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">
              {{ t.transactionDate.replace('T', ' ').slice(0, 16) }}
            </td>
            <td class="py-2.5 px-3 font-medium text-foreground">
              {{ productsMap[t.productId]?.name || t.productId.slice(0, 8) }}
            </td>
            <td class="py-2.5 px-3 text-right font-mono tabular-nums font-bold" :class="activeReport === 'stock_in' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'">
              {{ Math.abs(t.quantityChanged) }}
            </td>
            <td class="py-2.5 px-3 font-mono text-[11px]">{{ t.referenceNumber }}</td>
            <td class="py-2.5 px-3 text-muted-foreground">{{ t.destinationOrSupplier }}</td>
            <td class="py-2.5 px-3 text-muted-foreground">{{ t.user }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
