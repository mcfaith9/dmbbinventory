<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  Truck,
  Plus,
  Edit,
  Trash2,
  Mail,
  Phone,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supplierRepo } from '@/repositories'
import type { Supplier } from '@/database/core/database.types'

const suppliers = ref<Supplier[]>([])
const isLoading = ref(true)

const isModalOpen = ref(false)
const isEditing = ref(false)
const form = ref({
  id: '',
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  reference: '',
})

async function loadData() {
  isLoading.value = true
  try {
    suppliers.value = await supplierRepo.getAll()
  } catch (err) {
    console.error('Failed to load suppliers:', err)
  } finally {
    isLoading.value = false
  }
}

function openCreate() {
  isEditing.value = false
  form.value = {
    id: '',
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    reference: `SUP-${Date.now().toString().slice(-4)}`,
  }
  isModalOpen.value = true
}

function openEdit(s: Supplier) {
  isEditing.value = true
  form.value = {
    id: s.id,
    name: s.name,
    contactPerson: s.contactPerson || '',
    phone: s.phone || '',
    email: s.email || '',
    address: s.address || '',
    reference: s.reference || '',
  }
  isModalOpen.value = true
}

async function saveSupplier() {
  if (!form.value.name.trim()) return
  try {
    if (isEditing.value) {
      await supplierRepo.update(form.value.id, {
        name: form.value.name.trim(),
        contactPerson: form.value.contactPerson.trim(),
        phone: form.value.phone.trim(),
        email: form.value.email.trim(),
        address: form.value.address.trim(),
        reference: form.value.reference.trim(),
      })
    } else {
      await supplierRepo.create({
        name: form.value.name.trim(),
        contactPerson: form.value.contactPerson.trim(),
        phone: form.value.phone.trim(),
        email: form.value.email.trim(),
        address: form.value.address.trim(),
        reference: form.value.reference.trim(),
        deletedAt: null,
      })
    }
    isModalOpen.value = false
    await loadData()
  } catch (err) {
    console.error('Failed to save supplier:', err)
  }
}

async function deleteSupplier(id: string, name: string) {
  if (confirm(`Are you sure you want to delete supplier "${name}"?`)) {
    await supplierRepo.delete(id)
    await loadData()
  }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Suppliers Directory</h1>
        <p class="text-xs text-muted-foreground">
          Vendor contacts, purchasing references, and logistics addresses
        </p>
      </div>

      <Button size="sm" class="h-8 gap-1.5 text-xs cursor-pointer" @click="openCreate">
        <Plus class="size-3.5" />
        <span>Add Supplier</span>
      </Button>
    </div>

    <!-- Data Table -->
    <div class="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
      <div v-if="suppliers.length === 0" class="p-12 text-center text-xs text-muted-foreground">
        <Truck class="size-8 mx-auto mb-2 text-muted-foreground/40" />
        <p class="font-medium text-foreground">No suppliers registered</p>
        <p class="text-[11px] mt-1">Add vendor records to associate with incoming stock orders.</p>
        <Button size="sm" class="mt-4 h-8 text-xs cursor-pointer" @click="openCreate">
          Add First Supplier
        </Button>
      </div>

      <table v-else class="w-full text-xs">
        <thead>
          <tr class="border-b border-border bg-muted/40 text-muted-foreground">
            <th class="py-2.5 px-3 text-left font-medium">Supplier & Ref</th>
            <th class="py-2.5 px-3 text-left font-medium">Contact Person</th>
            <th class="py-2.5 px-3 text-left font-medium">Communication</th>
            <th class="py-2.5 px-3 text-left font-medium">Business Address</th>
            <th class="py-2.5 px-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border/60">
          <tr v-for="s in suppliers" :key="s.id" class="hover:bg-muted/20 transition-colors">
            <td class="py-2.5 px-3">
              <div class="font-semibold text-foreground">{{ s.name }}</div>
              <div class="font-mono text-[10px] text-muted-foreground">{{ s.reference }}</div>
            </td>
            <td class="py-2.5 px-3 text-foreground font-medium">
              {{ s.contactPerson || '-' }}
            </td>
            <td class="py-2.5 px-3 text-muted-foreground">
              <div class="flex items-center gap-1.5">
                <Mail class="size-3 text-muted-foreground" />
                <span>{{ s.email || 'N/A' }}</span>
              </div>
              <div class="flex items-center gap-1.5 mt-0.5 font-mono text-[11px]">
                <Phone class="size-3 text-muted-foreground" />
                <span>{{ s.phone || 'N/A' }}</span>
              </div>
            </td>
            <td class="py-2.5 px-3 text-muted-foreground max-w-xs truncate">
              {{ s.address || '-' }}
            </td>
            <td class="py-2.5 px-3 text-right">
              <div class="flex items-center justify-end gap-1">
                <Button variant="ghost" size="sm" class="size-7 p-0 cursor-pointer" @click="openEdit(s)">
                  <Edit class="size-3.5 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="sm" class="size-7 p-0 cursor-pointer text-destructive" @click="deleteSupplier(s.id, s.name)">
                  <Trash2 class="size-3.5" />
                </Button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Supplier Modal -->
    <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div class="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl space-y-4">
        <div class="flex items-center justify-between border-b pb-3">
          <h2 class="text-base font-bold">{{ isEditing ? 'Edit Supplier' : 'Add New Supplier' }}</h2>
          <button type="button" class="text-lg text-muted-foreground" @click="isModalOpen = false">&times;</button>
        </div>

        <form @submit.prevent="saveSupplier" class="space-y-3 text-xs">
          <div>
            <Label for="s-name" class="text-xs font-semibold">Company / Supplier Name *</Label>
            <Input id="s-name" v-model="form.name" required class="h-8 mt-1 text-xs" placeholder="e.g. Acme Industrial Parts" />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <Label for="s-contact" class="text-xs font-semibold">Contact Person</Label>
              <Input id="s-contact" v-model="form.contactPerson" class="h-8 mt-1 text-xs" placeholder="Representative name" />
            </div>

            <div>
              <Label for="s-ref" class="text-xs font-semibold">Account Ref #</Label>
              <Input id="s-ref" v-model="form.reference" class="h-8 mt-1 font-mono text-xs" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <Label for="s-phone" class="text-xs font-semibold">Phone Number</Label>
              <Input id="s-phone" v-model="form.phone" class="h-8 mt-1 font-mono text-xs" placeholder="+1 555-0123" />
            </div>

            <div>
              <Label for="s-email" class="text-xs font-semibold">Email Address</Label>
              <Input id="s-email" v-model="form.email" type="email" class="h-8 mt-1 text-xs" placeholder="orders@vendor.com" />
            </div>
          </div>

          <div>
            <Label for="s-addr" class="text-xs font-semibold">Warehouse / Business Address</Label>
            <textarea id="s-addr" v-model="form.address" rows="2" class="w-full mt-1 p-2 border rounded-md bg-background text-xs" placeholder="Street, City, State, ZIP"></textarea>
          </div>

          <div class="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" size="sm" class="h-8 text-xs" @click="isModalOpen = false">Cancel</Button>
            <Button type="submit" size="sm" class="h-8 text-xs cursor-pointer">{{ isEditing ? 'Update Supplier' : 'Register Supplier' }}</Button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
