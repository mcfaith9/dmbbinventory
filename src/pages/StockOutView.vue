<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowUpFromLine,
  Barcode as BarcodeIcon,
  CheckCircle2,
  AlertCircle,
  ScanLine,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { productRepo } from '@/repositories'
import { InventoryService } from '@/services/inventory.service'
import type { Product } from '@/database/core/database.types'

const route = useRoute()
const router = useRouter()

const products = ref<Product[]>([])
const isLoading = ref(true)
const isSubmitting = ref(false)

const barcodeSearch = ref('')
const selectedProductId = ref((route.query.productId as string) || '')
const quantity = ref(1)
const destination = ref('Fulfillment / Outbound')
const referenceNumber = ref(`DSP-${Date.now().toString().slice(-6)}`)
const remarks = ref('')
const transactionDate = ref(new Date().toISOString().slice(0, 16))

const errorMessage = ref('')
const successMessage = ref('')

async function loadData() {
  isLoading.value = true
  try {
    const prods = await productRepo.getAll({ status: 'active' })
    products.value = prods
  } catch (err) {
    console.error('Failed to load stock out data:', err)
  } finally {
    isLoading.value = false
  }
}

const selectedProduct = computed(() => {
  return products.value.find(p => p.id === selectedProductId.value) || null
})

async function handleBarcodeScanLookup() {
  if (!barcodeSearch.value.trim()) return
  const q = barcodeSearch.value.trim()
  const found = products.value.find(p => p.barcode === q || p.sku.toLowerCase() === q.toLowerCase())
  if (found) {
    selectedProductId.value = found.id
    barcodeSearch.value = ''
    errorMessage.value = ''
  } else {
    errorMessage.value = `No product found matching "${q}".`
  }
}

