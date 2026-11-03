<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowDownToLine,
  Barcode as BarcodeIcon,
  CheckCircle2,
  AlertCircle,
  ScanLine,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { productRepo, supplierRepo } from '@/repositories'
import { InventoryService } from '@/services/inventory.service'
import { formatPHP } from '@/lib/currency'
import type { Product, Supplier } from '@/database/core/database.types'

const route = useRoute()
const router = useRouter()

const products = ref<Product[]>([])
const suppliers = ref<Supplier[]>([])
const isLoading = ref(true)
const isSubmitting = ref(false)

const barcodeSearch = ref('')
const selectedProductId = ref((route.query.productId as string) || '')
const quantity = ref(1)
const selectedSupplier = ref('')
const referenceNumber = ref(`PO-${Date.now().toString().slice(-6)}`)
const remarks = ref('')
const transactionDate = ref(new Date().toISOString().slice(0, 16))

const errorMessage = ref('')
const successMessage = ref('')

async function loadData() {
  isLoading.value = true
  try {
    const [prods, sups] = await Promise.all([
      productRepo.getAll({ status: 'active' }),
      supplierRepo.getAll(),
    ])
    products.value = prods
    suppliers.value = sups

    if (selectedProductId.value) {
      const p = prods.find(item => item.id === selectedProductId.value)
      if (p && p.supplierId) {
        const sup = sups.find(s => s.id === p.supplierId)
        if (sup) selectedSupplier.value = sup.name
      }
    }
  } catch (err) {
    console.error('Failed to load stock in data:', err)
  } finally {
    isLoading.value = false
  }
}

const selectedProduct = computed(() => {
  return products.value.find(p => p.id === selectedProductId.value) || null
})

function onProductSelect() {
  if (selectedProduct.value && selectedProduct.value.supplierId) {
    const sup = suppliers.value.find(s => s.id === selectedProduct.value?.supplierId)
    if (sup) selectedSupplier.value = sup.name
  }
}

async function handleBarcodeScanLookup() {
  if (!barcodeSearch.value.trim()) return
  const q = barcodeSearch.value.trim()
  const found = products.value.find(p => p.barcode === q || p.sku.toLowerCase() === q.toLowerCase())
  if (found) {
    selectedProductId.value = found.id
    onProductSelect()
    barcodeSearch.value = ''
    errorMessage.value = ''
  } else {
    errorMessage.value = `No product found matching "${q}".`
  }
}

