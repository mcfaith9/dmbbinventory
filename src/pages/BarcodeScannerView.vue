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
  QrCode,
  Barcode as BarcodeIcon,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { productRepo } from '@/repositories'
import { InventoryService } from '@/services/inventory.service'
import { formatPHP } from '@/lib/currency'
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
const lastScannedCode = ref('')
const detectedCodeType = ref<'QR Code' | '1D Barcode' | 'Unknown'>('Unknown')

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

// Global Keydown Listener for USB & Bluetooth Hardware Wedge Scanners
function handleGlobalKeydown(e: KeyboardEvent) {
  if (quickActionModal.value) return

  const now = Date.now()
  const char = e.key

  // Hardware scanners fire rapid keystrokes (<70ms apart)
  if (now - lastKeyTime.value > 100) {
    scanBuffer.value = ''
  }
  lastKeyTime.value = now

  if (char === 'Enter') {
    if (scanBuffer.value.length >= 2) {
      e.preventDefault()
      processCodeLookup(scanBuffer.value)
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

/**
 * Extracts candidate product identifiers from raw scanned data (supports plain text, JSON, or deep links)
 */
function extractLookupKey(raw: string): { key: string; likelyType: 'QR Code' | '1D Barcode' } {
  const trimmed = raw.trim()

  // 1. Check if structured JSON payload from QR
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed)
      const candidate = parsed.sku || parsed.barcode || parsed.id || ''
      return { key: candidate || trimmed, likelyType: 'QR Code' }
    } catch {
      // not JSON
    }
  }

  // 2. Check if deep link URL (e.g. /products/UUID)
  if (trimmed.includes('/products/')) {
    const parts = trimmed.split('/products/')
    const candidate = parts[1]?.split('?')[0]?.replace(/\/$/, '') || ''
    if (candidate) return { key: candidate, likelyType: 'QR Code' }
  }

  // 3. Heuristic: 1D barcodes are typically purely digits (EAN13, UPC) or simple short alphanumeric (Code128)
  const isAllDigits = /^\d{8,14}$/.test(trimmed)
  const likelyType = isAllDigits ? '1D Barcode' : (trimmed.length > 25 || trimmed.includes('{') || trimmed.includes('http') ? 'QR Code' : '1D Barcode')

  return { key: trimmed, likelyType }
}

async function processCodeLookup(rawCode: string) {
  const { key, likelyType } = extractLookupKey(rawCode)
  if (!key) return

  isSearching.value = true
  scanError.value = ''
  lastScannedCode.value = key
  detectedCodeType.value = likelyType

  try {
    // 1. Lookup by exact Barcode
    let product = await productRepo.getByBarcode(key)
    // 2. Lookup by SKU
    if (!product) {
      product = await productRepo.getBySku(key)
    }
    // 3. Lookup by Product ID
    if (!product) {
      product = await productRepo.getById(key)
    }

    if (product) {
      scannedProduct.value = product
      playBeep(true)
    } else {
      scannedProduct.value = null
      scanError.value = `No registered inventory product matches scanned code "${key}".`
      playBeep(false)
    }
  } catch (err: any) {
    scanError.value = err.message || 'Error looking up scanned product code.'
    scannedProduct.value = null
    playBeep(false)
  } finally {
    isSearching.value = false
  }
}

function handleManualSearch() {
  if (manualInput.value.trim()) {
    processCodeLookup(manualInput.value)
    manualInput.value = ''
  }
}

