<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import {
  Plus,
  Search,
  Package,
  Barcode,
  Printer,
  Edit,
  Trash2,
  RefreshCw,
  Eye,
  CheckSquare,
  Square,
  Sparkles,
  AlertCircle,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  productRepo,
  categoryRepo,
  brandRepo,
  unitRepo,
  supplierRepo,
} from '@/repositories'
import { BarcodeService } from '@/services/barcode.service'
import { formatPHP } from '@/lib/currency'
import BarcodePrintSheet, { type PrintableLabelItem } from '@/components/BarcodePrintSheet.vue'
import type {
  Product,
  Category,
  Brand,
  UnitOfMeasurement,
  Supplier,
  BarcodeFormat,
} from '@/database/core/database.types'

const products = ref<Product[]>([])
const categories = ref<Category[]>([])
const brands = ref<Brand[]>([])
const units = ref<UnitOfMeasurement[]>([])
const suppliers = ref<Supplier[]>([])
const isLoading = ref(true)

// Filters & Search
const search = ref('')
const categoryFilter = ref('all')
const stockFilter = ref<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all')
const sortBy = ref<'name' | 'sku' | 'currentStock' | 'createdAt'>('createdAt')
const sortDirection = ref<'asc' | 'desc'>('desc')

// Pagination
const currentPage = ref(1)
const pageSize = ref(10)

// Multi-select for barcode printing
const selectedProductIds = ref<Set<string>>(new Set())
const showPrintModal = ref(false)
const printLabelSize = ref<'compact' | 'standard' | 'large'>('standard')

// Add/Edit Product Modal State
const isModalOpen = ref(false)
const isEditing = ref(false)
const formError = ref('')
const currentEditingId = ref('')

const form = ref({
  name: '',
  sku: '',
  barcode: '',
  barcodeFormat: 'CODE128' as BarcodeFormat,
  categoryId: '',
  brandId: '',
  unitId: '',
  supplierId: '',
  description: '',
  costPrice: 0,
  sellingPrice: 0,
  currentStock: 0,
  minStockLevel: 5,
  status: 'active' as 'active' | 'archived',
  image: '',
})

async function loadData() {
  isLoading.value = true
  try {
    const [prods, cats, brs, unts, sups] = await Promise.all([
      productRepo.getAll({
        search: search.value,
        categoryId: categoryFilter.value,
        stockStatus: stockFilter.value,
        sortBy: sortBy.value,
        sortDirection: sortDirection.value,
      }),
      categoryRepo.getAll(),
      brandRepo.getAll(),
      unitRepo.getAll(),
      supplierRepo.getAll(),
    ])
    products.value = prods
    categories.value = cats
    brands.value = brs
    units.value = unts
    suppliers.value = sups
  } catch (err) {
    console.error('Failed to load products:', err)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadData()
})

// Filtered & Paginated list
const totalPages = computed(() => Math.ceil(products.value.length / pageSize.value) || 1)
const paginatedProducts = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return products.value.slice(start, start + pageSize.value)
})

// Lookup helpers
const categoryMap = computed(() => {
  const map: Record<string, string> = {}
  categories.value.forEach(c => (map[c.id] = c.name))
  return map
})

const unitMap = computed(() => {
  const map: Record<string, string> = {}
  units.value.forEach(u => (map[u.id] = u.abbreviation))
  return map
})

// Select/Deselect
function toggleSelectAll() {
  if (selectedProductIds.value.size === paginatedProducts.value.length) {
    selectedProductIds.value.clear()
  } else {
    selectedProductIds.value = new Set(paginatedProducts.value.map(p => p.id))
  }
}

function toggleSelect(id: string) {
  if (selectedProductIds.value.has(id)) {
    selectedProductIds.value.delete(id)
  } else {
    selectedProductIds.value.add(id)
  }
}

const printItems = computed<PrintableLabelItem[]>(() => {
  return products.value
    .filter(p => selectedProductIds.value.has(p.id))
    .map(p => ({ product: p, copies: 1 }))
})

// Form Actions
function openCreateModal() {
  isEditing.value = false
  currentEditingId.value = ''
  formError.value = ''
  form.value = {
    name: '',
    sku: BarcodeService.generateSku('ITM', 'INV'),
    barcode: BarcodeService.generateBarcodeNumber('CODE128'),
    barcodeFormat: 'CODE128',
    categoryId: categories.value[0]?.id || '',
    brandId: brands.value[0]?.id || '',
    unitId: units.value[0]?.id || '',
    supplierId: suppliers.value[0]?.id || '',
    description: '',
    costPrice: 0,
    sellingPrice: 0,
    currentStock: 0,
    minStockLevel: 5,
    status: 'active',
    image: '',
  }
  isModalOpen.value = true
}