async function handleStockInSubmit() {
  errorMessage.value = ''
  successMessage.value = ''

  if (!selectedProductId.value) {
    errorMessage.value = 'Please select a product to receive.'
    return
  }

  if (quantity.value <= 0) {
    errorMessage.value = 'Received quantity must be greater than zero.'
    return
  }

  isSubmitting.value = true

  try {
    const tx = await InventoryService.stockIn({
      productId: selectedProductId.value,
      quantity: quantity.value,
      supplier: selectedSupplier.value.trim() || 'General Receiving',
      referenceNumber: referenceNumber.value.trim(),
      remarks: remarks.value.trim(),
      transactionDate: new Date(transactionDate.value).toISOString(),
      user: 'Inventory Receiving Clerk',
    })

    successMessage.value = `Stock In complete! Added ${tx.quantityChanged} units to ${selectedProduct.value?.name}. New balance: ${tx.newStock} units.`

    // Refresh products
    await loadData()

    // Reset fields
    quantity.value = 1
    referenceNumber.value = `PO-${Date.now().toString().slice(-6)}`
    remarks.value = ''
  } catch (err: any) {
    errorMessage.value = err.message || 'Failed to complete stock in.'
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <div class="flex items-center justify-between border-b pb-4">
      <div>
        <div class="flex items-center gap-2">
          <div class="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <ArrowDownToLine class="size-5" />
          </div>
          <h1 class="text-xl font-bold tracking-tight">Stock In (Receiving)</h1>
        </div>
        <p class="text-xs text-muted-foreground mt-0.5">
          Record incoming goods from suppliers or purchase orders into warehouse inventory
        </p>
      </div>

      <Button variant="outline" size="sm" as-child class="h-8 gap-1.5 text-xs">
        <RouterLink to="/barcode-scanner">
          <ScanLine class="size-3.5" />
          <span>Open Barcode Scanner</span>
        </RouterLink>
      </Button>
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

    <!-- Quick Barcode Finder -->
    <div class="rounded-lg border border-border bg-card p-4 shadow-xs space-y-2">
      <Label for="barcode-find" class="text-xs font-semibold flex items-center gap-1.5">
        <BarcodeIcon class="size-3.5 text-primary" />
        Quick Find via Barcode Scanner
      </Label>
      <div class="flex gap-2">
        <Input
          id="barcode-find"
          v-model="barcodeSearch"
          placeholder="Scan barcode or type SKU..."
          class="h-8 font-mono text-xs"
          @keydown.enter.prevent="handleBarcodeScanLookup"
        />
        <Button size="sm" class="h-8 text-xs cursor-pointer" @click="handleBarcodeScanLookup">
          Find Product
        </Button>
      </div>
    </div>

    <!-- Stock In Form -->
    <form @submit.prevent="handleStockInSubmit" class="rounded-lg border border-border bg-card p-5 shadow-xs space-y-4 text-xs">
      <!-- Select Product -->
      <div>
        <Label class="text-xs font-semibold">Select Product *</Label>
        <select
          v-model="selectedProductId"
          required
          class="w-full h-9 mt-1 px-2.5 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          @change="onProductSelect"
        >
          <option value="" disabled>-- Choose Product from Catalog --</option>
          <option v-for="p in products" :key="p.id" :value="p.id">
            {{ p.name }} (SKU: {{ p.sku }} &bull; Current Stock: {{ p.currentStock }})
          </option>
        </select>
      </div>

      <!-- Current Stock preview banner -->
      <div v-if="selectedProduct" class="p-3 rounded-md bg-muted/40 border border-border flex items-center justify-between">
        <div>
          <div class="font-semibold text-foreground">{{ selectedProduct.name }}</div>
          <div class="font-mono text-[11px] text-muted-foreground">
            SKU: {{ selectedProduct.sku }} &bull; Barcode: {{ selectedProduct.barcode }} &bull; Unit Cost: {{ formatPHP(selectedProduct.costPrice) }}
          </div>
        </div>
        <div class="text-right">
          <div class="text-xs text-muted-foreground">Current Balance:</div>
          <div class="text-lg font-bold font-mono text-foreground">{{ selectedProduct.currentStock }} units</div>
          <div v-if="quantity > 0" class="text-[11px] text-muted-foreground font-mono">
            Intake Value: <span class="font-semibold text-emerald-600 dark:text-emerald-400">{{ formatPHP(selectedProduct.costPrice * quantity) }}</span>
          </div>
        </div>
      </div>

      <!-- Quantity & Date -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label for="stock-qty" class="text-xs font-semibold">Quantity Received *</Label>
          <Input
            id="stock-qty"
            v-model.number="quantity"
            type="number"
            min="1"
            required
            class="h-8 mt-1 font-mono text-sm font-bold"
          />
        </div>

        <div>
          <Label for="stock-date" class="text-xs font-semibold">Transaction Date & Time</Label>
          <Input
            id="stock-date"
            v-model="transactionDate"
            type="datetime-local"
            class="h-8 mt-1 font-mono text-xs"
          />
        </div>
      </div>

      <!-- Supplier & Reference Number -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label for="stock-sup" class="text-xs font-semibold">Supplier / Source</Label>
          <Input
            id="stock-sup"
            v-model="selectedSupplier"
            placeholder="e.g. Acme Wholesale Ltd."
            class="h-8 mt-1 text-xs"
          />
        </div>

        <div>
          <Label for="stock-ref" class="text-xs font-semibold">PO / Invoice Reference *</Label>
          <Input
            id="stock-ref"
            v-model="referenceNumber"
            required
            placeholder="e.g. PO-2026-901"
            class="h-8 mt-1 font-mono text-xs"
          />
        </div>
      </div>

      <!-- Remarks -->
      <div>
        <Label for="stock-rem" class="text-xs font-semibold">Remarks / Receiving Notes</Label>
        <textarea
          id="stock-rem"
          v-model="remarks"
          rows="2"
          placeholder="Delivery condition, pallet number, inspection notes..."
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
          class="h-8 text-xs cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white"
          :disabled="isSubmitting"
        >
          <ArrowDownToLine class="size-3.5 mr-1" />
          <span>{{ isSubmitting ? 'Processing...' : 'Confirm Stock Intake' }}</span>
        </Button>
      </div>
    </form>
  </div>
</template>