async function handleStockOutSubmit() {
  errorMessage.value = ''
  successMessage.value = ''

  if (!selectedProductId.value || !selectedProduct.value) {
    errorMessage.value = 'Please select a product to dispatch.'
    return
  }

  if (quantity.value <= 0) {
    errorMessage.value = 'Dispatched quantity must be greater than zero.'
    return
  }

  if (quantity.value > selectedProduct.value.currentStock) {
    errorMessage.value = `Insufficient stock! Maximum available: ${selectedProduct.value.currentStock} units.`
    return
  }

  isSubmitting.value = true

  try {
    const tx = await InventoryService.stockOut({
      productId: selectedProductId.value,
      quantity: quantity.value,
      destination: destination.value.trim() || 'General Dispatch',
      referenceNumber: referenceNumber.value.trim(),
      remarks: remarks.value.trim(),
      transactionDate: new Date(transactionDate.value).toISOString(),
      user: 'Inventory Dispatch Clerk',
    })

    successMessage.value = `Stock Out confirmed! Dispatched ${Math.abs(tx.quantityChanged)} units from ${selectedProduct.value?.name}. Remaining balance: ${tx.newStock} units.`

    // Refresh products
    await loadData()

    // Reset fields
    quantity.value = 1
    referenceNumber.value = `DSP-${Date.now().toString().slice(-6)}`
    remarks.value = ''
  } catch (err: any) {
    errorMessage.value = err.message || 'Failed to complete stock out.'
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
          <div class="size-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <ArrowUpFromLine class="size-5" />
          </div>
          <h1 class="text-xl font-bold tracking-tight">Stock Out (Dispatch)</h1>
        </div>
        <p class="text-xs text-muted-foreground mt-0.5">
          Release inventory for sales orders, department requisitions, or shipping
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
      <Label for="barcode-find-out" class="text-xs font-semibold flex items-center gap-1.5">
        <BarcodeIcon class="size-3.5 text-primary" />
        Quick Find via Barcode Scanner
      </Label>
      <div class="flex gap-2">
        <Input
          id="barcode-find-out"
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

    <!-- Stock Out Form -->
    <form @submit.prevent="handleStockOutSubmit" class="rounded-lg border border-border bg-card p-5 shadow-xs space-y-4 text-xs">
      <!-- Select Product -->
      <div>
        <Label class="text-xs font-semibold">Select Product *</Label>
        <select
          v-model="selectedProductId"
          required
          class="w-full h-9 mt-1 px-2.5 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="" disabled>-- Choose Product to Dispatch --</option>
          <option v-for="p in products" :key="p.id" :value="p.id" :disabled="p.currentStock <= 0">
            {{ p.name }} (Stock: {{ p.currentStock }} {{ p.currentStock <= 0 ? '- OUT OF STOCK' : '' }})
          </option>
        </select>
      </div>

      <!-- Current Stock preview banner -->
      <div v-if="selectedProduct" class="p-3 rounded-md bg-muted/40 border border-border flex items-center justify-between">
        <div>
          <div class="font-semibold text-foreground">{{ selectedProduct.name }}</div>
          <div class="font-mono text-[11px] text-muted-foreground">
            SKU: {{ selectedProduct.sku }} &bull; Barcode: {{ selectedProduct.barcode }}
          </div>
        </div>
        <div class="text-right">
          <div class="text-xs text-muted-foreground">Available Stock:</div>
          <div
            class="text-lg font-bold font-mono"
            :class="selectedProduct.currentStock <= 0 ? 'text-destructive' : 'text-foreground'"
          >
            {{ selectedProduct.currentStock }} units
          </div>
        </div>
      </div>

      <!-- Quantity & Date -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label for="stock-out-qty" class="text-xs font-semibold">Quantity to Release *</Label>
          <Input
            id="stock-out-qty"
            v-model.number="quantity"
            type="number"
            min="1"
            :max="selectedProduct ? selectedProduct.currentStock : undefined"
            required
            class="h-8 mt-1 font-mono text-sm font-bold"
          />
          <p v-if="selectedProduct && quantity > selectedProduct.currentStock" class="text-[10px] text-destructive mt-0.5">
            Exceeds available balance ({{ selectedProduct.currentStock }})
          </p>
        </div>

        <div>
          <Label for="stock-out-date" class="text-xs font-semibold">Transaction Date & Time</Label>
          <Input
            id="stock-out-date"
            v-model="transactionDate"
            type="datetime-local"
            class="h-8 mt-1 font-mono text-xs"
          />
        </div>
      </div>

      <!-- Destination & Reference Number -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label for="stock-out-dest" class="text-xs font-semibold">Destination / Department *</Label>
          <Input
            id="stock-out-dest"
            v-model="destination"
            placeholder="e.g. Retail Storefront, Production Line B, Shipping..."
            class="h-8 mt-1 text-xs"
            required
          />
        </div>

        <div>
          <Label for="stock-out-ref" class="text-xs font-semibold">Dispatch Slip / Order Ref *</Label>
          <Input
            id="stock-out-ref"
            v-model="referenceNumber"
            required
            placeholder="e.g. SO-2026-4401"
            class="h-8 mt-1 font-mono text-xs"
          />
        </div>
      </div>

      <!-- Remarks -->
      <div>
        <Label for="stock-out-rem" class="text-xs font-semibold">Remarks / Reason</Label>
        <textarea
          id="stock-out-rem"
          v-model="remarks"
          rows="2"
          placeholder="Client name, order number, courier tracking..."
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
          class="h-8 text-xs cursor-pointer bg-amber-600 hover:bg-amber-700 text-white"
          :disabled="isSubmitting || !selectedProduct || selectedProduct.currentStock <= 0 || quantity > selectedProduct.currentStock"
        >
          <ArrowUpFromLine class="size-3.5 mr-1" />
          <span>{{ isSubmitting ? 'Processing...' : 'Authorize Dispatch' }}</span>
        </Button>
      </div>
    </form>
  </div>
</template>
