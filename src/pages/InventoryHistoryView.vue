<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  History,
  Search,
  Download,
  RefreshCw,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { transactionRepo, productRepo } from '@/repositories'
import { ReportService } from '@/services/report.service'
import type { InventoryTransaction, Product, TransactionType } from '@/database/core/database.types'

const transactions = ref<InventoryTransaction[]>([])
const products = ref<Product[]>([])
const productsMap = ref<Record<string, Product>>({})
const isLoading = ref(true)

// Filters
const search = ref('')
const typeFilter = ref<TransactionType | 'all'>('all')
const productFilter = ref('all')
const startDate = ref('')
const endDate = ref('')

// Pagination
const currentPage = ref(1)
const pageSize = ref(15)

async function loadData() {
  isLoading.value = true
  try {
    const [txList, prodList] = await Promise.all([
      transactionRepo.getAll({
        search: search.value,
        type: typeFilter.value,
        productId: productFilter.value,
        startDate: startDate.value ? new Date(startDate.value).toISOString() : undefined,
        endDate: endDate.value ? new Date(endDate.value + 'T23:59:59').toISOString() : undefined,
      }),
      productRepo.getAll(),
    ])

    transactions.value = txList
    products.value = prodList

    const map: Record<string, Product> = {}
    prodList.forEach(p => (map[p.id] = p))
    productsMap.value = map
  } catch (err) {
    console.error('Failed to load transaction history:', err)
  } finally {
    isLoading.value = false
  }
}

const totalPages = computed(() => Math.ceil(transactions.value.length / pageSize.value) || 1)
const paginatedTransactions = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return transactions.value.slice(start, start + pageSize.value)
})

function exportHistoryCsv() {
  ReportService.exportTransactionsCsv(transactions.value, productsMap.value)
}

