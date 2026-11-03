import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { AuthService } from '@/services/auth.service'
import AppLayout from '@/layouts/AppLayout.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/pages/LoginViews.vue'),
    meta: { public: true, title: 'Authentication' },
  },
  {
    path: '/',
    component: AppLayout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/pages/DashboardView.vue'),
        meta: { section: 'Main', title: 'Dashboard' },
      },
      {
        path: 'products',
        name: 'Products',
        component: () => import('@/pages/ProductsView.vue'),
        meta: { section: 'Inventory', title: 'Product Catalog' },
      },
      {
        path: 'products/:id',
        name: 'ProductDetail',
        component: () => import('@/pages/ProductDetailView.vue'),
        meta: { section: 'Inventory', title: 'Product Details' },
      },
      {
        path: 'barcode-generator',
        name: 'BarcodeGenerator',
        component: () => import('@/pages/BarcodeGeneratorView.vue'),
        meta: { section: 'Inventory', title: 'Barcode Generator' },
      },
      {
        path: 'barcode-scanner',
        name: 'BarcodeScanner',
        component: () => import('@/pages/BarcodeScannerView.vue'),
        meta: { section: 'Inventory', title: 'Barcode Scanner' },
      },
      {
        path: 'stock-in',
        name: 'StockIn',
        component: () => import('@/pages/StockInView.vue'),
        meta: { section: 'Inventory', title: 'Stock In (Receiving)' },
      },
      {
        path: 'stock-out',
        name: 'StockOut',
        component: () => import('@/pages/StockOutView.vue'),
        meta: { section: 'Inventory', title: 'Stock Out (Dispatch)' },
      },
      {
        path: 'stock-adjustments',
        name: 'StockAdjustments',
        component: () => import('@/pages/StockAdjustmentsView.vue'),
        meta: { section: 'Inventory', title: 'Stock Adjustments' },
      },
      {
        path: 'inventory-history',
        name: 'InventoryHistory',
        component: () => import('@/pages/InventoryHistoryView.vue'),
        meta: { section: 'Inventory', title: 'Movement History' },
      },
      {
        path: 'categories',
        name: 'Categories',
        component: () => import('@/pages/CategoriesView.vue'),
        meta: { section: 'Management', title: 'Categories & Brands' },
      },
      {
        path: 'suppliers',
        name: 'Suppliers',
        component: () => import('@/pages/SuppliersView.vue'),
        meta: { section: 'Management', title: 'Suppliers' },
      },
      {
        path: 'units',
        name: 'Units',
        component: () => import('@/pages/UnitsView.vue'),
        meta: { section: 'Management', title: 'Units of Measure' },
      },
      {
        path: 'reports',
        name: 'Reports',
        component: () => import('@/pages/ReportsView.vue'),
        meta: { section: 'Reports', title: 'Inventory Reports' },
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/pages/SettingsView.vue'),
        meta: { section: 'System', title: 'Settings & Data' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/pages/NotFoundView.vue'),
    meta: { public: true, title: 'Not Found' },
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, _from, next) => {
  const isPublic = to.matched.some(record => record.meta.public)
  const authenticated = AuthService.isAuthenticated()

  if (!isPublic && !authenticated) {
    next({ path: '/login', query: { redirect: to.fullPath } })
  } else if (to.path === '/login' && authenticated) {
    next({ path: '/dashboard' })
  } else {
    next()
  }
})
