<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  History,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { productRepo, transactionRepo } from '@/repositories'
import { InventoryService } from '@/services/inventory.service'
import { formatPHP } from '@/lib/currency'
import type { Product, InventoryTransaction } from '@/database/core/database.types'

const route = useRoute()
const router = useRouter()

const products = ref<Product[]>([])
const recentAdjustments = ref<InventoryTransaction[]>([])
const isLoading = ref(true)
const isSubmitting = ref(false)

const selectedProductId = ref((route.query.productId as string) || '')
const newStockQuantity = ref(0)
const adjustmentReason = ref('Audit Count Variance')
const referenceNumber = ref(`ADJ-${Date.now().toString().slice(-6)}`)
const remarks = ref('')

const reasons = [
  'Audit Count Variance (Physical vs System)',
  'Damaged / Broken Goods',
  'Expired / Obsolete Stock',
  'Return to Supplier',
  'Internal Testing / Sample Use',
  'Data Entry Correction',
]

const errorMessage = ref('')
const successMessage = ref('')

async function loadData() {
  isLoading.value = true
  try {
    const [prods, allTxs] = await Promise.all([
      productRepo.getAll({ status: 'active' }),
      transactionRepo.getAll({ type: 'adjustment' }),
    ])
    products.value = prods
    recentAdjustments.value = allTxs.slice(0, 10)

    if (selectedProductId.value) {
      const p = prods.find(item => item.id === selectedProductId.value)
      if (p) newStockQuantity.value = p.currentStock
    }
  } catch (err) {
    console.error('Failed to load adjustments data:', err)
  } finally {
    isLoading.value = false
  }
}

const selectedProduct = computed(() => {
  return products.value.find(p => p.id === selectedProductId.value) || null
})

function onProductSelect() {
  if (selectedProduct.value) {
    newStockQuantity.value = selectedProduct.value.currentStock
  }
}

const difference = computed(() => {
  if (!selectedProduct.value) return 0
  return newStockQuantity.value - selectedProduct.value.currentStock
})

