import { getDatabase } from '@/database/core/database.factory'

export const db = getDatabase()
export const productRepo = db.products
export const categoryRepo = db.categories
export const brandRepo = db.brands
export const unitRepo = db.units
export const supplierRepo = db.suppliers
export const transactionRepo = db.transactions