// Camera Scanner Implementation supporting both 1D Barcodes and 2D QR Codes
async function startCamera() {
  cameraError.value = ''
  try {
    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode('camera-reader-viewport', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ],
        verbose: false,
      })
    }

    await html5QrCode.start(
      { facingMode: 'environment' },
      {
        fps: 15,
        qrbox: { width: 260, height: 200 },
        aspectRatio: 1.333333,
      },
      (decodedText, decodedResult) => {
        // Distinguish format from decoded result if available
        const formatName = decodedResult?.result?.format?.formatName || ''
        if (formatName.toLowerCase().includes('qr')) {
          detectedCodeType.value = 'QR Code'
        } else if (formatName) {
          detectedCodeType.value = '1D Barcode'
        }

        if (decodedText !== lastScannedCode.value || !scannedProduct.value) {
          processCodeLookup(decodedText)
        }
      },
      () => {
        // Frame scan misses ignored
      }
    )
    isCameraActive.value = true
  } catch (err: any) {
    cameraError.value = err?.message || 'Unable to access camera. Please allow camera permissions.'
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

// Quick Stock In / Out Handlers from Scanner View
function openQuickAction(type: 'in' | 'out') {
  if (!scannedProduct.value) return
  quickActionModal.value = type
  actionQuantity.value = 1
  actionRef.value = `${type === 'in' ? 'RCV' : 'DSP'}-${Date.now().toString().slice(-6)}`
  actionParty.value = type === 'in' ? 'Warehouse Dock' : 'Store Dispatch'
  actionRemarks.value = 'Fast barcode/QR scanner transaction'
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
        <h1 class="text-2xl font-bold tracking-tight">Barcode & QR Code Scanner</h1>
        <p class="text-xs text-muted-foreground">
          Instant multi-format scanning via USB/Bluetooth hardware wedge or device camera with real-time stock intake & dispatch
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
          <span>USB / Bluetooth Wedge</span>
        </button>

        <button
          type="button"
          class="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer"
          :class="scanMode === 'camera' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'"
          @click="setScanMode('camera')"
        >
          <Camera class="size-3.5" />
          <span>Device Camera</span>
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
              Hardware Wedge Listener
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
              Ready for Barcode Gun or 2D QR Scanner
            </p>
            <p class="text-[11px] text-muted-foreground max-w-xs mx-auto">
              Aim your handheld USB or Bluetooth scanner at any 1D barcode or 2D QR code label. Keystrokes are captured automatically without clicking.
            </p>
          </div>

          <!-- Manual / Testing Input Field -->
          <div class="pt-2">
            <Label for="manual-scan" class="text-xs font-semibold">Or Type / Paste Code Manually</Label>
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
              Unified 1D & 2D Camera Viewfinder
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
            Auto-detects both traditional barcodes and 2D QR codes in the viewfinder
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
            <div class="flex items-center gap-2">
              <span v-if="detectedCodeType !== 'Unknown'" class="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-muted font-semibold">
                {{ detectedCodeType }}
              </span>
              <span v-if="lastScannedCode" class="font-mono text-xs text-muted-foreground">
                Code: {{ lastScannedCode }}
              </span>
            </div>
          </div>

          <!-- Searching State -->
          <div v-if="isSearching" class="p-12 text-center text-xs text-muted-foreground">
            <RefreshCw class="size-6 animate-spin mx-auto mb-2 text-primary" />
            Querying local database...
          </div>

          <!-- Error / Unregistered State -->
          <div v-else-if="scanError" class="p-8 text-center space-y-3">
            <div class="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <AlertCircle class="size-6" />
            </div>
            <div>
              <p class="text-xs font-semibold text-destructive">{{ scanError }}</p>
              <p class="text-[11px] text-muted-foreground mt-1">
                You can create a new catalog product with this identifier.
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
            <p class="font-medium text-foreground">Waiting for code scan...</p>
            <p class="text-[11px] mt-1">Scan a product 1D barcode or 2D QR code using your USB wedge or device camera.</p>
          </div>

          <!-- Found Product Card -->
          <div v-else class="space-y-4 pt-2">
            <div class="flex items-start justify-between">
              <div>
                <span class="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                  PRODUCT RECOGNIZED
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
                  Current Balance (Min: {{ scannedProduct.minStockLevel }})
                </div>
              </div>
            </div>

            <!-- Pricing & Specification Strip formatted in Philippine Peso (₱) -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-muted/40 text-xs">
              <div>
                <span class="text-muted-foreground text-[10px]">Selling Price</span>
                <div class="font-mono font-bold text-sm text-foreground">
                  {{ formatPHP(scannedProduct.sellingPrice) }}
                </div>
              </div>
              <div>
                <span class="text-muted-foreground text-[10px]">Cost Price</span>
                <div class="font-mono font-bold text-sm text-foreground">
                  {{ formatPHP(scannedProduct.costPrice) }}
                </div>
              </div>
              <div>
                <span class="text-muted-foreground text-[10px]">Symbology</span>
                <div class="font-mono font-medium text-xs text-foreground uppercase">
                  {{ scannedProduct.barcodeFormat }}
                </div>
              </div>
              <div>
                <span class="text-muted-foreground text-[10px]">Catalog Status</span>
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
              {{ quickActionModal === 'in' ? 'Quick Stock In Intake' : 'Quick Stock Out Dispatch' }}
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
          Product: <span class="text-foreground font-semibold">{{ scannedProduct.name }}</span> (Available: {{ scannedProduct.currentStock }} &bull; Unit: {{ formatPHP(quickActionModal === 'in' ? scannedProduct.costPrice : scannedProduct.sellingPrice) }})
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
            <div v-if="actionQuantity > 0" class="text-[11px] text-muted-foreground mt-0.5 font-mono">
              Total Transaction Value:
              <span class="font-semibold text-foreground">
                {{ formatPHP(actionQuantity * (quickActionModal === 'in' ? scannedProduct.costPrice : scannedProduct.sellingPrice)) }}
              </span>
            </div>
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
