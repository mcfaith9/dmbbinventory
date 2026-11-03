<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  FolderTree,
  Tag,
  Plus,
  Edit,
  Trash2,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { categoryRepo, brandRepo } from '@/repositories'
import type { Category, Brand } from '@/database/core/database.types'

const activeTab = ref<'categories' | 'brands'>('categories')
const categories = ref<Category[]>([])
const brands = ref<Brand[]>([])
const isLoading = ref(true)

// Category Form
const isCatModalOpen = ref(false)
const isCatEditing = ref(false)
const catForm = ref({ id: '', name: '', slug: '', description: '' })

// Brand Form
const isBrandModalOpen = ref(false)
const isBrandEditing = ref(false)
const brandForm = ref({ id: '', name: '' })

const errorMessage = ref('')

async function loadData() {
  isLoading.value = true
  try {
    const [cats, brs] = await Promise.all([
      categoryRepo.getAll(),
      brandRepo.getAll(),
    ])
    categories.value = cats
    brands.value = brs
  } catch (err) {
    console.error('Failed to load categories/brands:', err)
  } finally {
    isLoading.value = false
  }
}

// Category Handlers
function openCreateCat() {
  isCatEditing.value = false
  catForm.value = { id: '', name: '', slug: '', description: '' }
  isCatModalOpen.value = true
}

function openEditCat(cat: Category) {
  isCatEditing.value = true
  catForm.value = {
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    description: cat.description || '',
  }
  isCatModalOpen.value = true
}

async function saveCat() {
  if (!catForm.value.name.trim()) return
  try {
    const slug = catForm.value.slug.trim() || catForm.value.name.toLowerCase().replace(/[^a-z0-9]/g, '-')
    if (isCatEditing.value) {
      await categoryRepo.update(catForm.value.id, {
        name: catForm.value.name.trim(),
        slug,
        description: catForm.value.description.trim(),
      })
    } else {
      await categoryRepo.create({
        name: catForm.value.name.trim(),
        slug,
        description: catForm.value.description.trim(),
        deletedAt: null,
      })
    }
    isCatModalOpen.value = false
    await loadData()
  } catch (err: any) {
    errorMessage.value = err.message || 'Failed to save category.'
  }
}

async function deleteCat(id: string, name: string) {
  if (confirm(`Delete category "${name}"?`)) {
    await categoryRepo.delete(id)
    await loadData()
  }
}

// Brand Handlers
function openCreateBrand() {
  isBrandEditing.value = false
  brandForm.value = { id: '', name: '' }
  isBrandModalOpen.value = true
}

function openEditBrand(brand: Brand) {
  isBrandEditing.value = true
  brandForm.value = { id: brand.id, name: brand.name }
  isBrandModalOpen.value = true
}

async function saveBrand() {
  if (!brandForm.value.name.trim()) return
  try {
    if (isBrandEditing.value) {
      await brandRepo.update(brandForm.value.id, { name: brandForm.value.name.trim() })
    } else {
      await brandRepo.create({ name: brandForm.value.name.trim(), deletedAt: null })
    }
    isBrandModalOpen.value = false
    await loadData()
  } catch (err: any) {
    errorMessage.value = err.message || 'Failed to save brand.'
  }
}

