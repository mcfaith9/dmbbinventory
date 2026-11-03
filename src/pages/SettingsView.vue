<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  Database,
  Sparkles,
  Trash2,
  UsersRound,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Server,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { localDb } from '@/database/local/dexie.database'
import { seedDemoData } from '@/database/local/dexie.seed'
import { db } from '@/repositories'
import { AuthService } from '@/services/auth.service'

const isSeeding = ref(false)
const isClearing = ref(false)
const successNotice = ref('')
const errorNotice = ref('')

const counts = ref({
  products: 0,
  categories: 0,
  brands: 0,
  units: 0,
  suppliers: 0,
  transactions: 0,
})

const currentUser = AuthService.getUser()

async function updateCounts() {
  try {
    const [p, c, b, u, s, t] = await Promise.all([
      localDb.products.count(),
      localDb.categories.count(),
      localDb.brands.count(),
      localDb.units.count(),
      localDb.suppliers.count(),
      localDb.transactions.count(),
    ])
    counts.value = {
      products: p,
      categories: c,
      brands: b,
      units: u,
      suppliers: s,
      transactions: t,
    }
  } catch (err) {
    console.error('Failed to get database table counts:', err)
  }
}

async function handleLoadDemoData() {
  if (confirm('Load realistic sample inventory items, categories, suppliers, and transaction records?')) {
    isSeeding.value = true
    successNotice.value = ''
    errorNotice.value = ''
    try {
      await seedDemoData(localDb)
      await updateCounts()
      successNotice.value = 'Sample inventory catalog and movement logs loaded successfully!'
    } catch (err: any) {
      errorNotice.value = err.message || 'Failed to load demo data.'
    } finally {
      isSeeding.value = false
    }
  }
}

async function handleClearDatabase() {
  const confirmText = prompt('WARNING: This will permanently wipe all local inventory data. Type "RESET" to confirm:')
  if (confirmText === 'RESET') {
    isClearing.value = true
    successNotice.value = ''
    errorNotice.value = ''
    try {
      await db.clearAllData()
      await updateCounts()
      successNotice.value = 'All local database records have been erased.'
    } catch (err: any) {
      errorNotice.value = err.message || 'Failed to wipe database.'
    } finally {
      isClearing.value = false
    }
  }
}

onMounted(() => {
  updateCounts()
})
</script>

