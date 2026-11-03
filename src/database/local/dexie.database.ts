import Dexie, { type EntityTable } from 'dexie'
import type {
  Product,
  Category,
  Brand,
  UnitOfMeasurement,
  Supplier,
  InventoryTransaction,
} from '../core/database.types'

export class DmbInventoryDexie extends Dexie {
  products!: EntityTable<Product, 'id'>
  categories!: EntityTable<Category, 'id'>
  brands!: EntityTable<Brand, 'id'>
  units!: EntityTable<UnitOfMeasurement, 'id'>
  suppliers!: EntityTable<Supplier, 'id'>
  transactions!: EntityTable<InventoryTransaction, 'id'>

  constructor() {
    super('DmbInventoryDB')

    // Version 1 Schema
    this.version(1).stores({
      products: 'id, sku, barcode, name, categoryId, brandId, supplierId, status, currentStock, minStockLevel, createdAt, updatedAt',
      categories: 'id, name, slug, createdAt',
      brands: 'id, name, createdAt',
      units: 'id, name, abbreviation, createdAt',
      suppliers: 'id, name, contactPerson, email, phone, createdAt',
      transactions: 'id, productId, type, referenceNumber, transactionDate, createdAt',
    })
  }
}

export const localDb = new DmbInventoryDexie()
