import type { DmbInventoryDexie } from './dexie.database'
import type {
  Category,
  Brand,
  UnitOfMeasurement,
  Supplier,
  Product,
  InventoryTransaction,
} from '../core/database.types'

export async function seedDemoData(db: DmbInventoryDexie): Promise<void> {
  const now = new Date().toISOString()

  // Categories
  const categories: Category[] = [
    { id: 'cat-electronics', name: 'Electronics', slug: 'electronics', description: 'Gadgets, hardware, and components', createdAt: now, updatedAt: now, syncStatus: 'synced' },
    { id: 'cat-office', name: 'Office Supplies', slug: 'office-supplies', description: 'Stationery, paper, and desk equipment', createdAt: now, updatedAt: now, syncStatus: 'synced' },
    { id: 'cat-packaging', name: 'Packaging', slug: 'packaging', description: 'Boxes, bubble wrap, and adhesive tape', createdAt: now, updatedAt: now, syncStatus: 'synced' },
    { id: 'cat-apparel', name: 'Apparel & Uniforms', slug: 'apparel', description: 'Workwear, vests, and safety gear', createdAt: now, updatedAt: now, syncStatus: 'synced' },
  ]

  // Brands
  const brands: Brand[] = [
    { id: 'brand-logitech', name: 'Logitech', createdAt: now, updatedAt: now, syncStatus: 'synced' },
    { id: 'brand-hp', name: 'HP', createdAt: now, updatedAt: now, syncStatus: 'synced' },
    { id: 'brand-3m', name: '3M Industrial', createdAt: now, updatedAt: now, syncStatus: 'synced' },
    { id: 'brand-zebra', name: 'Zebra Tech', createdAt: now, updatedAt: now, syncStatus: 'synced' },
  ]

  // Units
  const units: UnitOfMeasurement[] = [
    { id: 'unit-pcs', name: 'Pieces', abbreviation: 'pcs', createdAt: now, updatedAt: now, syncStatus: 'synced' },
    { id: 'unit-box', name: 'Box (12 pcs)', abbreviation: 'box', createdAt: now, updatedAt: now, syncStatus: 'synced' },
    { id: 'unit-roll', name: 'Roll', abbreviation: 'roll', createdAt: now, updatedAt: now, syncStatus: 'synced' },
    { id: 'unit-kg', name: 'Kilogram', abbreviation: 'kg', createdAt: now, updatedAt: now, syncStatus: 'synced' },
  ]

  // Suppliers
  const suppliers: Supplier[] = [
    { id: 'sup-techsource', name: 'TechSource Distributors', contactPerson: 'Alex Rivera', phone: '+1 555-0192', email: 'alex@techsource.com', address: '742 Evergreen Terrace, Springfield', reference: 'SUP-2026-01', createdAt: now, updatedAt: now, syncStatus: 'synced' },
    { id: 'sup-globalpack', name: 'Global Pack Solutions', contactPerson: 'Elena Rostova', phone: '+1 555-0283', email: 'elena@globalpack.com', address: '100 Industrial Parkway, Chicago, IL', reference: 'SUP-2026-02', createdAt: now, updatedAt: now, syncStatus: 'synced' },
    { id: 'sup-apex', name: 'Apex Logistics Supply', contactPerson: 'Marcus Vance', phone: '+1 555-0374', email: 'marcus@apexlogistics.com', address: '500 Harbor Boulevard, Long Beach, CA', reference: 'SUP-2026-03', createdAt: now, updatedAt: now, syncStatus: 'synced' },
  ]

  // Products
  const products: Product[] = [
    {
      id: 'prod-001',
      name: 'Wireless Barcode Scanner Gun 2.4G',
      sku: 'WBS-24G-01',
      barcode: '793573194012',
      barcodeFormat: 'CODE128',
      categoryId: 'cat-electronics',
      brandId: 'brand-zebra',
      unitId: 'unit-pcs',
      supplierId: 'sup-techsource',
      description: 'Handheld wireless laser barcode scanner with charging cradle and USB receiver dongle.',
      costPrice: 42.50,
      sellingPrice: 79.99,
      currentStock: 35,
      minStockLevel: 10,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      syncStatus: 'synced',
    },
    {
      id: 'prod-002',
      name: 'Heavy Duty Packaging Tape 48mm x 66m',
      sku: 'HDP-TAPE-48',
      barcode: '890123456789',
      barcodeFormat: 'CODE128',
      categoryId: 'cat-packaging',
      brandId: 'brand-3m',
      unitId: 'unit-roll',
      supplierId: 'sup-globalpack',
      description: 'Clear acrylic carton sealing tape, high tensile strength.',
      costPrice: 1.80,
      sellingPrice: 3.99,
      currentStock: 120,
      minStockLevel: 30,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      syncStatus: 'synced',
    },
    {
      id: 'prod-003',
      name: 'Direct Thermal Shipping Labels 4x6 (Roll)',
      sku: 'DTL-4X6-500',
      barcode: '9780201379624',
      barcodeFormat: 'EAN13',
      categoryId: 'cat-packaging',
      brandId: 'brand-zebra',
      unitId: 'unit-roll',
      supplierId: 'sup-globalpack',
      description: 'Fan-fold self-adhesive labels for standard desktop barcode printers (500 labels/roll).',
      costPrice: 6.20,
      sellingPrice: 12.50,
      currentStock: 4,
      minStockLevel: 15, // LOW STOCK
      status: 'active',
      createdAt: now,
      updatedAt: now,
      syncStatus: 'synced',
    },
    {
      id: 'prod-004',
      name: 'Mechanical High-Vis Warehouse Keypad',
      sku: 'MHK-RGB-09',
      barcode: '7891234567890',
      barcodeFormat: 'EAN13',
      categoryId: 'cat-electronics',
      brandId: 'brand-logitech',
      unitId: 'unit-pcs',
      supplierId: 'sup-techsource',
      description: 'Rugged dust-proof numeric keypad for warehouse workstations.',
      costPrice: 28.00,
      sellingPrice: 49.00,
      currentStock: 0, // OUT OF STOCK
      minStockLevel: 5,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      syncStatus: 'synced',
    },
  ]

  // Transactions
  const transactions: InventoryTransaction[] = [
    {
      id: 'tx-001',
      productId: 'prod-001',
      type: 'stock_in',
      quantityChanged: 35,
      previousStock: 0,
      newStock: 35,
      referenceNumber: 'PO-2026-8801',
      destinationOrSupplier: 'TechSource Distributors',
      remarks: 'Initial stock intake from purchase order',
      user: 'Administrator',
      transactionDate: now,
      createdAt: now,
      syncStatus: 'synced',
    },
    {
      id: 'tx-002',
      productId: 'prod-002',
      type: 'stock_in',
      quantityChanged: 150,
      previousStock: 0,
      newStock: 150,
      referenceNumber: 'PO-2026-8802',
      destinationOrSupplier: 'Global Pack Solutions',
      remarks: 'Bulk carton shipment received',
      user: 'Administrator',
      transactionDate: now,
      createdAt: now,
      syncStatus: 'synced',
    },
    {
      id: 'tx-003',
      productId: 'prod-002',
      type: 'stock_out',
      quantityChanged: -30,
      previousStock: 150,
      newStock: 120,
      referenceNumber: 'DISP-7740',
      destinationOrSupplier: 'Fulfillment Station B',
      remarks: 'Released for packaging operations',
      user: 'Warehouse Supervisor',
      transactionDate: now,
      createdAt: now,
      syncStatus: 'synced',
    },
  ]

  await db.transaction('rw', [db.categories, db.brands, db.units, db.suppliers, db.products, db.transactions], async () => {
    await db.categories.bulkPut(categories)
    await db.brands.bulkPut(brands)
    await db.units.bulkPut(units)
    await db.suppliers.bulkPut(suppliers)
    await db.products.bulkPut(products)
    await db.transactions.bulkPut(transactions)
  })
}
