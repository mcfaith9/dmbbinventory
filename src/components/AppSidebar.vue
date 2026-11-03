<script setup lang="ts">
import type { SidebarProps } from '@/components/ui/sidebar'
import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import {
  Boxes,
  LayoutDashboard,
  Package,
  ScanLine,
  Barcode,
  ArrowDownToLine,
  ArrowUpFromLine,
  SlidersHorizontal,
  History,
  FolderTree,
  Truck,
  Ruler,
  BarChart3,
  Settings,
  UsersRound,
} from "@lucide/vue"
import NavUser from '@/components/NavUser.vue'
import { AuthService } from '@/services/auth.service'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar'

const props = withDefaults(defineProps<SidebarProps>(), {
  collapsible: "icon",
})

const route = useRoute()
const currentUser = computed(() => AuthService.getUser())

const navigationGroups = [
  {
    label: 'Main',
    items: [
      { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { title: 'Products', path: '/products', icon: Package },
      { title: 'Scanner (Barcode & QR)', path: '/barcode-scanner', icon: ScanLine },
      { title: 'Barcode & QR Generator', path: '/barcode-generator', icon: Barcode },
      { title: 'Stock In', path: '/stock-in', icon: ArrowDownToLine },
      { title: 'Stock Out', path: '/stock-out', icon: ArrowUpFromLine },
      { title: 'Stock Adjustments', path: '/stock-adjustments', icon: SlidersHorizontal },
      { title: 'Inventory History', path: '/inventory-history', icon: History },
    ],
  },
  {
    label: 'Management',
    items: [
      { title: 'Categories', path: '/categories', icon: FolderTree },
      { title: 'Suppliers', path: '/suppliers', icon: Truck },
      { title: 'Units of Measure', path: '/units', icon: Ruler },
      { title: 'Users & Roles', path: '/settings', icon: UsersRound },
    ],
  },
  {
    label: 'Reports',
    items: [
      { title: 'Inventory Reports', path: '/reports', icon: BarChart3 },
    ],
  },
  {
    label: 'System',
    items: [
      { title: 'Settings', path: '/settings', icon: Settings },
    ],
  },
]

function isActive(path: string): boolean {
  if (path === '/products') {
    return route.path === '/products' || route.path.startsWith('/products/')
  }
  return route.path === path
}
</script>

<template>
  <Sidebar v-bind="props">
    <!-- Clean Branding Header replacing TeamSwitcher -->
    <SidebarHeader class="border-b border-sidebar-border/50 py-3">
      <div class="flex items-center gap-2.5 px-2">
        <div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
          <Boxes class="size-4" />
        </div>
        <div class="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
          <span class="truncate font-semibold tracking-tight text-foreground">DMBB Inventory</span>
          <span class="truncate text-xs text-muted-foreground">Barcode & Stock Control</span>
        </div>
      </div>
    </SidebarHeader>

    <SidebarContent class="py-2">
      <SidebarGroup v-for="group in navigationGroups" :key="group.label">
        <SidebarGroupLabel class="text-xs font-medium tracking-wider text-muted-foreground uppercase">
          {{ group.label }}
        </SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem v-for="item in group.items" :key="item.path">
            <SidebarMenuButton
              as-child
              :is-active="isActive(item.path)"
              :tooltip="item.title"
              class="transition-colors"
            >
              <RouterLink :to="item.path">
                <component :is="item.icon" class="size-4 shrink-0" />
                <span class="truncate font-medium">{{ item.title }}</span>
              </RouterLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </SidebarContent>

    <SidebarFooter class="border-t border-sidebar-border/50 p-2">
      <NavUser :user="currentUser" />
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
</template>
