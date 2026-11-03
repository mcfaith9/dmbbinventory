<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Ruler, Plus, Edit, Trash2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { unitRepo } from '@/repositories'
import type { UnitOfMeasurement } from '@/database/core/database.types'

const units = ref<UnitOfMeasurement[]>([])
const isLoading = ref(true)

const isModalOpen = ref(false)
const isEditing = ref(false)
const form = ref({ id: '', name: '', abbreviation: '' })

async function loadData() {
  isLoading.value = true
  try {
    units.value = await unitRepo.getAll()
  } catch (err) {
    console.error('Failed to load units:', err)
  } finally {
    isLoading.value = false
  }
}

function openCreate() {
  isEditing.value = false
  form.value = { id: '', name: '', abbreviation: '' }
  isModalOpen.value = true
}

function openEdit(u: UnitOfMeasurement) {
  isEditing.value = true
  form.value = { id: u.id, name: u.name, abbreviation: u.abbreviation }
  isModalOpen.value = true
}

async function saveUnit() {
  if (!form.value.name.trim() || !form.value.abbreviation.trim()) return
  try {
    if (isEditing.value) {
      await unitRepo.update(form.value.id, {
        name: form.value.name.trim(),
        abbreviation: form.value.abbreviation.trim().toLowerCase(),
      })
    } else {
      await unitRepo.create({
        name: form.value.name.trim(),
        abbreviation: form.value.abbreviation.trim().toLowerCase(),
        deletedAt: null,
      })
    }
    isModalOpen.value = false
    await loadData()
  } catch (err) {
    console.error('Failed to save unit:', err)
  }
}

async function deleteUnit(id: string, name: string) {
  if (confirm(`Delete unit "${name}"?`)) {
    await unitRepo.delete(id)
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
        <h1 class="text-2xl font-bold tracking-tight">Units of Measurement</h1>
        <p class="text-xs text-muted-foreground">
          Define standard packaging and inventory measurement units (pieces, boxes, rolls, kg)
        </p>
      </div>

      <Button size="sm" class="h-8 gap-1.5 text-xs cursor-pointer" @click="openCreate">
        <Plus class="size-3.5" />
        <span>Add Unit of Measure</span>
      </Button>
    </div>

    <!-- Data Table -->
    <div class="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
      <div v-if="units.length === 0" class="p-12 text-center text-xs text-muted-foreground">
        <Ruler class="size-8 mx-auto mb-2 text-muted-foreground/40" />
        <p class="font-medium text-foreground">No units defined</p>
        <p class="text-[11px] mt-1">Configure units like "pcs", "box", "kg" to assign to products.</p>
        <Button size="sm" class="mt-4 h-8 text-xs cursor-pointer" @click="openCreate">
          Add First Unit
        </Button>
      </div>

      <table v-else class="w-full text-xs">
        <thead>
          <tr class="border-b border-border bg-muted/40 text-muted-foreground">
            <th class="py-2.5 px-3 text-left font-medium">Unit Name</th>
            <th class="py-2.5 px-3 text-left font-medium">Abbreviation</th>
            <th class="py-2.5 px-3 text-right font-medium">Created Date</th>
            <th class="py-2.5 px-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border/60">
          <tr v-for="u in units" :key="u.id" class="hover:bg-muted/20 transition-colors">
            <td class="py-2.5 px-3 font-semibold text-foreground">{{ u.name }}</td>
            <td class="py-2.5 px-3 font-mono font-medium text-muted-foreground">{{ u.abbreviation }}</td>
            <td class="py-2.5 px-3 text-right font-mono text-muted-foreground">{{ u.createdAt.slice(0, 10) }}</td>
            <td class="py-2.5 px-3 text-right">
              <div class="flex items-center justify-end gap-1">
                <Button variant="ghost" size="sm" class="size-7 p-0 cursor-pointer" @click="openEdit(u)">
                  <Edit class="size-3.5 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="sm" class="size-7 p-0 cursor-pointer text-destructive" @click="deleteUnit(u.id, u.name)">
                  <Trash2 class="size-3.5" />
                </Button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal -->
    <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div class="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-xl space-y-4">
        <div class="flex items-center justify-between border-b pb-3">
          <h2 class="text-base font-bold">{{ isEditing ? 'Edit Unit' : 'Create Unit' }}</h2>
          <button type="button" class="text-lg text-muted-foreground" @click="isModalOpen = false">&times;</button>
        </div>

        <form @submit.prevent="saveUnit" class="space-y-3 text-xs">
          <div>
            <Label for="u-name" class="text-xs font-semibold">Unit Name *</Label>
            <Input id="u-name" v-model="form.name" required class="h-8 mt-1 text-xs" placeholder="e.g. Kilogram, Box (12 pcs), Pack" />
          </div>

          <div>
            <Label for="u-abbr" class="text-xs font-semibold">Abbreviation *</Label>
            <Input id="u-abbr" v-model="form.abbreviation" required class="h-8 mt-1 font-mono text-xs" placeholder="e.g. kg, box, pk, roll" />
          </div>

          <div class="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" size="sm" class="h-8 text-xs" @click="isModalOpen = false">Cancel</Button>
            <Button type="submit" size="sm" class="h-8 text-xs cursor-pointer">Save Unit</Button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
