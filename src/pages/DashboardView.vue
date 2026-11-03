<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import {
  Package,
  Boxes,
  AlertTriangle,
  XCircle,
  DollarSign,
  ArrowDownToLine,
  ArrowUpFromLine,
  ScanLine,
  Plus,
  RefreshCw,
  ExternalLink,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { productRepo, transactionRepo } from '@/repositories'
import { InventoryService } from '@/services/inventory.service'
import type { Product, InventoryTransaction } from '@/database/core/database.types'

const isLoading = ref(true)
const metrics = ref({
  totalProducts: 0,
  totalStockQuantity: 0,
  lowStockCount: 0,
  outOfStockCount: 0,
  totalCostValuation: 0,
  totalRetailValuation: 0,
})

const recentMovements = ref<InventoryTransaction[]>([])
const recentProducts = ref<Product[]>([])
const productsMap = ref<Record<string, Product>>({})

async function loadDashboardData() {
  isLoading.value = true
  try {
    const [dashMetrics, txList, allProds] = await Promise.all([
      InventoryService.getInventoryMetrics(),
      transactionRepo.getAll(),
      productRepo.getAll({ sortBy: 'createdAt', sortDirection: 'desc' }),
    ])

    metrics.value = dashMetrics
    recentMovements.value = txList.slice(0, 7)
    recentProducts.value = allProds.slice(0, 5)

    const map: Record<string, Product> = {}
    allProds.forEach(p => {
      map[p.id] = p
    })
    productsMap.value = map
  } catch (err) {
    console.error('Failed to load dashboard data:', err)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadDashboardData()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Top Greeting & Action Strip -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Inventory Dashboard</h1>
        <p class="text-xs text-muted-foreground">
          Live warehouse stock balance, valuation, and recent movements
        </p>
      </div>
      <div class="flex items-center gap-2">
        <Button variant="outline" size="sm" class="h-8 gap-1.5 cursor-pointer text-xs" @click="loadDashboardData">
          <RefreshCw class="size-3.5" :class="{ 'animate-spin': isLoading }" />
          <span>Refresh</span>
        </Button>
        <Button size="sm" as-child class="h-8 gap-1.5 cursor-pointer text-xs">
          <RouterLink to="/products">
            <Plus class="size-3.5" />
            <span>Manage Products</span>
          </RouterLink>
        </Button>
      </div>
    </div>

    <!-- Metric Cards Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Total Products -->
      <div class="rounded-lg border border-border bg-card p-4 text-card-foreground shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Products</span>
          <div class="flex size-7 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Package class="size-4" />
          </div>
        </div>
        <div class="mt-3">
          <div class="text-2xl font-bold font-mono tabular-nums">{{ metrics.totalProducts }}</div>
          <p class="text-[11px] text-muted-foreground mt-0.5">Active catalog items</p>
        </div>
      </div>

      <!-- Total Stock Quantity -->
      <div class="rounded-lg border border-border bg-card p-4 text-card-foreground shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Units in Stock</span>
          <div class="flex size-7 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Boxes class="size-4" />
          </div>
        </div>
        <div class="mt-3">
          <div class="text-2xl font-bold font-mono tabular-nums">{{ metrics.totalStockQuantity }}</div>
          <p class="text-[11px] text-muted-foreground mt-0.5">Physical items on hand</p>
        </div>
      </div>

      <!-- Low Stock Alerts -->
      <div class="rounded-lg border border-border bg-card p-4 text-card-foreground shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-muted-foreground uppercase tracking-wider">Low Stock Items</span>
          <div class="flex size-7 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertTriangle class="size-4" />
          </div>
        </div>
        <div class="mt-3">
          <div class="text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
            {{ metrics.lowStockCount }}
          </div>
          <p class="text-[11px] text-muted-foreground mt-0.5">At or below reorder threshold</p>
        </div>
      </div>

      <!-- Out of Stock Alerts -->
      <div class="rounded-lg border border-border bg-card p-4 text-card-foreground shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-muted-foreground uppercase tracking-wider">Out of Stock</span>
          <div class="flex size-7 items-center justify-center rounded-md bg-destructive/10 text-destructive">
            <XCircle class="size-4" />
          </div>
        </div>
        <div class="mt-3">
          <div class="text-2xl font-bold font-mono tabular-nums text-destructive">
            {{ metrics.outOfStockCount }}
          </div>
          <p class="text-[11px] text-muted-foreground mt-0.5">Requires immediate replenishment</p>
        </div>
      </div>
    </div>

    <!-- Valuation Breakdown Banner -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="flex items-center justify-between rounded-lg border border-border bg-card p-4 shadow-xs">
        <div class="flex items-center gap-3">
          <div class="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <DollarSign class="size-5" />
          </div>
          <div>
            <div class="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Inventory Cost Value</div>
            <div class="text-xl font-bold font-mono tabular-nums text-foreground mt-0.5">
              ${{ metrics.totalCostValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
            </div>
          </div>
        </div>
        <span class="text-xs text-muted-foreground">Asset base</span>
      </div>

      <div class="flex items-center justify-between rounded-lg border border-border bg-card p-4 shadow-xs">
        <div class="flex items-center gap-3">
          <div class="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <DollarSign class="size-5" />
          </div>
          <div>
            <div class="text-xs font-medium text-muted-foreground uppercase tracking-wider">Estimated Retail Value</div>
            <div class="text-xl font-bold font-mono tabular-nums text-foreground mt-0.5">
              ${{ metrics.totalRetailValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
            </div>
          </div>
        </div>
        <span class="text-xs text-muted-foreground">Potential revenue</span>
      </div>
    </div>

    <!-- Quick Workflow Launcher -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <RouterLink
        to="/barcode-scanner"
        class="flex items-center gap-3 p-3.5 rounded-lg border border-border bg-card hover:bg-accent/40 transition-colors shadow-xs group"
      >
        <div class="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          <ScanLine class="size-4" />
        </div>
        <div class="flex-1 truncate">
          <div class="text-xs font-semibold text-foreground">Launch Barcode Scanner</div>
          <div class="text-[11px] text-muted-foreground">USB wedge or camera scanning</div>
        </div>
        <ExternalLink class="size-3.5 text-muted-foreground" />
      </RouterLink>

      <RouterLink
        to="/stock-in"
        class="flex items-center gap-3 p-3.5 rounded-lg border border-border bg-card hover:bg-accent/40 transition-colors shadow-xs group"
      >
        <div class="flex size-9 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
          <ArrowDownToLine class="size-4" />
        </div>
        <div class="flex-1 truncate">
          <div class="text-xs font-semibold text-foreground">Receive Stock (Stock In)</div>
          <div class="text-[11px] text-muted-foreground">Log intake with PO reference</div>
        </div>
        <ExternalLink class="size-3.5 text-muted-foreground" />
      </RouterLink>

      <RouterLink
        to="/stock-out"
        class="flex items-center gap-3 p-3.5 rounded-lg border border-border bg-card hover:bg-accent/40 transition-colors shadow-xs group"
      >
        <div class="flex size-9 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition-colors">
          <ArrowUpFromLine class="size-4" />
        </div>
        <div class="flex-1 truncate">
          <div class="text-xs font-semibold text-foreground">Dispatch Stock (Stock Out)</div>
          <div class="text-[11px] text-muted-foreground">Fulfill orders & department orders</div>
        </div>
        <ExternalLink class="size-3.5 text-muted-foreground" />
      </RouterLink>
    </div>

    <!-- Data Tables Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Recent Stock Movements -->
      <div class="rounded-lg border border-border bg-card shadow-xs">
        <div class="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 class="text-sm font-semibold">Recent Stock Movements</h2>
            <p class="text-[11px] text-muted-foreground">Latest transactions across all items</p>
          </div>
          <Button variant="ghost" size="sm" as-child class="h-7 text-xs">
            <RouterLink to="/inventory-history">View All</RouterLink>
          </Button>
        </div>

        <div v-if="recentMovements.length === 0" class="p-8 text-center text-xs text-muted-foreground">
          No stock movements recorded yet. Receive or dispatch inventory to populate this audit trail.
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead>
              <tr class="border-b border-border bg-muted/30 text-muted-foreground">
                <th class="py-2.5 px-3 text-left font-medium">Type</th>
                <th class="py-2.5 px-3 text-left font-medium">Product</th>
                <th class="py-2.5 px-3 text-right font-medium">Qty</th>
                <th class="py-2.5 px-3 text-right font-medium">Balance</th>
                <th class="py-2.5 px-3 text-right font-medium">Time</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border/60">
              <tr v-for="tx in recentMovements" :key="tx.id" class="hover:bg-muted/20 transition-colors">
                <td class="py-2 px-3">
                  <span
                    class="font-mono uppercase font-semibold text-[10px]"
                    :class="{
                      'text-emerald-600 dark:text-emerald-400': tx.type === 'stock_in',
                      'text-amber-600 dark:text-amber-400': tx.type === 'stock_out',
                      'text-blue-600 dark:text-blue-400': tx.type === 'adjustment',
                    }"
                  >
                    {{ tx.type.replace('_', ' ') }}
                  </span>
                </td>
                <td class="py-2 px-3 max-w-[160px] truncate">
                  <span class="font-medium text-foreground">
                    {{ productsMap[tx.productId]?.name || 'Product ID: ' + tx.productId.slice(0, 6) }}
                  </span>
                </td>
                <td class="py-2 px-3 text-right font-mono tabular-nums font-semibold" :class="tx.quantityChanged > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'">
                  {{ tx.quantityChanged > 0 ? `+${tx.quantityChanged}` : tx.quantityChanged }}
                </td>
                <td class="py-2 px-3 text-right font-mono tabular-nums text-muted-foreground">
                  {{ tx.newStock }}
                </td>
                <td class="py-2 px-3 text-right text-muted-foreground">
                  {{ tx.transactionDate.slice(11, 16) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Recently Added Products -->
      <div class="rounded-lg border border-border bg-card shadow-xs">
        <div class="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 class="text-sm font-semibold">Catalog Highlights</h2>
            <p class="text-[11px] text-muted-foreground">Recently registered items</p>
          </div>
          <Button variant="ghost" size="sm" as-child class="h-7 text-xs">
            <RouterLink to="/products">All Products</RouterLink>
          </Button>
        </div>

        <div v-if="recentProducts.length === 0" class="p-8 text-center text-xs text-muted-foreground">
          No products in catalog yet. Click "Manage Products" to create your first item.
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead>
              <tr class="border-b border-border bg-muted/30 text-muted-foreground">
                <th class="py-2.5 px-3 text-left font-medium">Product / SKU</th>
                <th class="py-2.5 px-3 text-left font-medium">Barcode</th>
                <th class="py-2.5 px-3 text-right font-medium">Stock</th>
                <th class="py-2.5 px-3 text-right font-medium">Price</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border/60">
              <tr v-for="prod in recentProducts" :key="prod.id" class="hover:bg-muted/20 transition-colors">
                <td class="py-2 px-3">
                  <RouterLink :to="`/products/${prod.id}`" class="font-medium text-foreground hover:underline">
                    {{ prod.name }}
                  </RouterLink>
                  <div class="text-[10px] font-mono text-muted-foreground">{{ prod.sku }}</div>
                </td>
                <td class="py-2 px-3 font-mono text-[11px] text-muted-foreground">
                  {{ prod.barcode }}
                </td>
                <td class="py-2 px-3 text-right font-mono tabular-nums font-semibold" :class="{ 'text-destructive': prod.currentStock <= 0, 'text-amber-600 dark:text-amber-400': prod.currentStock > 0 && prod.currentStock <= prod.minStockLevel }">
                  {{ prod.currentStock }}
                </td>
                <td class="py-2 px-3 text-right font-mono tabular-nums font-medium text-foreground">
                  ${{ prod.sellingPrice.toFixed(2) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