<template>
  <div class="space-y-6">
    <div class="border-b pb-4">
      <h1 class="text-2xl font-bold tracking-tight">System Settings & Database</h1>
      <p class="text-xs text-muted-foreground mt-0.5">
        Local IndexedDB status, data management, and future database synchronization readiness
      </p>
    </div>

    <div v-if="successNotice" class="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs">
      <CheckCircle2 class="size-4 shrink-0" />
      <span>{{ successNotice }}</span>
    </div>

    <div v-if="errorNotice" class="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-xs">
      <AlertTriangle class="size-4 shrink-0" />
      <span>{{ errorNotice }}</span>
    </div>

    <!-- Active User Profile Card -->
    <div class="rounded-lg border border-border bg-card p-5 shadow-xs space-y-3">
      <div class="flex items-center justify-between border-b pb-2">
        <h2 class="text-sm font-semibold flex items-center gap-2">
          <UsersRound class="size-4 text-primary" />
          Active Session & Role
        </h2>
        <span class="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold">Authenticated</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <span class="text-muted-foreground text-[11px]">User:</span>
          <div class="font-medium text-foreground mt-0.5">{{ currentUser.name }}</div>
        </div>
        <div>
          <span class="text-muted-foreground text-[11px]">Contact Email:</span>
          <div class="font-mono text-foreground mt-0.5">{{ currentUser.email }}</div>
        </div>
        <div>
          <span class="text-muted-foreground text-[11px]">System Role:</span>
          <div class="font-medium text-foreground mt-0.5">{{ currentUser.role }}</div>
        </div>
      </div>
    </div>

    <!-- Database Storage & Architecture Card -->
    <div class="rounded-lg border border-border bg-card p-5 shadow-xs space-y-4">
      <div class="flex items-center justify-between border-b pb-2">
        <h2 class="text-sm font-semibold flex items-center gap-2">
          <Database class="size-4 text-primary" />
          Dexie.js IndexedDB Local Storage
        </h2>
        <Button variant="ghost" size="sm" class="h-7 text-xs" @click="updateCounts">
          <RefreshCw class="size-3 mr-1" />
          <span>Refresh Counts</span>
        </Button>
      </div>

      <!-- Table Counts Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-center text-xs">
        <div class="p-2.5 rounded border border-border bg-muted/20">
          <div class="text-[10px] uppercase text-muted-foreground">Products</div>
          <div class="text-lg font-bold font-mono mt-0.5">{{ counts.products }}</div>
        </div>
        <div class="p-2.5 rounded border border-border bg-muted/20">
          <div class="text-[10px] uppercase text-muted-foreground">Transactions</div>
          <div class="text-lg font-bold font-mono mt-0.5">{{ counts.transactions }}</div>
        </div>
        <div class="p-2.5 rounded border border-border bg-muted/20">
          <div class="text-[10px] uppercase text-muted-foreground">Categories</div>
          <div class="text-lg font-bold font-mono mt-0.5">{{ counts.categories }}</div>
        </div>
        <div class="p-2.5 rounded border border-border bg-muted/20">
          <div class="text-[10px] uppercase text-muted-foreground">Brands</div>
          <div class="text-lg font-bold font-mono mt-0.5">{{ counts.brands }}</div>
        </div>
        <div class="p-2.5 rounded border border-border bg-muted/20">
          <div class="text-[10px] uppercase text-muted-foreground">Suppliers</div>
          <div class="text-lg font-bold font-mono mt-0.5">{{ counts.suppliers }}</div>
        </div>
        <div class="p-2.5 rounded border border-border bg-muted/20">
          <div class="text-[10px] uppercase text-muted-foreground">Units</div>
          <div class="text-lg font-bold font-mono mt-0.5">{{ counts.units }}</div>
        </div>
      </div>

      <!-- Abstraction Architecture Note -->
      <div class="p-3.5 rounded-lg border border-border bg-muted/30 text-xs space-y-1">
        <div class="flex items-center gap-1.5 font-semibold text-foreground">
          <Server class="size-3.5 text-primary" />
          <span>Future Online Database Compatibility</span>
        </div>
        <p class="text-muted-foreground leading-relaxed text-[11px]">
          The application uses a Repository Pattern abstraction (`IProductRepository`, `ITransactionRepository`, `ISupplierRepository`) and universally assigns UUID primary keys, ISO-8601 timestamps, and `syncStatus` flags. When PostgreSQL or Supabase is connected in the future, the storage layer can be swapped in `src/database/core/database.factory.ts` with zero code modifications to the inventory modules.
        </p>
      </div>
    </div>

    <!-- Data Management Actions -->
    <div class="rounded-lg border border-border bg-card p-5 shadow-xs space-y-4">
      <h2 class="text-sm font-semibold border-b pb-2">Data Operations</h2>

      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-border bg-muted/20">
        <div>
          <div class="text-xs font-semibold text-foreground">Load Demo Inventory Data</div>
          <div class="text-[11px] text-muted-foreground">
            Populates categories, suppliers, thermal labels, and sample products for testing
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          class="h-8 gap-1.5 text-xs cursor-pointer shrink-0"
          :disabled="isSeeding"
          @click="handleLoadDemoData"
        >
          <Sparkles class="size-3.5" />
          <span>{{ isSeeding ? 'Seeding...' : 'Load Sample Data' }}</span>
        </Button>
      </div>

      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-destructive/20 bg-destructive/5">
        <div>
          <div class="text-xs font-semibold text-destructive">Wipe Local Database (Factory Reset)</div>
          <div class="text-[11px] text-muted-foreground">
            Irreversibly clears all stored IndexedDB tables. Requires confirmation.
          </div>
        </div>
        <Button
          variant="destructive"
          size="sm"
          class="h-8 gap-1.5 text-xs cursor-pointer shrink-0"
          :disabled="isClearing"
          @click="handleClearDatabase"
        >
          <Trash2 class="size-3.5" />
          <span>{{ isClearing ? 'Erasing...' : 'Wipe All Data' }}</span>
        </Button>
      </div>
    </div>
  </div>
</template>
