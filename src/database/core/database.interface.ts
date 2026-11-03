import type {
  Product,
  Category,
  Brand,
  UnitOfMeasurement,
  Supplier,
  InventoryTransaction,
  ProductFilter,
  TransactionFilter,
} from './database.types'

export interface IProductRepository {
  getAll(filters?: ProductFilter): Promise<Product[]>
  getById(id: string): Promise<Product | undefined>
  getBySku(sku: string): Promise<Product | undefined>
  getByBarcode(barcode: string): Promise<Product | undefined>
  create(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>): Promise<Product>
  update(id: string, updates: Partial<Product>): Promise<Product>
  delete(id: string): Promise<void>
  count(filters?: ProductFilter): Promise<number>
}

export interface ICategoryRepository {
  getAll(): Promise<Category[]>
  getById(id: string): Promise<Category | undefined>
  create(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>): Promise<Category>
  update(id: string, updates: Partial<Category>): Promise<Category>
  delete(id: string): Promise<void>
}

export interface IBrandRepository {
  getAll(): Promise<Brand[]>
  getById(id: string): Promise<Brand | undefined>
  create(brand: Omit<Brand, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>): Promise<Brand>
  update(id: string, updates: Partial<Brand>): Promise<Brand>
  delete(id: string): Promise<void>
}

export interface IUnitRepository {
  getAll(): Promise<UnitOfMeasurement[]>
  getById(id: string): Promise<UnitOfMeasurement | undefined>
  create(unit: Omit<UnitOfMeasurement, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>): Promise<UnitOfMeasurement>
  update(id: string, updates: Partial<UnitOfMeasurement>): Promise<UnitOfMeasurement>
  delete(id: string): Promise<void>
}

export interface ISupplierRepository {
  getAll(): Promise<Supplier[]>
  getById(id: string): Promise<Supplier | undefined>
  create(supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>): Promise<Supplier>
  update(id: string, updates: Partial<Supplier>): Promise<Supplier>
  delete(id: string): Promise<void>
}

export interface ITransactionRepository {
  getAll(filters?: TransactionFilter): Promise<InventoryTransaction[]>
  getById(id: string): Promise<InventoryTransaction | undefined>
  getByProductId(productId: string): Promise<InventoryTransaction[]>
  create(tx: Omit<InventoryTransaction, 'id' | 'createdAt' | 'syncStatus'>): Promise<InventoryTransaction>
}

export interface IInventoryDatabase {
  products: IProductRepository
  categories: ICategoryRepository
  brands: IBrandRepository
  units: IUnitRepository
  suppliers: ISupplierRepository
  transactions: ITransactionRepository
  clearAllData(): Promise<void>
}