async function deleteBrand(id: string, name: string) {
  if (confirm(`Delete brand "${name}"?`)) {
    await brandRepo.delete(id)
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
        <h1 class="text-2xl font-bold tracking-tight">Categories & Brands</h1>
        <p class="text-xs text-muted-foreground">
          Organize products into hierarchical departments, categories, and manufacturing brands
        </p>
      </div>

      <div class="flex items-center gap-2">
        <div class="flex items-center gap-1 p-1 bg-muted rounded-lg border border-border">
          <button
            type="button"
            class="px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer"
            :class="activeTab === 'categories' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'"
            @click="activeTab = 'categories'"
          >
            Categories ({{ categories.length }})
          </button>
          <button
            type="button"
            class="px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer"
            :class="activeTab === 'brands' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'"
            @click="activeTab = 'brands'"
          >
            Brands ({{ brands.length }})
          </button>
        </div>

        <Button
          size="sm"
          class="h-8 gap-1.5 text-xs cursor-pointer"
          @click="activeTab === 'categories' ? openCreateCat() : openCreateBrand()"
        >
          <Plus class="size-3.5" />
          <span>Add {{ activeTab === 'categories' ? 'Category' : 'Brand' }}</span>
        </Button>
      </div>
    </div>

    <!-- CATEGORIES TAB -->
    <div v-if="activeTab === 'categories'" class="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
      <div v-if="categories.length === 0" class="p-12 text-center text-xs text-muted-foreground">
        <FolderTree class="size-8 mx-auto mb-2 text-muted-foreground/40" />
        <p class="font-medium text-foreground">No categories defined</p>
        <p class="text-[11px] mt-1">Create categories to organize your inventory products.</p>
        <Button size="sm" class="mt-4 h-8 text-xs cursor-pointer" @click="openCreateCat">
          Create Category
        </Button>
      </div>

      <table v-else class="w-full text-xs">
        <thead>
          <tr class="border-b border-border bg-muted/40 text-muted-foreground">
            <th class="py-2.5 px-3 text-left font-medium">Category Name</th>
            <th class="py-2.5 px-3 text-left font-medium">Slug</th>
            <th class="py-2.5 px-3 text-left font-medium">Description</th>
            <th class="py-2.5 px-3 text-right font-medium">Created</th>
            <th class="py-2.5 px-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border/60">
          <tr v-for="cat in categories" :key="cat.id" class="hover:bg-muted/20 transition-colors">
            <td class="py-2.5 px-3 font-semibold text-foreground">{{ cat.name }}</td>
            <td class="py-2.5 px-3 font-mono text-muted-foreground">{{ cat.slug }}</td>
            <td class="py-2.5 px-3 text-muted-foreground max-w-xs truncate">{{ cat.description || '-' }}</td>
            <td class="py-2.5 px-3 text-right font-mono text-muted-foreground">{{ cat.createdAt.slice(0, 10) }}</td>
            <td class="py-2.5 px-3 text-right">
              <div class="flex items-center justify-end gap-1">
                <Button variant="ghost" size="sm" class="size-7 p-0 cursor-pointer" @click="openEditCat(cat)">
                  <Edit class="size-3.5 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="sm" class="size-7 p-0 cursor-pointer text-destructive" @click="deleteCat(cat.id, cat.name)">
                  <Trash2 class="size-3.5" />
                </Button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- BRANDS TAB -->
    <div v-else class="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
      <div v-if="brands.length === 0" class="p-12 text-center text-xs text-muted-foreground">
        <Tag class="size-8 mx-auto mb-2 text-muted-foreground/40" />
        <p class="font-medium text-foreground">No brands registered</p>
        <p class="text-[11px] mt-1">Add manufacturers and product brands.</p>
        <Button size="sm" class="mt-4 h-8 text-xs cursor-pointer" @click="openCreateBrand">
          Add Brand
        </Button>
      </div>

      <table v-else class="w-full text-xs">
        <thead>
          <tr class="border-b border-border bg-muted/40 text-muted-foreground">
            <th class="py-2.5 px-3 text-left font-medium">Brand Name</th>
            <th class="py-2.5 px-3 text-right font-medium">Registered Date</th>
            <th class="py-2.5 px-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border/60">
          <tr v-for="b in brands" :key="b.id" class="hover:bg-muted/20 transition-colors">
            <td class="py-2.5 px-3 font-semibold text-foreground">{{ b.name }}</td>
            <td class="py-2.5 px-3 text-right font-mono text-muted-foreground">{{ b.createdAt.slice(0, 10) }}</td>
            <td class="py-2.5 px-3 text-right">
              <div class="flex items-center justify-end gap-1">
                <Button variant="ghost" size="sm" class="size-7 p-0 cursor-pointer" @click="openEditBrand(b)">
                  <Edit class="size-3.5 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="sm" class="size-7 p-0 cursor-pointer text-destructive" @click="deleteBrand(b.id, b.name)">
                  <Trash2 class="size-3.5" />
                </Button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Category Modal -->
    <div v-if="isCatModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div class="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl space-y-4">
        <div class="flex items-center justify-between border-b pb-3">
          <h2 class="text-base font-bold">{{ isCatEditing ? 'Edit Category' : 'Create Category' }}</h2>
          <button type="button" class="text-lg text-muted-foreground" @click="isCatModalOpen = false">&times;</button>
        </div>
        <form @submit.prevent="saveCat" class="space-y-3 text-xs">
          <div>
            <Label for="c-name" class="text-xs font-semibold">Category Name *</Label>
            <Input id="c-name" v-model="catForm.name" required class="h-8 mt-1 text-xs" placeholder="e.g. Industrial Automation" />
          </div>
          <div>
            <Label for="c-slug" class="text-xs font-semibold">Slug (Optional)</Label>
            <Input id="c-slug" v-model="catForm.slug" class="h-8 mt-1 font-mono text-xs" placeholder="auto-generated from name" />
          </div>
          <div>
            <Label for="c-desc" class="text-xs font-semibold">Description</Label>
            <textarea id="c-desc" v-model="catForm.description" rows="2" class="w-full mt-1 p-2 border rounded-md bg-background text-xs"></textarea>
          </div>
          <div class="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" size="sm" class="h-8 text-xs" @click="isCatModalOpen = false">Cancel</Button>
            <Button type="submit" size="sm" class="h-8 text-xs cursor-pointer">Save Category</Button>
          </div>
        </form>
      </div>
    </div>

    <!-- Brand Modal -->
    <div v-if="isBrandModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div class="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-xl space-y-4">
        <div class="flex items-center justify-between border-b pb-3">
          <h2 class="text-base font-bold">{{ isBrandEditing ? 'Edit Brand' : 'Create Brand' }}</h2>
          <button type="button" class="text-lg text-muted-foreground" @click="isBrandModalOpen = false">&times;</button>
        </div>
        <form @submit.prevent="saveBrand" class="space-y-3 text-xs">
          <div>
            <Label for="b-name" class="text-xs font-semibold">Brand / Manufacturer Name *</Label>
            <Input id="b-name" v-model="brandForm.name" required class="h-8 mt-1 text-xs" placeholder="e.g. Honeywell" />
          </div>
          <div class="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" size="sm" class="h-8 text-xs" @click="isBrandModalOpen = false">Cancel</Button>
            <Button type="submit" size="sm" class="h-8 text-xs cursor-pointer">Save Brand</Button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
