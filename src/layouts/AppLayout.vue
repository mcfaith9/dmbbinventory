<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, RouterLink, RouterView } from 'vue-router'
import { ScanLine, ArrowDownToLine, ArrowUpFromLine } from '@lucide/vue'
import AppSidebar from '@/components/AppSidebar.vue'
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'

const route = useRoute()

const routeMetaTitle = computed(() => {
  return (route.meta?.title as string) || 'Dashboard'
})

const routeMetaSection = computed(() => {
  return (route.meta?.section as string) || 'Main'
})
</script>

<template>
  <SidebarProvider>
    <AppSidebar class="no-print" />
    <SidebarInset class="flex flex-col min-h-svh bg-background">
      <!-- Top Bar Contract Header -->
      <header class="no-print flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border/70 px-4 md:px-6 transition-[width,height] ease-linear">
        <div class="flex items-center gap-3">
          <SidebarTrigger class="-ml-1" />
          <Separator orientation="vertical" class="h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem class="hidden md:inline-flex">
                <BreadcrumbLink as-child>
                  <RouterLink to="/dashboard" class="text-xs text-muted-foreground hover:text-foreground">
                    {{ routeMetaSection }}
                  </RouterLink>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator class="hidden md:inline-flex" />
              <BreadcrumbItem>
                <BreadcrumbPage class="text-xs font-semibold text-foreground">
                  {{ routeMetaTitle }}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <!-- Quick Access Actions -->
        <div class="flex items-center gap-2">
          <Button variant="outline" size="sm" as-child class="h-8 gap-1.5 text-xs">
            <RouterLink to="/barcode-scanner">
              <ScanLine class="size-3.5" />
              <span class="hidden sm:inline">Scanner</span>
            </RouterLink>
          </Button>

          <Button variant="outline" size="sm" as-child class="h-8 gap-1.5 text-xs">
            <RouterLink to="/stock-in">
              <ArrowDownToLine class="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span class="hidden sm:inline">Stock In</span>
            </RouterLink>
          </Button>

          <Button variant="outline" size="sm" as-child class="h-8 gap-1.5 text-xs">
            <RouterLink to="/stock-out">
              <ArrowUpFromLine class="size-3.5 text-amber-600 dark:text-amber-400" />
              <span class="hidden sm:inline">Stock Out</span>
            </RouterLink>
          </Button>
        </div>
      </header>

      <!-- Main Content Viewport -->
      <main class="flex-1 p-4 md:p-6 overflow-y-auto">
        <RouterView />
      </main>
    </SidebarInset>
  </SidebarProvider>
</template>
