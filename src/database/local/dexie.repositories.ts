import type {
  Product,
  Category,
  Brand,
  UnitOfMeasurement,
  Supplier,
  InventoryTransaction,
  ProductFilter,
  TransactionFilter,
} from '../core/database.types'
import type {
  IProductRepository,
  ICategoryRepository,
  IBrandRepository,
  IUnitRepository,
  ISupplierRepository,
  ITransactionRepository,
  IInventoryDatabase,
} from '../core/database.interface'
import { localDb, DmbInventoryDexie } from './dexie.database'

export class DexieProductRepository implements IProductRepository {
  private db: DmbInventoryDexie

  constructor(db: DmbInventoryDexie) {
    this.db = db
  }

  async getAll(filters?: ProductFilter): Promise<Product[]> {
    const collection = this.db.products.toCollection()
    let results = await collection.toArray()
    results = results.filter(p => !p.deletedAt)

    if (filters) {
      if (filters.search) {
        const query = filters.search.toLowerCase().trim()
        results = results.filter(
          p =>
            p.name.toLowerCase().includes(query) ||
            p.sku.toLowerCase().includes(query) ||
            p.barcode.toLowerCase().includes(query)
        )
      }

      if (filters.categoryId && filters.categoryId !== 'all') {
        results = results.filter(p => p.categoryId === filters.categoryId)
      }

      if (filters.supplierId && filters.supplierId !== 'all') {
        results = results.filter(p => p.supplierId === filters.supplierId)
      }

      if (filters.status && filters.status !== 'all') {
        results = results.filter(p => p.status === filters.status)
      }

      if (filters.stockStatus && filters.stockStatus !== 'all') {
        if (filters.stockStatus === 'in_stock') {
          results = results.filter(p => p.currentStock > p.minStockLevel)
        } else if (filters.stockStatus === 'low_stock') {
          results = results.filter(p => p.currentStock > 0 && p.currentStock <= p.minStockLevel)
        } else if (filters.stockStatus === 'out_of_stock') {
          results = results.filter(p => p.currentStock <= 0)
        }
      }

      const sortBy = filters.sortBy || 'createdAt'
      const sortDirection = filters.sortDirection || 'desc'
      results.sort((a, b) => {
        let valA: any = a[sortBy] ?? ''
        let valB: any = b[sortBy] ?? ''
        if (typeof valA === 'string') valA = valA.toLowerCase()
        if (typeof valB === 'string') valB = valB.toLowerCase()

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return results
  }

  async getById(id: string): Promise<Product | undefined> {
    const p = await this.db.products.get(id)
    return p && !p.deletedAt ? p : undefined
  }

  async getBySku(sku: string): Promise<Product | undefined> {
    const list = await this.db.products.where('sku').equalsIgnoreCase(sku.trim()).toArray()
    return list.find(p => !p.deletedAt)
  }

  async getByBarcode(barcode: string): Promise<Product | undefined> {
    const list = await this.db.products.where('barcode').equals(barcode.trim()).toArray()
    return list.find(p => !p.deletedAt)
  }

  async create(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>): Promise<Product> {
    const existingSku = await this.getBySku(data.sku)
    if (existingSku) {
      throw new Error(`Product with SKU "${data.sku}" already exists.`)
    }
    const existingBarcode = await this.getByBarcode(data.barcode)
    if (existingBarcode) {
      throw new Error(`Product with Barcode "${data.barcode}" already exists.`)
    }

    const now = new Date().toISOString()
    const newProduct: Product = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      syncStatus: 'synced',
      lastSyncedAt: null,
    }

    await this.db.products.add(newProduct)
    return newProduct
  }

  async update(id: string, updates: Partial<Product>): Promise<Product> {
    const current = await this.getById(id)
    if (!current) {
      throw new Error(`Product with ID "${id}" not found.`)
    }

    if (updates.sku && updates.sku.toLowerCase() !== current.sku.toLowerCase()) {
      const existingSku = await this.getBySku(updates.sku)
      if (existingSku && existingSku.id !== id) {
        throw new Error(`Product with SKU "${updates.sku}" already exists.`)
      }
    }

    if (updates.barcode && updates.barcode !== current.barcode) {
      const existingBarcode = await this.getByBarcode(updates.barcode)
      if (existingBarcode && existingBarcode.id !== id) {
        throw new Error(`Product with Barcode "${updates.barcode}" already exists.`)
      }
    }

    const updatedProduct: Product = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    await this.db.products.put(updatedProduct)
    return updatedProduct
  }

  async delete(id: string): Promise<void> {
    const current = await this.getById(id)
    if (current) {
      await this.db.products.update(id, {
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }
  }

  async count(filters?: ProductFilter): Promise<number> {
    const list = await this.getAll(filters)
    return list.length
  }
}

export class DexieCategoryRepository implements ICategoryRepository {
  private db: DmbInventoryDexie

  constructor(db: DmbInventoryDexie) {
    this.db = db
  }

  async getAll(): Promise<Category[]> {
    const list = await this.db.categories.toArray()
    return list.filter(c => !c.deletedAt)
  }

  async getById(id: string): Promise<Category | undefined> {
    const item = await this.db.categories.get(id)
    return item && !item.deletedAt ? item : undefined
  }

  async create(data: Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>): Promise<Category> {
    const now = new Date().toISOString()
    const item: Category = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      syncStatus: 'synced',
    }
    await this.db.categories.add(item)
    return item
  }

  async update(id: string, updates: Partial<Category>): Promise<Category> {
    const current = await this.getById(id)
    if (!current) throw new Error(`Category not found: ${id}`)
    const updated: Category = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    await this.db.categories.put(updated)
    return updated
  }

  async delete(id: string): Promise<void> {
    await this.db.categories.update(id, {
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }
}

export class DexieBrandRepository implements IBrandRepository {
  private db: DmbInventoryDexie

  constructor(db: DmbInventoryDexie) {
    this.db = db
  }

  async getAll(): Promise<Brand[]> {
    const list = await this.db.brands.toArray()
    return list.filter(b => !b.deletedAt)
  }

  async getById(id: string): Promise<Brand | undefined> {
    const item = await this.db.brands.get(id)
    return item && !item.deletedAt ? item : undefined
  }

  async create(data: Omit<Brand, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>): Promise<Brand> {
    const now = new Date().toISOString()
    const item: Brand = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      syncStatus: 'synced',
    }
    await this.db.brands.add(item)
    return item
  }

  async update(id: string, updates: Partial<Brand>): Promise<Brand> {
    const current = await this.getById(id)
    if (!current) throw new Error(`Brand not found: ${id}`)
    const updated: Brand = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    await this.db.brands.put(updated)
    return updated
  }

  async delete(id: string): Promise<void> {
    await this.db.brands.update(id, {
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }
}

export class DexieUnitRepository implements IUnitRepository {
  private db: DmbInventoryDexie

  constructor(db: DmbInventoryDexie) {
    this.db = db
  }

  async getAll(): Promise<UnitOfMeasurement[]> {
    const list = await this.db.units.toArray()
    return list.filter(u => !u.deletedAt)
  }

  async getById(id: string): Promise<UnitOfMeasurement | undefined> {
    const item = await this.db.units.get(id)
    return item && !item.deletedAt ? item : undefined
  }

  async create(data: Omit<UnitOfMeasurement, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>): Promise<UnitOfMeasurement> {
    const now = new Date().toISOString()
    const item: UnitOfMeasurement = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      syncStatus: 'synced',
    }
    await this.db.units.add(item)
    return item
  }

  async update(id: string, updates: Partial<UnitOfMeasurement>): Promise<UnitOfMeasurement> {
    const current = await this.getById(id)
    if (!current) throw new Error(`Unit not found: ${id}`)
    const updated: UnitOfMeasurement = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    await this.db.units.put(updated)
    return updated
  }

  async delete(id: string): Promise<void> {
    await this.db.units.update(id, {
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }
}

export class DexieSupplierRepository implements ISupplierRepository {
  private db: DmbInventoryDexie

  constructor(db: DmbInventoryDexie) {
    this.db = db
  }

  async getAll(): Promise<Supplier[]> {
    const list = await this.db.suppliers.toArray()
    return list.filter(s => !s.deletedAt)
  }

  async getById(id: string): Promise<Supplier | undefined> {
    const item = await this.db.suppliers.get(id)
    return item && !item.deletedAt ? item : undefined
  }

  async create(data: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>): Promise<Supplier> {
    const now = new Date().toISOString()
    const item: Supplier = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      syncStatus: 'synced',
    }
    await this.db.suppliers.add(item)
    return item
  }

  async update(id: string, updates: Partial<Supplier>): Promise<Supplier> {
    const current = await this.getById(id)
    if (!current) throw new Error(`Supplier not found: ${id}`)
    const updated: Supplier = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    await this.db.suppliers.put(updated)
    return updated
  }

  async delete(id: string): Promise<void> {
    await this.db.suppliers.update(id, {
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }
}

export class DexieTransactionRepository implements ITransactionRepository {
  private db: DmbInventoryDexie

  constructor(db: DmbInventoryDexie) {
    this.db = db
  }

  async getAll(filters?: TransactionFilter): Promise<InventoryTransaction[]> {
    let list = await this.db.transactions.toArray()

    if (filters) {
      if (filters.search) {
        const q = filters.search.toLowerCase().trim()
        list = list.filter(
          t =>
            t.referenceNumber.toLowerCase().includes(q) ||
            t.destinationOrSupplier.toLowerCase().includes(q) ||
            (t.remarks && t.remarks.toLowerCase().includes(q))
        )
      }

      if (filters.productId && filters.productId !== 'all') {
        list = list.filter(t => t.productId === filters.productId)
      }

      if (filters.type && filters.type !== 'all') {
        list = list.filter(t => t.type === filters.type)
      }

      if (filters.startDate) {
        list = list.filter(t => t.transactionDate >= filters.startDate!)
      }

      if (filters.endDate) {
        list = list.filter(t => t.transactionDate <= filters.endDate!)
      }

      if (filters.user) {
        const u = filters.user.toLowerCase()
        list = list.filter(t => t.user.toLowerCase().includes(u))
      }
    }

    list.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate))
    return list
  }

  async getById(id: string): Promise<InventoryTransaction | undefined> {
    return this.db.transactions.get(id)
  }

  async getByProductId(productId: string): Promise<InventoryTransaction[]> {
    const list = await this.db.transactions.where('productId').equals(productId).toArray()
    list.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate))
    return list
  }

  async create(data: Omit<InventoryTransaction, 'id' | 'createdAt' | 'syncStatus'>): Promise<InventoryTransaction> {
    const item: InventoryTransaction = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      syncStatus: 'synced',
    }
    await this.db.transactions.add(item)
    return item
  }
}

export class DexieInventoryDatabase implements IInventoryDatabase {
  products: IProductRepository
  categories: ICategoryRepository
  brands: IBrandRepository
  units: IUnitRepository
  suppliers: ISupplierRepository
  transactions: ITransactionRepository
  private db: DmbInventoryDexie

  constructor(db: DmbInventoryDexie = localDb) {
    this.db = db
    this.products = new DexieProductRepository(this.db)
    this.categories = new DexieCategoryRepository(this.db)
    this.brands = new DexieBrandRepository(this.db)
    this.units = new DexieUnitRepository(this.db)
    this.suppliers = new DexieSupplierRepository(this.db)
    this.transactions = new DexieTransactionRepository(this.db)
  }

  async clearAllData(): Promise<void> {
    await this.db.transaction('rw', [
      this.db.products,
      this.db.categories,
      this.db.brands,
      this.db.units,
      this.db.suppliers,
      this.db.transactions,
    ], async () => {
      await this.db.products.clear()
      await this.db.categories.clear()
      await this.db.brands.clear()
      await this.db.units.clear()
      await this.db.suppliers.clear()
      await this.db.transactions.clear()
    })
  }
}