async function handleAdjustmentSubmit() {
  errorMessage.value = ''
  successMessage.value = ''

  if (!selectedProductId.value || !selectedProduct.value) {
    errorMessage.value = 'Please select a product to adjust.'
    return
  }

  if (newStockQuantity.value < 0) {
    errorMessage.value = 'New adjusted stock cannot be negative.'
    return
  }

  if (difference.value === 0) {
    errorMessage.value = 'Adjusted quantity equals current stock. No change detected.'
    return
  }

  isSubmitting.value = true

  try {
    const tx = await InventoryService.adjustStock({
      productId: selectedProductId.value,
      newQuantity: newStockQuantity.value,
      reason: adjustmentReason.value,
      referenceNumber: referenceNumber.value.trim(),
      remarks: remarks.value.trim(),
      user: 'Stock Auditor',
    })

    successMessage.value = `Stock successfully reconciled! ${selectedProduct.value.name} adjusted from ${tx.previousStock} to ${tx.newStock} units (${difference.value > 0 ? `+${difference.value}` : difference.value}).`

    await loadData()
    referenceNumber.value = `ADJ-${Date.now().toString().slice(-6)}`
    remarks.value = ''
  } catch (err: any) {
    errorMessage.value = err.message || 'Failed to adjust stock.'
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between border-b pb-4">
      <div>
        <div class="flex items-center gap-2">
          <div class="size-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <SlidersHorizontal class="size-5" />
          </div>
          <h1 class="text-xl font-bold tracking-tight">Stock Adjustments</h1>
        </div>
        <p class="text-xs text-muted-foreground mt-0.5">
          Reconcile physical inventory discrepancies, write off damages, and record audit corrections
        </p>
      </div>
    </div>

    <!-- Feedback messages -->
    <div v-if="successMessage" class="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs">
      <CheckCircle2 class="size-4 shrink-0" />
      <span>{{ successMessage }}</span>
    </div>

    <div v-if="errorMessage" class="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-xs">
      <AlertCircle class="size-4 shrink-0" />
      <span>{{ errorMessage }}</span>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- Adjustment Form (7 cols) -->
      <form @submit.prevent="handleAdjustmentSubmit" class="lg:col-span-7 rounded-lg border border-border bg-card p-5 shadow-xs space-y-4 text-xs">
        <h2 class="text-sm font-semibold border-b pb-2">Record Quantity Reconciliation</h2>

        <!-- Select Product -->
        <div>
          <Label class="text-xs font-semibold">Select Product to Reconcile *</Label>
          <select
            v-model="selectedProductId"
            required
            class="w-full h-9 mt-1 px-2.5 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none"
            @change="onProductSelect"
          >
            <option value="" disabled>-- Choose Product --</option>
            <option v-for="p in products" :key="p.id" :value="p.id">
              {{ p.name }} (Current: {{ p.currentStock }} units &bull; SKU: {{ p.sku }})
            </option>
          </select>
        </div>

        <!-- Discrepancy Calculator Card -->
        <div v-if="selectedProduct" class="p-4 rounded-lg bg-muted/40 border border-border space-y-3">
          <div class="grid grid-cols-3 gap-2 text-center">
            <div class="border-r border-border/80">
              <span class="text-[11px] text-muted-foreground">System Record</span>
              <div class="text-lg font-bold font-mono tabular-nums text-foreground mt-0.5">
                {{ selectedProduct.currentStock }}
              </div>
            </div>

            <div class="border-r border-border/80">
              <span class="text-[11px] text-muted-foreground">Physical Count</span>
              <div class="text-lg font-bold font-mono tabular-nums text-foreground mt-0.5">
                {{ newStockQuantity }}
              </div>
            </div>

            <div>
              <span class="text-[11px] text-muted-foreground">Variance</span>
              <div
                class="text-lg font-bold font-mono tabular-nums mt-0.5"
                :class="difference > 0 ? 'text-emerald-600 dark:text-emerald-400' : difference < 0 ? 'text-destructive' : 'text-muted-foreground'"
              >
                {{ difference > 0 ? `+${difference}` : difference }}
              </div>
              <div v-if="selectedProduct && difference !== 0" class="text-[10px] font-mono text-muted-foreground">
                {{ formatPHP(Math.abs(difference) * selectedProduct.costPrice) }} impact
              </div>
            </div>
          </div>
        </div>

        <!-- Actual Count Input -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label for="new-qty" class="text-xs font-semibold">New Actual Physical Count *</Label>
            <Input
              id="new-qty"
              v-model.number="newStockQuantity"
              type="number"
              min="0"
              required
              class="h-8 mt-1 font-mono text-sm font-bold"
            />
          </div>

          <div>
            <Label for="adj-ref" class="text-xs font-semibold">Audit Ref / Ticket No. *</Label>
            <Input
              id="adj-ref"
              v-model="referenceNumber"
              required
              placeholder="e.g. ADJ-001"
              class="h-8 mt-1 font-mono text-xs"
            />
          </div>
        </div>

        <!-- Reason -->
        <div>
          <Label class="text-xs font-semibold">Adjustment Reason *</Label>
          <select
            v-model="adjustmentReason"
            required
            class="w-full h-8 mt-1 px-2.5 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none"
          >
            <option v-for="r in reasons" :key="r" :value="r">{{ r }}</option>
          </select>
        </div>

        <!-- Remarks -->
        <div>
          <Label for="adj-rem" class="text-xs font-semibold">Audit Justification Notes</Label>
          <textarea
            id="adj-rem"
            v-model="remarks"
            rows="2"
            placeholder="Details of audit, damaged pallet number, supervisor signoff..."
            class="w-full mt-1 p-2 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none"
          ></textarea>
        </div>

        <!-- Submit Button -->
        <div class="flex items-center justify-end gap-3 pt-3 border-t">
          <Button variant="outline" size="sm" type="button" class="h-8 text-xs" @click="router.push('/dashboard')">
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            class="h-8 text-xs cursor-pointer bg-primary text-primary-foreground"
            :disabled="isSubmitting || !selectedProduct || difference === 0"
          >
            <SlidersHorizontal class="size-3.5 mr-1" />
            <span>{{ isSubmitting ? 'Applying Adjustment...' : 'Apply Reconciliation' }}</span>
          </Button>
        </div>
      </form>

      <!-- Recent Adjustments Ledger (5 cols) -->
      <div class="lg:col-span-5 rounded-lg border border-border bg-card p-5 shadow-xs space-y-4">
        <div class="flex items-center justify-between border-b pb-3">
          <h2 class="text-sm font-semibold flex items-center gap-2">
            <History class="size-4 text-primary" />
            Recent Adjustment Audits
          </h2>
          <span class="text-xs text-muted-foreground">{{ recentAdjustments.length }} records</span>
        </div>

        <div v-if="recentAdjustments.length === 0" class="p-8 text-center text-xs text-muted-foreground">
          No inventory reconciliations logged yet.
        </div>

        <div v-else class="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
          <div
            v-for="adj in recentAdjustments"
            :key="adj.id"
            class="p-2.5 rounded-md border border-border bg-muted/20 text-xs space-y-1"
          >
            <div class="flex items-center justify-between">
              <span class="font-mono font-semibold text-foreground">{{ adj.referenceNumber }}</span>
              <span class="font-mono text-[10px] text-muted-foreground">{{ adj.transactionDate.slice(0, 10) }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-muted-foreground">Changed:</span>
              <span
                class="font-mono font-bold"
                :class="adj.quantityChanged > 0 ? 'text-emerald-600' : 'text-destructive'"
              >
                {{ adj.quantityChanged > 0 ? `+${adj.quantityChanged}` : adj.quantityChanged }} units
              </span>
            </div>
            <div class="text-[11px] text-muted-foreground truncate">
              {{ adj.remarks }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
