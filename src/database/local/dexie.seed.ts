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
    { id: 'cat-electronics', name: 'Electronics & Hardware', slug: 'electronics', description: 'Scanners, thermal printers, and POS peripherals', createdAt: now, updatedAt: now, syncStatus: 'synced' },
    { id: 'cat-office', name: 'Office Supplies', slug: 'office-supplies', description: 'Stationery, paper, and desk equipment', createdAt: now, updatedAt: now, syncStatus: 'synced' },
    { id: 'cat-packaging', name: 'Packaging Materials', slug: 'packaging', description: 'Corrugated boxes, thermal rolls, and adhesive tape', createdAt: now, updatedAt: now, syncStatus: 'synced' },
    { id: 'cat-apparel', name: 'Safety & Workwear', slug: 'apparel', description: 'High-vis vests, work gloves, and PPE', createdAt: now, updatedAt: now, syncStatus: 'synced' },
  ]

  // Brands
  const brands: Brand[] = [
    { id: 'brand-logitech', name: 'Logitech', createdAt: now, updatedAt: now, syncStatus: 'synced' },
    { id: 'brand-hp', name: 'HP', createdAt: now, updatedAt: now, syncStatus: 'synced' },
    { id: 'brand-3m', name: '3M Philippines', createdAt: now, updatedAt: now, syncStatus: 'synced' },
    { id: 'brand-zebra', name: 'Zebra Technologies', createdAt: now, updatedAt: now, syncStatus: 'synced' },
  ]

  // Units
  const units: UnitOfMeasurement[] = [
    { id: 'unit-pcs', name: 'Pieces', abbreviation: 'pcs', createdAt: now, updatedAt: now, syncStatus: 'synced' },
    { id: 'unit-box', name: 'Box (12 pcs)', abbreviation: 'box', createdAt: now, updatedAt: now, syncStatus: 'synced' },
    { id: 'unit-roll', name: 'Roll', abbreviation: 'roll', createdAt: now, updatedAt: now, syncStatus: 'synced' },
    { id: 'unit-kg', name: 'Kilogram', abbreviation: 'kg', createdAt: now, updatedAt: now, syncStatus: 'synced' },
  ]

  // Suppliers (Philippine logistics suppliers)
  const suppliers: Supplier[] = [
    { id: 'sup-techsource', name: 'Metro TechSource Trading Corp.', contactPerson: 'Juan Dela Cruz', phone: '+63 2 8123 4567', email: 'juan@metrotech.ph', address: 'Ortigas Center, Pasig City, Metro Manila', reference: 'SUP-MNL-01', createdAt: now, updatedAt: now, syncStatus: 'synced' },
    { id: 'sup-globalpack', name: 'Pacific Pack & Paper Solutions', contactPerson: 'Maria Santos', phone: '+63 2 8987 6543', email: 'maria@pacificpack.ph', address: 'Bicutan Industrial Estate, Taguig City', reference: 'SUP-MNL-02', createdAt: now, updatedAt: now, syncStatus: 'synced' },
    { id: 'sup-apex', name: 'Luzon Industrial Supply Inc.', contactPerson: 'Antonio Reyes', phone: '+63 2 8555 1234', email: 'antonio@luzonind.ph', address: 'Calamba Premiere International Park, Laguna', reference: 'SUP-MNL-03', createdAt: now, updatedAt: now, syncStatus: 'synced' },
  ]

  // Products with Philippine Peso (₱) pricing
  const products: Product[] = [
    {
      id: 'prod-001',
      name: 'Wireless Barcode Scanner Gun 2.4G & Bluetooth',
      sku: 'WBS-24G-01',
      barcode: '793573194012',
      barcodeFormat: 'CODE128',
      categoryId: 'cat-electronics',
      brandId: 'brand-zebra',
      unitId: 'unit-pcs',
      supplierId: 'sup-techsource',
      description: 'Handheld wireless laser barcode scanner with charging cradle and USB receiver dongle.',
      costPrice: 1450.00,
      sellingPrice: 2850.00,
      currentStock: 35,
      minStockLevel: 10,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      syncStatus: 'synced',
    },
    {
      id: 'prod-002',
      name: 'Heavy Duty Packaging Tape 48mm x 66m (Box of 36)',
      sku: 'HDP-TAPE-48',
      barcode: '890123456789',
      barcodeFormat: 'CODE128',
      categoryId: 'cat-packaging',
      brandId: 'brand-3m',
      unitId: 'unit-box',
      supplierId: 'sup-globalpack',
      description: 'Clear acrylic carton sealing tape, high tensile strength for logistics dispatch.',
      costPrice: 980.00,
      sellingPrice: 1650.00,
      currentStock: 48,
      minStockLevel: 15,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      syncStatus: 'synced',
    },
    {
      id: 'prod-003',
      name: 'Direct Thermal Shipping Labels 100x150mm (Roll)',
      sku: 'DTL-4X6-500',
      barcode: '9780201379624',
      barcodeFormat: 'EAN13',
      categoryId: 'cat-packaging',
      brandId: 'brand-zebra',
      unitId: 'unit-roll',
      supplierId: 'sup-globalpack',
      description: 'Fan-fold self-adhesive labels for standard desktop barcode printers (500 labels/roll).',
      costPrice: 280.00,
      sellingPrice: 540.00,
      currentStock: 4,
      minStockLevel: 15, // LOW STOCK
      status: 'active',
      createdAt: now,
      updatedAt: now,
      syncStatus: 'synced',
    },
    {
      id: 'prod-004',
      name: 'Mechanical High-Vis Warehouse Keypad & Number Pad',
      sku: 'MHK-RGB-09',
      barcode: '7891234567890',
      barcodeFormat: 'EAN13',
      categoryId: 'cat-electronics',
      brandId: 'brand-logitech',
      unitId: 'unit-pcs',
      supplierId: 'sup-techsource',
      description: 'Rugged dust-proof numeric keypad for warehouse tally workstations.',
      costPrice: 1100.00,
      sellingPrice: 1950.00,
      currentStock: 0, // OUT OF STOCK
      minStockLevel: 5,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      syncStatus: 'synced',
    },
    {
      id: 'prod-005',
      name: 'High-Density 2D QR Asset Tracking Stickers (Sheet)',
      sku: 'QR-TAG-2026',
      barcode: 'DMBB-QR-9901',
      barcodeFormat: 'CODE128',
      categoryId: 'cat-packaging',
      brandId: 'brand-zebra',
      unitId: 'unit-pcs',
      supplierId: 'sup-globalpack',
      description: 'Weatherproof vinyl QR tracking tags with scratch-resistant coating.',
      costPrice: 15.00,
      sellingPrice: 45.00,
      currentStock: 250,
      minStockLevel: 50,
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
      destinationOrSupplier: 'Metro TechSource Trading Corp.',
      remarks: 'Initial stock intake from purchase order',
      user: 'Warehouse Supervisor',
      transactionDate: now,
      createdAt: now,
      syncStatus: 'synced',
    },
    {
      id: 'tx-002',
      productId: 'prod-002',
      type: 'stock_in',
      quantityChanged: 50,
      previousStock: 0,
      newStock: 50,
      referenceNumber: 'PO-2026-8802',
      destinationOrSupplier: 'Pacific Pack & Paper Solutions',
      remarks: 'Carton tape shipment received',
      user: 'Receiving Clerk',
      transactionDate: now,
      createdAt: now,
      syncStatus: 'synced',
    },
    {
      id: 'tx-003',
      productId: 'prod-002',
      type: 'stock_out',
      quantityChanged: -2,
      previousStock: 50,
      newStock: 48,
      referenceNumber: 'DISP-7740',
      destinationOrSupplier: 'Dispatch Station 3',
      remarks: 'Released for packaging operations',
      user: 'Operations Officer',
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