function openEditModal(prod: Product) {
  isEditing.value = true
  currentEditingId.value = prod.id
  formError.value = ''
  form.value = {
    name: prod.name,
    sku: prod.sku,
    barcode: prod.barcode,
    barcodeFormat: prod.barcodeFormat || 'CODE128',
    categoryId: prod.categoryId || '',
    brandId: prod.brandId || '',
    unitId: prod.unitId || '',
    supplierId: prod.supplierId || '',
    description: prod.description || '',
    costPrice: prod.costPrice,
    sellingPrice: prod.sellingPrice,
    currentStock: prod.currentStock,
    minStockLevel: prod.minStockLevel,
    status: prod.status,
    image: prod.image || '',
  }
  isModalOpen.value = true
}

function autoGenerateSku() {
  form.value.sku = BarcodeService.generateSku(form.value.name, 'INV')
}

function autoGenerateBarcode() {
  form.value.barcode = BarcodeService.generateBarcodeNumber(form.value.barcodeFormat)
}

function onBarcodeFormatChange() {
  if (form.value.barcodeFormat === 'EAN13' && !BarcodeService.isValidBarcode(form.value.barcode, 'EAN13')) {
    autoGenerateBarcode()
  }
}

async function handleSaveProduct() {
  formError.value = ''

  if (!form.value.name.trim()) {
    formError.value = 'Product name is required.'
    return
  }
  if (!form.value.sku.trim()) {
    formError.value = 'Product SKU is required.'
    return
  }
  if (!form.value.barcode.trim()) {
    formError.value = 'Product barcode is required.'
    return
  }

  // Validate EAN-13 if chosen
  if (form.value.barcodeFormat === 'EAN13' && !BarcodeService.isValidBarcode(form.value.barcode, 'EAN13')) {
    formError.value = 'Invalid EAN-13 format. Must be 13 digits with valid checksum.'
    return
  }

  try {
    if (isEditing.value) {
      await productRepo.update(currentEditingId.value, {
        name: form.value.name.trim(),
        sku: form.value.sku.trim(),
        barcode: form.value.barcode.trim(),
        barcodeFormat: form.value.barcodeFormat,
        categoryId: form.value.categoryId || undefined,
        brandId: form.value.brandId || undefined,
        unitId: form.value.unitId || undefined,
        supplierId: form.value.supplierId || undefined,
        description: form.value.description.trim() || undefined,
        costPrice: Number(form.value.costPrice),
        sellingPrice: Number(form.value.sellingPrice),
        currentStock: Number(form.value.currentStock),
        minStockLevel: Number(form.value.minStockLevel),
        status: form.value.status,
        image: form.value.image || undefined,
      })
    } else {
      await productRepo.create({
        name: form.value.name.trim(),
        sku: form.value.sku.trim(),
        barcode: form.value.barcode.trim(),
        barcodeFormat: form.value.barcodeFormat,
        categoryId: form.value.categoryId || undefined,
        brandId: form.value.brandId || undefined,
        unitId: form.value.unitId || undefined,
        supplierId: form.value.supplierId || undefined,
        description: form.value.description.trim() || undefined,
        costPrice: Number(form.value.costPrice),
        sellingPrice: Number(form.value.sellingPrice),
        currentStock: Number(form.value.currentStock),
        minStockLevel: Number(form.value.minStockLevel),
        status: form.value.status,
        image: form.value.image || undefined,
        deletedAt: null,
        lastSyncedAt: null,
      })
    }

    isModalOpen.value = false
    await loadData()
  } catch (err: any) {
    formError.value = err.message || 'Failed to save product.'
  }
}