function clearFilters() {
  search.value = ''
  typeFilter.value = 'all'
  productFilter.value = 'all'
  startDate.value = ''
  endDate.value = ''
  currentPage.value = 1
  loadData()
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Inventory Movement History</h1>
        <p class="text-xs text-muted-foreground">
          Complete immutable audit ledger of all stock intakes, releases, and physical adjustments
        </p>
      </div>

      <div class="flex items-center gap-2">
        <Button variant="outline" size="sm" class="h-8 gap-1.5 text-xs cursor-pointer" @click="loadData">
          <RefreshCw class="size-3.5" :class="{ 'animate-spin': isLoading }" />
          <span>Refresh</span>
        </Button>
        <Button
          size="sm"
          class="h-8 gap-1.5 text-xs cursor-pointer"
          :disabled="transactions.length === 0"
          @click="exportHistoryCsv"
        >
          <Download class="size-3.5" />
          <span>Export CSV</span>
        </Button>
      </div>
    </div>

    <!-- Filter Strip -->
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 p-3 rounded-lg border border-border bg-card shadow-xs text-xs">
      <!-- Search Input -->
      <div class="relative">
        <Search class="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
        <Input
          v-model="search"
          placeholder="Ref no, destination, remarks..."
          class="h-8 pl-8 text-xs"
          @input="loadData"
        />
      </div>

      <!-- Transaction Type Filter -->
      <div>
        <select
          v-model="typeFilter"
          class="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none"
          @change="loadData"
        >
          <option value="all">All Movement Types</option>
          <option value="stock_in">Stock In (Intake)</option>
          <option value="stock_out">Stock Out (Dispatch)</option>
          <option value="adjustment">Stock Adjustment</option>
        </select>
      </div>

      <!-- Product Filter -->
      <div>
        <select
          v-model="productFilter"
          class="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none"
          @change="loadData"
        >
          <option value="all">All Products</option>
          <option v-for="p in products" :key="p.id" :value="p.id">
            {{ p.name }}
          </option>
        </select>
      </div>

      <!-- Start Date -->
      <div>
        <Input
          v-model="startDate"
          type="date"
          class="h-8 text-xs font-mono"
          placeholder="Start date"
          @change="loadData"
        />
      </div>

      <!-- End Date -->
      <div>
        <Input
          v-model="endDate"
          type="date"
          class="h-8 text-xs font-mono"
          placeholder="End date"
          @change="loadData"
        />
      </div>
    </div>

    <!-- Data Table -->
    <div class="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
      <div v-if="isLoading" class="p-12 text-center text-xs text-muted-foreground">
        <RefreshCw class="size-5 animate-spin mx-auto mb-2 text-primary" />
        Loading transaction ledger...
      </div>

      <div v-else-if="transactions.length === 0" class="p-12 text-center text-xs text-muted-foreground space-y-2">
        <History class="size-8 mx-auto text-muted-foreground/40" />
        <p class="font-medium text-foreground">No transactions found</p>
        <p class="text-[11px]">No inventory movements match the selected filters.</p>
        <Button variant="outline" size="sm" class="h-7 text-xs" @click="clearFilters">
          Clear Filters
        </Button>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="border-b border-border bg-muted/40 text-muted-foreground">
              <th class="py-2.5 px-3 text-left font-medium">Type</th>
              <th class="py-2.5 px-3 text-left font-medium">Date & Time</th>
              <th class="py-2.5 px-3 text-left font-medium">Product / SKU</th>
              <th class="py-2.5 px-3 text-right font-medium">Qty Change</th>
              <th class="py-2.5 px-3 text-right font-medium">Previous</th>
              <th class="py-2.5 px-3 text-right font-medium">Resulting Stock</th>
              <th class="py-2.5 px-3 text-left font-medium">Reference</th>
              <th class="py-2.5 px-3 text-left font-medium">Source / Destination</th>
              <th class="py-2.5 px-3 text-left font-medium">User</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border/60">
            <tr v-for="t in paginatedTransactions" :key="t.id" class="hover:bg-muted/20 transition-colors">
              <!-- Type -->
              <td class="py-2.5 px-3">
                <span
                  class="font-mono text-[10px] uppercase font-bold px-1.5 py-0.5 rounded"
                  :class="{
                    'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400': t.type === 'stock_in',
                    'bg-amber-500/15 text-amber-600 dark:text-amber-400': t.type === 'stock_out',
                    'bg-blue-500/15 text-blue-600 dark:text-blue-400': t.type === 'adjustment',
                  }"
                >
                  {{ t.type.replace('_', ' ') }}
                </span>
              </td>

              <!-- Date -->
              <td class="py-2.5 px-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                {{ t.transactionDate.replace('T', ' ').slice(0, 16) }}
              </td>

              <!-- Product -->
              <td class="py-2.5 px-3">
                <div class="font-medium text-foreground">
                  {{ productsMap[t.productId]?.name || 'Unknown Item' }}
                </div>
                <div class="font-mono text-[10px] text-muted-foreground">
                  SKU: {{ productsMap[t.productId]?.sku || '-' }}
                </div>
              </td>

              <!-- Quantity Changed -->
              <td
                class="py-2.5 px-3 text-right font-mono tabular-nums font-bold"
                :class="t.quantityChanged > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'"
              >
                {{ t.quantityChanged > 0 ? `+${t.quantityChanged}` : t.quantityChanged }}
              </td>

              <!-- Previous Stock -->
              <td class="py-2.5 px-3 text-right font-mono tabular-nums text-muted-foreground">
                {{ t.previousStock }}
              </td>

              <!-- New Stock -->
              <td class="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-foreground">
                {{ t.newStock }}
              </td>

              <!-- Reference -->
              <td class="py-2.5 px-3 font-mono text-[11px] text-foreground font-medium">
                {{ t.referenceNumber }}
              </td>

              <!-- Source / Destination -->
              <td class="py-2.5 px-3 text-muted-foreground max-w-[160px] truncate" :title="t.destinationOrSupplier">
                {{ t.destinationOrSupplier }}
              </td>

              <!-- User -->
              <td class="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                {{ t.user }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="flex items-center justify-between p-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
        <div>
          Showing {{ paginatedTransactions.length }} of {{ transactions.length }} entries
        </div>
        <div class="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            class="h-7 px-2.5 text-xs"
            :disabled="currentPage <= 1"
            @click="currentPage--"
          >
            Previous
          </Button>
          <span class="px-2 font-mono tabular-nums">
            {{ currentPage }} / {{ totalPages }}
          </span>
          <Button
            variant="outline"
            size="sm"
            class="h-7 px-2.5 text-xs"
            :disabled="currentPage >= totalPages"
            @click="currentPage++"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
