export type BarcodeFormat = 'CODE128' | 'EAN13'
export type ProductStatus = 'active' | 'archived'
export type TransactionType = 'stock_in' | 'stock_out' | 'adjustment'
export type SyncStatus = 'synced' | 'pending' | 'conflict'

export interface Product {
  id: string
  name: string
  sku: string
  barcode: string
  barcodeFormat: BarcodeFormat
  categoryId?: string
  brandId?: string
  unitId?: string
  supplierId?: string
  description?: string
  costPrice: number
  sellingPrice: number
  currentStock: number
  minStockLevel: number
  status: ProductStatus
  image?: string
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  syncStatus: SyncStatus
  lastSyncedAt?: string | null
}

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  syncStatus: SyncStatus
}

export interface Brand {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  syncStatus: SyncStatus
}

export interface UnitOfMeasurement {
  id: string
  name: string
  abbreviation: string
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  syncStatus: SyncStatus
}

export interface Supplier {
  id: string
  name: string
  contactPerson: string
  phone: string
  email: string
  address: string
  reference: string
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  syncStatus: SyncStatus
}

export interface InventoryTransaction {
  id: string
  productId: string
  type: TransactionType
  quantityChanged: number
  previousStock: number
  newStock: number
  referenceNumber: string
  destinationOrSupplier: string
  remarks?: string
  user: string
  transactionDate: string
  createdAt: string
  syncStatus: SyncStatus
}

export interface ProductFilter {
  search?: string
  categoryId?: string
  supplierId?: string
  status?: ProductStatus | 'all'
  stockStatus?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'
  sortBy?: 'name' | 'sku' | 'currentStock' | 'createdAt'
  sortDirection?: 'asc' | 'desc'
}

export interface TransactionFilter {
  search?: string
  productId?: string
  type?: TransactionType | 'all'
  startDate?: string
  endDate?: string
  user?: string
}

export interface InventoryDashboardMetrics {
  totalProducts: number
  totalStockQuantity: number
  lowStockItemsCount: number
  outOfStockItemsCount: number
  totalInventoryCostValue: number
  totalInventoryRetailValue: number
}