async function handleDeleteProduct(id: string, name: string) {
  if (confirm(`Are you sure you want to delete "${name}"? This product will be archived.`)) {
    try {
      await productRepo.delete(id)
      selectedProductIds.value.delete(id)
      await loadData()
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header Controls -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Product Catalog</h1>
        <p class="text-xs text-muted-foreground">
          Manage inventory items, barcodes, SKUs, and stock thresholds
        </p>
      </div>
      <div class="flex items-center gap-2">
        <Button
          v-if="selectedProductIds.size > 0"
          variant="secondary"
          size="sm"
          class="h-8 gap-1.5 cursor-pointer text-xs"
          @click="showPrintModal = true"
        >
          <Printer class="size-3.5" />
          <span>Print Barcodes ({{ selectedProductIds.size }})</span>
        </Button>

        <Button size="sm" class="h-8 gap-1.5 cursor-pointer text-xs" @click="openCreateModal">
          <Plus class="size-3.5" />
          <span>Add Product</span>
        </Button>
      </div>
    </div>

    <!-- Search & Filter Strip -->
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 p-3 rounded-lg border border-border bg-card shadow-xs">
      <!-- Search Input -->
      <div class="relative">
        <Search class="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
        <Input
          v-model="search"
          placeholder="Search by name, SKU, barcode..."
          class="h-8 pl-8 text-xs"
          @input="loadData"
        />
      </div>

      <!-- Category Filter -->
      <div>
        <select
          v-model="categoryFilter"
          class="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          @change="loadData"
        >
          <option value="all">All Categories</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </option>
        </select>
      </div>

      <!-- Stock Status Filter -->
      <div>
        <select
          v-model="stockFilter"
          class="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          @change="loadData"
        >
          <option value="all">All Stock Levels</option>
          <option value="in_stock">In Stock (Normal)</option>
          <option value="low_stock">Low Stock (Reorder)</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>
      </div>

      <!-- Sort Filter -->
      <div>
        <select
          v-model="sortBy"
          class="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          @change="loadData"
        >
          <option value="createdAt">Sort: Date Added</option>
          <option value="name">Sort: Product Name</option>
          <option value="sku">Sort: SKU</option>
          <option value="currentStock">Sort: Stock Quantity</option>
        </select>
      </div>
    </div>

    <!-- Printable Barcodes Overlay / Modal -->
    <div v-if="showPrintModal" class="rounded-lg border border-border bg-card p-4 shadow-sm space-y-4">
      <div class="flex items-center justify-between border-b pb-2">
        <div class="flex items-center gap-2">
          <Printer class="size-4 text-primary" />
          <h2 class="text-sm font-semibold">Bulk Barcode Printing</h2>
        </div>
        <div class="flex items-center gap-3">
          <label class="text-xs text-muted-foreground flex items-center gap-1.5">
            Label Size:
            <select v-model="printLabelSize" class="h-7 text-xs border rounded px-1.5 bg-background">
              <option value="compact">Compact (30x20mm)</option>
              <option value="standard">Standard (50x30mm)</option>
              <option value="large">Shipping (100x50mm)</option>
            </select>
          </label>
        </div>
      </div>
      <BarcodePrintSheet
        :items="printItems"
        :label-size="printLabelSize"
        @close="showPrintModal = false"
      />
    </div>

    <!-- Products Data Table -->
    <div class="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
      <div v-if="isLoading" class="p-12 text-center text-xs text-muted-foreground">
        <RefreshCw class="size-5 animate-spin mx-auto mb-2 text-muted-foreground" />
        Loading product records...
      </div>

      <div v-else-if="products.length === 0" class="p-12 text-center text-xs text-muted-foreground">
        <Package class="size-8 mx-auto mb-3 text-muted-foreground/50" />
        <p class="font-medium text-foreground">No products found</p>
        <p class="text-[11px] mt-1">Add your first product or adjust search criteria</p>
        <Button size="sm" class="mt-4 h-8 gap-1.5 text-xs cursor-pointer" @click="openCreateModal">
          <Plus class="size-3.5" />
          <span>Add Product</span>
        </Button>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="border-b border-border bg-muted/40 text-muted-foreground">
              <th class="py-2.5 px-3 text-left w-8">
                <button type="button" @click="toggleSelectAll" class="cursor-pointer text-muted-foreground hover:text-foreground">
                  <CheckSquare v-if="selectedProductIds.size === paginatedProducts.length && paginatedProducts.length > 0" class="size-4" />
                  <Square v-else class="size-4" />
                </button>
              </th>
              <th class="py-2.5 px-3 text-left font-medium">Product Name & SKU</th>
              <th class="py-2.5 px-3 text-left font-medium">Barcode</th>
              <th class="py-2.5 px-3 text-left font-medium">Category</th>
              <th class="py-2.5 px-3 text-right font-medium">Current Stock</th>
              <th class="py-2.5 px-3 text-right font-medium">Cost / Retail</th>
              <th class="py-2.5 px-3 text-center font-medium">Status</th>
              <th class="py-2.5 px-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border/60">
            <tr
              v-for="p in paginatedProducts"
              :key="p.id"
              class="hover:bg-muted/20 transition-colors"
              :class="{ 'bg-primary/5': selectedProductIds.has(p.id) }"
            >
              <td class="py-2.5 px-3">
                <button type="button" @click="toggleSelect(p.id)" class="cursor-pointer text-muted-foreground hover:text-foreground">
                  <CheckSquare v-if="selectedProductIds.has(p.id)" class="size-4 text-primary" />
                  <Square v-else class="size-4" />
                </button>
              </td>

              <!-- Product Name & SKU -->
              <td class="py-2.5 px-3">
                <div class="flex items-center gap-2">
                  <div class="size-7 shrink-0 rounded bg-secondary flex items-center justify-center text-secondary-foreground font-mono text-[10px] uppercase font-bold">
                    {{ p.name.slice(0, 2) }}
                  </div>
                  <div>
                    <RouterLink :to="`/products/${p.id}`" class="font-medium text-foreground hover:underline">
                      {{ p.name }}
                    </RouterLink>
                    <div class="font-mono text-[10px] text-muted-foreground">
                      SKU: {{ p.sku }}
                    </div>
                  </div>
                </div>
              </td>

              <!-- Barcode -->
              <td class="py-2.5 px-3">
                <div class="font-mono text-xs text-foreground font-medium flex items-center gap-1.5">
                  <Barcode class="size-3.5 text-muted-foreground" />
                  <span>{{ p.barcode }}</span>
                </div>
                <div class="text-[9px] uppercase font-mono text-muted-foreground">
                  {{ p.barcodeFormat }}
                </div>
              </td>

              <!-- Category -->
              <td class="py-2.5 px-3 text-muted-foreground">
                {{ categoryMap[p.categoryId || ''] || 'Uncategorized' }}
              </td>

              <!-- Current Stock with Status Indicator -->
              <td class="py-2.5 px-3 text-right">
                <div class="font-mono tabular-nums font-semibold" :class="{ 'text-destructive': p.currentStock <= 0, 'text-amber-600 dark:text-amber-400': p.currentStock > 0 && p.currentStock <= p.minStockLevel }">
                  {{ p.currentStock }} {{ unitMap[p.unitId || ''] || '' }}
                </div>
                <div class="text-[10px] text-muted-foreground">
                  Min: {{ p.minStockLevel }}
                </div>
              </td>

              <!-- Cost / Retail Price -->
              <td class="py-2.5 px-3 text-right font-mono tabular-nums">
                <div class="font-semibold text-foreground">{{ formatPHP(p.sellingPrice) }}</div>
                <div class="text-[10px] text-muted-foreground">Cost: {{ formatPHP(p.costPrice) }}</div>
              </td>

              <!-- Status -->
              <td class="py-2.5 px-3 text-center">
                <span
                  class="font-mono text-[10px] uppercase font-medium"
                  :class="p.status === 'active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'"
                >
                  {{ p.status }}
                </span>
              </td>

              <!-- Actions -->
              <td class="py-2.5 px-3 text-right">
                <div class="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="sm" as-child class="size-7 p-0" title="View Details">
                    <RouterLink :to="`/products/${p.id}`">
                      <Eye class="size-3.5 text-muted-foreground" />
                    </RouterLink>
                  </Button>
                  <Button variant="ghost" size="sm" class="size-7 p-0 cursor-pointer" title="Edit" @click="openEditModal(p)">
                    <Edit class="size-3.5 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="sm" class="size-7 p-0 cursor-pointer text-destructive" title="Archive / Delete" @click="handleDeleteProduct(p.id, p.name)">
                    <Trash2 class="size-3.5" />
                  </Button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <div class="flex items-center justify-between p-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
        <div>
          Showing {{ paginatedProducts.length }} of {{ products.length }} items
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

    <!-- Add / Edit Product Modal -->
    <div
      v-if="isModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto"
    >
      <div class="w-full max-w-xl rounded-lg border border-border bg-card p-6 shadow-xl space-y-4 my-8">
        <div class="flex items-center justify-between border-b pb-3">
          <div>
            <h2 class="text-base font-bold">
              {{ isEditing ? 'Edit Product' : 'Add New Product' }}
            </h2>
            <p class="text-xs text-muted-foreground">
              Define product identification, barcode format, prices, and thresholds
            </p>
          </div>
          <Button variant="ghost" size="sm" class="size-8 p-0" @click="isModalOpen = false">
            &times;
          </Button>
        </div>

        <div v-if="formError" class="flex items-center gap-2 p-2.5 rounded bg-destructive/10 text-destructive text-xs">
          <AlertCircle class="size-4 shrink-0" />
          <span>{{ formError }}</span>
        </div>

        <form @submit.prevent="handleSaveProduct" class="space-y-4 text-xs">
          <!-- Name -->
          <div>
            <Label for="prod-name" class="text-xs font-semibold">Product Name *</Label>
            <Input id="prod-name" v-model="form.name" required class="h-8 mt-1 text-xs" placeholder="e.g. Wireless Laser Barcode Scanner" />
          </div>

          <!-- SKU & Barcode Generation Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <!-- SKU -->
            <div>
              <div class="flex items-center justify-between">
                <Label for="prod-sku" class="text-xs font-semibold">SKU (Unique) *</Label>
                <button type="button" @click="autoGenerateSku" class="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                  <Sparkles class="size-3" /> Auto
                </button>
              </div>
              <Input id="prod-sku" v-model="form.sku" required class="h-8 mt-1 font-mono text-xs" placeholder="e.g. WBS-24G-01" />
            </div>

            <!-- Barcode Format -->
            <div>
              <Label class="text-xs font-semibold">Barcode Symbology</Label>
              <select
                v-model="form.barcodeFormat"
                class="w-full h-8 mt-1 px-2.5 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none"
                @change="onBarcodeFormatChange"
              >
                <option value="CODE128">Code 128 (Standard Warehouse Alphanumeric)</option>
                <option value="EAN13">EAN-13 (13-Digit Retail Numerical)</option>
              </select>
            </div>
          </div>

          <!-- Barcode Number -->
          <div>
            <div class="flex items-center justify-between">
              <Label for="prod-barcode" class="text-xs font-semibold">Barcode Number *</Label>
              <button type="button" @click="autoGenerateBarcode" class="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                <Sparkles class="size-3" /> Generate Valid Barcode
              </button>
            </div>
            <Input id="prod-barcode" v-model="form.barcode" required class="h-8 mt-1 font-mono text-xs" placeholder="Barcode value" />
            <p class="text-[10px] text-muted-foreground mt-0.5">
              {{ form.barcodeFormat === 'EAN13' ? 'Requires 13 digits with calculated modulo-10 checksum.' : 'Supports alphanumeric characters.' }}
            </p>
          </div>

          <!-- Category, Unit, Supplier -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label class="text-xs font-semibold">Category</Label>
              <select v-model="form.categoryId" class="w-full h-8 mt-1 px-2 rounded-md border border-input bg-background text-xs">
                <option value="">None / Unassigned</option>
                <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>

            <div>
              <Label class="text-xs font-semibold">Unit of Measure</Label>
              <select v-model="form.unitId" class="w-full h-8 mt-1 px-2 rounded-md border border-input bg-background text-xs">
                <option value="">None</option>
                <option v-for="u in units" :key="u.id" :value="u.id">{{ u.name }} ({{ u.abbreviation }})</option>
              </select>
            </div>

            <div>
              <Label class="text-xs font-semibold">Supplier</Label>
              <select v-model="form.supplierId" class="w-full h-8 mt-1 px-2 rounded-md border border-input bg-background text-xs">
                <option value="">None</option>
                <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </div>
          </div>

          <!-- Pricing & Stock Thresholds -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <Label class="text-xs font-semibold">Cost Price (₱)</Label>
              <Input v-model.number="form.costPrice" type="number" step="0.01" min="0" class="h-8 mt-1 text-xs font-mono" />
            </div>

            <div>
              <Label class="text-xs font-semibold">Selling Price (₱)</Label>
              <Input v-model.number="form.sellingPrice" type="number" step="0.01" min="0" class="h-8 mt-1 text-xs font-mono" />
            </div>

            <div>
              <Label class="text-xs font-semibold">Current Stock</Label>
              <Input v-model.number="form.currentStock" type="number" min="0" class="h-8 mt-1 text-xs font-mono" />
            </div>

            <div>
              <Label class="text-xs font-semibold">Min Stock Level</Label>
              <Input v-model.number="form.minStockLevel" type="number" min="0" class="h-8 mt-1 text-xs font-mono" />
            </div>
          </div>

          <!-- Description -->
          <div>
            <Label for="prod-desc" class="text-xs font-semibold">Description / Notes</Label>
            <textarea
              id="prod-desc"
              v-model="form.description"
              rows="2"
              class="w-full mt-1 p-2 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none"
              placeholder="Specifications, warehouse aisle / bin location..."
            ></textarea>
          </div>

          <div class="flex items-center justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" size="sm" class="h-8 text-xs" @click="isModalOpen = false">
              Cancel
            </Button>
            <Button type="submit" size="sm" class="h-8 text-xs cursor-pointer">
              {{ isEditing ? 'Save Changes' : 'Create Product' }}
            </Button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
