import { localDb } from '@/database/local/dexie.database'
import { productRepo, transactionRepo } from '@/repositories'
import type { InventoryTransaction } from '@/database/core/database.types'

export interface StockInDto {
  productId: string
  quantity: number
  supplier: string
  referenceNumber: string
  remarks?: string
  user?: string
  transactionDate?: string
}

export interface StockOutDto {
  productId: string
  quantity: number
  destination: string
  referenceNumber: string
  remarks?: string
  user?: string
  transactionDate?: string
}

export interface StockAdjustmentDto {
  productId: string
  newQuantity: number
  reason: string
  referenceNumber: string
  remarks?: string
  user?: string
}

export class InventoryService {
  /**
   * Process Stock In transaction
   */
  static async stockIn(dto: StockInDto): Promise<InventoryTransaction> {
    if (dto.quantity <= 0) {
      throw new Error('Received quantity must be greater than zero.')
    }

    const product = await productRepo.getById(dto.productId)
    if (!product) {
      throw new Error(`Product not found with ID: ${dto.productId}`)
    }

    const previousStock = product.currentStock
    const newStock = previousStock + dto.quantity
    const now = dto.transactionDate || new Date().toISOString()
    const currentUser = dto.user || 'System Admin'

    // Atomic database execution
    return await localDb.transaction('rw', [localDb.products, localDb.transactions], async () => {
      await productRepo.update(product.id, {
        currentStock: newStock,
        updatedAt: new Date().toISOString(),
      })

      const tx = await transactionRepo.create({
        productId: product.id,
        type: 'stock_in',
        quantityChanged: dto.quantity,
        previousStock,
        newStock,
        referenceNumber: dto.referenceNumber.trim() || `IN-${Date.now().toString().slice(-6)}`,
        destinationOrSupplier: dto.supplier.trim() || 'General Receiving',
        remarks: dto.remarks?.trim() || '',
        user: currentUser,
        transactionDate: now,
      })

      return tx
    })
  }

  /**
   * Process Stock Out transaction with strict negative stock prevention
   */
  static async stockOut(dto: StockOutDto): Promise<InventoryTransaction> {
    if (dto.quantity <= 0) {
      throw new Error('Released quantity must be greater than zero.')
    }

    const product = await productRepo.getById(dto.productId)
    if (!product) {
      throw new Error(`Product not found with ID: ${dto.productId}`)
    }

    if (product.currentStock < dto.quantity) {
      throw new Error(
        `Insufficient stock for "${product.name}". Available: ${product.currentStock}, Requested: ${dto.quantity}.`
      )
    }

    const previousStock = product.currentStock
    const newStock = previousStock - dto.quantity
    const now = dto.transactionDate || new Date().toISOString()
    const currentUser = dto.user || 'System Admin'

    return await localDb.transaction('rw', [localDb.products, localDb.transactions], async () => {
      await productRepo.update(product.id, {
        currentStock: newStock,
        updatedAt: new Date().toISOString(),
      })

      const tx = await transactionRepo.create({
        productId: product.id,
        type: 'stock_out',
        quantityChanged: -dto.quantity,
        previousStock,
        newStock,
        referenceNumber: dto.referenceNumber.trim() || `OUT-${Date.now().toString().slice(-6)}`,
        destinationOrSupplier: dto.destination.trim() || 'General Dispatch',
        remarks: dto.remarks?.trim() || '',
        user: currentUser,
        transactionDate: now,
      })

      return tx
    })
  }

  /**
   * Process Stock Adjustment transaction (reconciliation)
   */
  static async adjustStock(dto: StockAdjustmentDto): Promise<InventoryTransaction> {
    if (dto.newQuantity < 0) {
      throw new Error('New adjusted quantity cannot be negative.')
    }

    const product = await productRepo.getById(dto.productId)
    if (!product) {
      throw new Error(`Product not found with ID: ${dto.productId}`)
    }

    const previousStock = product.currentStock
    const difference = dto.newQuantity - previousStock

    if (difference === 0) {
      throw new Error('New quantity is identical to existing quantity. No adjustment needed.')
    }

    const now = new Date().toISOString()
    const currentUser = dto.user || 'System Admin'
    const fullRemarks = `Reason: ${dto.reason}${dto.remarks ? ` | Note: ${dto.remarks}` : ''}`

    return await localDb.transaction('rw', [localDb.products, localDb.transactions], async () => {
      await productRepo.update(product.id, {
        currentStock: dto.newQuantity,
        updatedAt: now,
      })

      const tx = await transactionRepo.create({
        productId: product.id,
        type: 'adjustment',
        quantityChanged: difference,
        previousStock,
        newStock: dto.newQuantity,
        referenceNumber: dto.referenceNumber.trim() || `ADJ-${Date.now().toString().slice(-6)}`,
        destinationOrSupplier: 'Physical Audit',
        remarks: fullRemarks,
        user: currentUser,
        transactionDate: now,
      })

      return tx
    })
  }

  /**
   * Retrieves summary metrics for dashboard and reports
   */
  static async getInventoryMetrics(): Promise<{
    totalProducts: number
    totalStockQuantity: number
    lowStockCount: number
    outOfStockCount: number
    totalCostValuation: number
    totalRetailValuation: number
  }> {
    const products = await productRepo.getAll({ status: 'active' })

    let totalStockQuantity = 0
    let lowStockCount = 0
    let outOfStockCount = 0
    let totalCostValuation = 0
    let totalRetailValuation = 0

    for (const p of products) {
      totalStockQuantity += p.currentStock
      totalCostValuation += p.currentStock * (p.costPrice || 0)
      totalRetailValuation += p.currentStock * (p.sellingPrice || 0)

      if (p.currentStock <= 0) {
        outOfStockCount++
      } else if (p.currentStock <= p.minStockLevel) {
        lowStockCount++
      }
    }

    return {
      totalProducts: products.length,
      totalStockQuantity,
      lowStockCount,
      outOfStockCount,
      totalCostValuation,
      totalRetailValuation,
    }
  }
}
