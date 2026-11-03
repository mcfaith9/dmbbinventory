<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import {
  ScanLine,
  Camera,
  Keyboard,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  AlertCircle,
  Package,
  RefreshCw,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Html5Qrcode } from 'html5-qrcode'
import { productRepo } from '@/repositories'
import { InventoryService } from '@/services/inventory.service'
import type { Product } from '@/database/core/database.types'

// Mode
const scanMode = ref<'usb' | 'camera'>('usb')

// USB Keyboard Scanner State
const manualInput = ref('')
const scanBuffer = ref('')
const lastKeyTime = ref(0)
const usbStatus = ref<'ready' | 'received'>('ready')

// Camera Scanner State
let html5QrCode: Html5Qrcode | null = null
const isCameraActive = ref(false)
const cameraError = ref('')

// Scanned Product & Feedback
const scannedProduct = ref<Product | null>(null)
const scanError = ref('')
const isSearching = ref(false)
const lastScannedBarcode = ref('')

// Stock In / Out Quick Action Modal
const quickActionModal = ref<'in' | 'out' | null>(null)
const actionQuantity = ref(1)
const actionRef = ref('')
const actionParty = ref('')
const actionRemarks = ref('')
const isActionLoading = ref(false)
const actionSuccessMessage = ref('')

// Audio beep feedback
function playBeep(success: boolean = true) {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(success ? 880 : 300, audioCtx.currentTime)
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime)
    osc.start()
    osc.stop(audioCtx.currentTime + (success ? 0.12 : 0.25))
  } catch {
    // Audio context may be restricted by browser policy
  }
}

// Global Keydown Listener for USB Hardware Wedge Barcode Scanners
function handleGlobalKeydown(e: KeyboardEvent) {
  // If user is focused on an action input modal, don't capture as USB scanner
  if (quickActionModal.value) return

  const now = Date.now()
  const char = e.key

  // Scanners fire rapid keys (<50ms between keystrokes)
  if (now - lastKeyTime.value > 100) {
    scanBuffer.value = ''
  }
  lastKeyTime.value = now

  if (char === 'Enter') {
    if (scanBuffer.value.length >= 3) {
      e.preventDefault()
      processBarcodeLookup(scanBuffer.value)
      scanBuffer.value = ''
      usbStatus.value = 'received'
      setTimeout(() => {
        usbStatus.value = 'ready'
      }, 1000)
    }
  } else if (char.length === 1) {
    scanBuffer.value += char
  }
}

async function processBarcodeLookup(barcode: string) {
  const cleanBarcode = barcode.trim()
  if (!cleanBarcode) return

  isSearching.value = true
  scanError.value = ''
  lastScannedBarcode.value = cleanBarcode

  try {
    // Lookup by barcode or SKU
    let product = await productRepo.getByBarcode(cleanBarcode)
    if (!product) {
      product = await productRepo.getBySku(cleanBarcode)
    }

    if (product) {
      scannedProduct.value = product
      playBeep(true)
    } else {
      scannedProduct.value = null
      scanError.value = `No registered product found for barcode "${cleanBarcode}".`
      playBeep(false)
    }
  } catch (err: any) {
    scanError.value = err.message || 'Error looking up barcode.'
    scannedProduct.value = null
    playBeep(false)
  } finally {
    isSearching.value = false
  }
}

function handleManualSearch() {
  if (manualInput.value.trim()) {
    processBarcodeLookup(manualInput.value)
    manualInput.value = ''
  }
}

// Camera Scanner Implementation
async function startCamera() {
  cameraError.value = ''
  try {
    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode('camera-reader-viewport')
    }

    await html5QrCode.start(
      { facingMode: 'environment' },
      {
        fps: 15,
        qrbox: { width: 280, height: 180 },
        aspectRatio: 1.777778,
      },
      (decodedText) => {
        // Prevent repeated scans of the same barcode within 2 seconds
        if (decodedText !== lastScannedBarcode.value || !scannedProduct.value) {
          processBarcodeLookup(decodedText)
        }
      },
      () => {
        // scan error ignored
      }
    )
    isCameraActive.value = true
  } catch (err: any) {
    cameraError.value = err?.message || 'Unable to access camera. Please check camera permissions.'
    isCameraActive.value = false
  }
}

async function stopCamera() {
  if (html5QrCode && isCameraActive.value) {
    try {
      await html5QrCode.stop()
      isCameraActive.value = false
    } catch {
      // ignore
    }
  }
}

function setScanMode(mode: 'usb' | 'camera') {
  scanMode.value = mode
  if (mode === 'camera') {
    nextTick(() => startCamera())
  } else {
    stopCamera()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
  stopCamera()
})

// Quick Stock In / Out Handlers
function openQuickAction(type: 'in' | 'out') {
  if (!scannedProduct.value) return
  quickActionModal.value = type
  actionQuantity.value = 1
  actionRef.value = `${type === 'in' ? 'RCV' : 'DSP'}-${Date.now().toString().slice(-6)}`
  actionParty.value = type === 'in' ? 'Warehouse Dock' : 'Store Dispatch'
  actionRemarks.value = 'Fast barcode scanner transaction'
  actionSuccessMessage.value = ''
}

async function executeQuickAction() {
  if (!scannedProduct.value) return
  isActionLoading.value = true
  actionSuccessMessage.value = ''

  try {
    if (quickActionModal.value === 'in') {
      await InventoryService.stockIn({
        productId: scannedProduct.value.id,
        quantity: actionQuantity.value,
        supplier: actionParty.value,
        referenceNumber: actionRef.value,
        remarks: actionRemarks.value,
        user: 'Scanner Operator',
      })
      actionSuccessMessage.value = `Successfully received +${actionQuantity.value} units.`
    } else {
      await InventoryService.stockOut({
        productId: scannedProduct.value.id,
        quantity: actionQuantity.value,
        destination: actionParty.value,
        referenceNumber: actionRef.value,
        remarks: actionRemarks.value,
        user: 'Scanner Operator',
      })
      actionSuccessMessage.value = `Successfully dispatched -${actionQuantity.value} units.`
    }

    // Refresh current product
    const updated = await productRepo.getById(scannedProduct.value.id)
    if (updated) scannedProduct.value = updated
    playBeep(true)

    setTimeout(() => {
      quickActionModal.value = null
      actionSuccessMessage.value = ''
    }, 1500)
  } catch (err: any) {
    alert(err.message || 'Transaction failed.')
  } finally {
    isActionLoading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Barcode Scanner</h1>
        <p class="text-xs text-muted-foreground">
          Scan product barcodes with physical USB laser scanners or your device camera
        </p>
      </div>

      <!-- Mode Selector -->
      <div class="flex items-center gap-1 p-1 bg-muted rounded-lg border border-border">
        <button
          type="button"
          class="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer"
          :class="scanMode === 'usb' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'"
          @click="setScanMode('usb')"
        >
          <Keyboard class="size-3.5" />
          <span>USB / Keyboard Scanner</span>
        </button>

        <button
          type="button"
          class="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer"
          :class="scanMode === 'camera' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'"
          @click="setScanMode('camera')"
        >
          <Camera class="size-3.5" />
          <span>Camera Scanner</span>
        </button>
      </div>
    </div>

    <!-- SCANNER VIEWPORT & INPUT SECTION -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- Input Panel (5 cols) -->
      <div class="lg:col-span-5 rounded-lg border border-border bg-card p-5 shadow-xs space-y-4">
        <!-- USB Hardware Mode -->
        <div v-if="scanMode === 'usb'" class="space-y-4">
          <div class="flex items-center justify-between border-b pb-3">
            <h2 class="text-sm font-semibold flex items-center gap-2">
              <Keyboard class="size-4 text-primary" />
              Hardware USB Wedge Listener
            </h2>
            <span
              class="font-mono text-[10px] uppercase font-semibold px-2 py-0.5 rounded"
              :class="usbStatus === 'received' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-muted text-muted-foreground'"
            >
              {{ usbStatus === 'received' ? 'Scanned!' : 'Listening...' }}
            </span>
          </div>

          <div class="rounded-lg border border-dashed border-border bg-muted/30 p-5 text-center space-y-2">
            <ScanLine class="size-10 mx-auto text-primary animate-pulse" />
            <p class="text-xs font-semibold text-foreground">
              Ready for USB / Bluetooth Laser Gun
            </p>
            <p class="text-[11px] text-muted-foreground max-w-xs mx-auto">
              Aim your handheld barcode gun at any product barcode. The scanner automatically detects barcodes terminating with the Enter key.
            </p>
          </div>

          <!-- Manual / Testing Input Field -->
          <div class="pt-2">
            <Label for="manual-scan" class="text-xs font-semibold">Or Type / Paste Barcode Manually</Label>
            <div class="flex gap-2 mt-1">
              <Input
                id="manual-scan"
                v-model="manualInput"
                placeholder="Scan or enter barcode / SKU..."
                class="h-8 font-mono text-xs"
                @keydown.enter.prevent="handleManualSearch"
              />
              <Button size="sm" class="h-8 text-xs cursor-pointer" @click="handleManualSearch">
                Lookup
              </Button>
            </div>
          </div>
        </div>

        <!-- Camera Scanner Mode -->
        <div v-else class="space-y-4">
          <div class="flex items-center justify-between border-b pb-3">
            <h2 class="text-sm font-semibold flex items-center gap-2">
              <Camera class="size-4 text-primary" />
              Camera Viewfinder
            </h2>
            <Button
              variant="outline"
              size="sm"
              class="h-7 text-xs"
              @click="isCameraActive ? stopCamera() : startCamera()"
            >
              {{ isCameraActive ? 'Stop Camera' : 'Start Camera' }}
            </Button>
          </div>

          <!-- Video Viewport Container -->
          <div class="relative rounded-lg overflow-hidden border border-border bg-black min-h-[240px] flex items-center justify-center">
            <div id="camera-reader-viewport" class="w-full"></div>
            <div v-if="!isCameraActive && !cameraError" class="text-center text-xs text-neutral-400 p-4">
              <Camera class="size-8 mx-auto mb-2 text-neutral-500" />
              <p>Camera is currently paused.</p>
              <Button size="sm" class="mt-2 h-7 text-xs cursor-pointer" @click="startCamera">
                Activate Camera
              </Button>
            </div>
            <div v-if="cameraError" class="text-center text-xs text-destructive p-4">
              <AlertCircle class="size-6 mx-auto mb-1 text-destructive" />
              <p>{{ cameraError }}</p>
            </div>
          </div>
          <p class="text-[11px] text-muted-foreground text-center">
            Center the barcode inside the framing box for auto-detection
          </p>
        </div>
      </div>

      <!-- Result & Quick Actions Panel (7 cols) -->
      <div class="lg:col-span-7 rounded-lg border border-border bg-card p-5 shadow-xs flex flex-col justify-between space-y-4">
        <div>
          <div class="flex items-center justify-between border-b pb-3">
            <h2 class="text-sm font-semibold flex items-center gap-2">
              <Package class="size-4 text-primary" />
              Scan Result
            </h2>
            <span v-if="lastScannedBarcode" class="font-mono text-xs text-muted-foreground">
              Last Code: {{ lastScannedBarcode }}
            </span>
          </div>

          <!-- Searching State -->
          <div v-if="isSearching" class="p-12 text-center text-xs text-muted-foreground">
            <RefreshCw class="size-6 animate-spin mx-auto mb-2 text-primary" />
            Searching database...
          </div>

          <!-- Error / Unregistered State -->
          <div v-else-if="scanError" class="p-8 text-center space-y-3">
            <div class="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <AlertCircle class="size-6" />
            </div>
            <div>
              <p class="text-xs font-semibold text-destructive">{{ scanError }}</p>
              <p class="text-[11px] text-muted-foreground mt-1">
                You can register this barcode to a new product.
              </p>
            </div>
            <Button size="sm" as-child class="h-8 text-xs">
              <RouterLink to="/products">
                Register New Product
              </RouterLink>
            </Button>
          </div>

          <!-- Empty State (Waiting for scan) -->
          <div v-else-if="!scannedProduct" class="p-12 text-center text-xs text-muted-foreground">
            <ScanLine class="size-10 mx-auto mb-2 text-muted-foreground/40" />
            <p class="font-medium text-foreground">Waiting for barcode scan...</p>
            <p class="text-[11px] mt-1">Scan a product barcode using your USB scanner or camera.</p>
          </div>

          <!-- Found Product Card -->
          <div v-else class="space-y-4 pt-2">
            <div class="flex items-start justify-between">
              <div>
                <span class="font-mono text-[10px] text-primary font-bold uppercase tracking-wider">
                  MATCH CONFIRMED
                </span>
                <h3 class="text-lg font-bold text-foreground mt-0.5">
                  {{ scannedProduct.name }}
                </h3>
                <div class="flex items-center gap-3 text-xs text-muted-foreground font-mono mt-1">
                  <span>SKU: {{ scannedProduct.sku }}</span>
                  <span>&bull;</span>
                  <span>Barcode: {{ scannedProduct.barcode }}</span>
                </div>
              </div>

              <!-- Stock Quantity Badge -->
              <div class="text-right">
                <div class="text-2xl font-bold font-mono tabular-nums text-foreground">
                  {{ scannedProduct.currentStock }}
                </div>
                <div class="text-[11px] text-muted-foreground">
                  In Stock (Min: {{ scannedProduct.minStockLevel }})
                </div>
              </div>
            </div>

            <!-- Pricing & Specification Strip -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-muted/40 text-xs">
              <div>
                <span class="text-muted-foreground text-[10px]">Selling Price</span>
                <div class="font-mono font-bold text-sm text-foreground">
                  ${{ scannedProduct.sellingPrice.toFixed(2) }}
                </div>
              </div>
              <div>
                <span class="text-muted-foreground text-[10px]">Cost Price</span>
                <div class="font-mono font-bold text-sm text-foreground">
                  ${{ scannedProduct.costPrice.toFixed(2) }}
                </div>
              </div>
              <div>
                <span class="text-muted-foreground text-[10px]">Symbology</span>
                <div class="font-mono font-medium text-xs text-foreground uppercase">
                  {{ scannedProduct.barcodeFormat }}
                </div>
              </div>
              <div>
                <span class="text-muted-foreground text-[10px]">Status</span>
                <div class="font-medium text-xs text-emerald-600 dark:text-emerald-400 capitalize">
                  {{ scannedProduct.status }}
                </div>
              </div>
            </div>

            <div v-if="scannedProduct.description" class="text-xs text-muted-foreground">
              {{ scannedProduct.description }}
            </div>
          </div>
        </div>

        <!-- Quick Operation Actions -->
        <div v-if="scannedProduct" class="pt-3 border-t space-y-2">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <!-- Stock In Button -->
            <Button
              size="sm"
              class="h-9 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
              @click="openQuickAction('in')"
            >
              <ArrowDownToLine class="size-4" />
              <span>Stock In (Receive)</span>
            </Button>

            <!-- Stock Out Button -->
            <Button
              size="sm"
              class="h-9 gap-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
              :disabled="scannedProduct.currentStock <= 0"
              @click="openQuickAction('out')"
            >
              <ArrowUpFromLine class="size-4" />
              <span>Stock Out (Dispatch)</span>
            </Button>

            <!-- View Product Details Button -->
            <Button variant="outline" size="sm" as-child class="h-9 gap-1.5 text-xs">
              <RouterLink :to="`/products/${scannedProduct.id}`">
                <span>Full Details</span>
              </RouterLink>
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Action Modal (Stock In / Stock Out from Scanner) -->
    <div
      v-if="quickActionModal && scannedProduct"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
    >
      <div class="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl space-y-4">
        <div class="flex items-center justify-between border-b pb-3">
          <div class="flex items-center gap-2">
            <component
              :is="quickActionModal === 'in' ? ArrowDownToLine : ArrowUpFromLine"
              class="size-5"
              :class="quickActionModal === 'in' ? 'text-emerald-600' : 'text-amber-600'"
            />
            <h2 class="text-base font-bold">
              {{ quickActionModal === 'in' ? 'Quick Stock In' : 'Quick Stock Out' }}
            </h2>
          </div>
          <button type="button" class="text-muted-foreground hover:text-foreground text-lg" @click="quickActionModal = null">
            &times;
          </button>
        </div>

        <div v-if="actionSuccessMessage" class="flex items-center gap-2 p-2.5 rounded bg-emerald-500/10 text-emerald-600 text-xs">
          <CheckCircle2 class="size-4 shrink-0" />
          <span>{{ actionSuccessMessage }}</span>
        </div>

        <div class="text-xs text-muted-foreground font-mono">
          Product: <span class="text-foreground font-semibold">{{ scannedProduct.name }}</span> (Available: {{ scannedProduct.currentStock }})
        </div>

        <form @submit.prevent="executeQuickAction" class="space-y-3 text-xs">
          <div>
            <Label for="action-qty" class="text-xs font-semibold">
              {{ quickActionModal === 'in' ? 'Quantity Received *' : 'Quantity Dispatched *' }}
            </Label>
            <Input
              id="action-qty"
              v-model.number="actionQuantity"
              type="number"
              min="1"
              :max="quickActionModal === 'out' ? scannedProduct.currentStock : undefined"
              required
              class="h-8 mt-1 font-mono text-sm font-bold"
            />
          </div>

          <div>
            <Label for="action-party" class="text-xs font-semibold">
              {{ quickActionModal === 'in' ? 'Supplier / Source' : 'Destination / Department' }}
            </Label>
            <Input id="action-party" v-model="actionParty" class="h-8 mt-1 text-xs" />
          </div>

          <div>
            <Label for="action-ref" class="text-xs font-semibold">Reference / PO / Slip No.</Label>
            <Input id="action-ref" v-model="actionRef" class="h-8 mt-1 font-mono text-xs" />
          </div>

          <div>
            <Label for="action-remarks" class="text-xs font-semibold">Remarks</Label>
            <Input id="action-remarks" v-model="actionRemarks" class="h-8 mt-1 text-xs" />
          </div>

          <div class="flex items-center justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" size="sm" class="h-8 text-xs" @click="quickActionModal = null">
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              class="h-8 text-xs cursor-pointer"
              :class="quickActionModal === 'in' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-amber-600 hover:bg-amber-700 text-white'"
              :disabled="isActionLoading"
            >
              {{ isActionLoading ? 'Saving...' : 'Confirm Transaction' }}
            </Button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
