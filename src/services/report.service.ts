import type { Product, InventoryTransaction } from '@/database/core/database.types'

export class ReportService {
  /**
   * Converts array of objects to CSV string
   */
  static convertToCsv(headers: string[], rows: (string | number)[][]): string {
    const escapeCell = (val: string | number) => {
      const str = String(val ?? '')
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const headerLine = headers.map(escapeCell).join(',')
    const dataLines = rows.map(row => row.map(escapeCell).join(','))
    return [headerLine, ...dataLines].join('\r\n')
  }

  /**
   * Triggers download of CSV in browser
   */
  static downloadCsv(filename: string, csvContent: string): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  /**
   * Export Products list
   */
  static exportProductsCsv(products: Product[]): void {
    const headers = [
      'Product ID',
      'Product Name',
      'SKU',
      'Barcode',
      'Barcode Format',
      'Current Stock',
      'Min Stock Level',
      'Cost Price (PHP)',
      'Selling Price (PHP)',
      'Total Cost Value (PHP)',
      'Total Retail Value (PHP)',
      'Status',
      'Created Date',
    ]

    const rows = products.map(p => [
      p.id,
      p.name,
      p.sku,
      p.barcode,
      p.barcodeFormat,
      p.currentStock,
      p.minStockLevel,
      p.costPrice.toFixed(2),
      p.sellingPrice.toFixed(2),
      (p.currentStock * p.costPrice).toFixed(2),
      (p.currentStock * p.sellingPrice).toFixed(2),
      p.status,
      p.createdAt.slice(0, 10),
    ])

    const csv = this.convertToCsv(headers, rows)
    this.downloadCsv('inventory_stock_report', csv)
  }

  /**
   * Export Transactions history
   */
  static exportTransactionsCsv(transactions: InventoryTransaction[], productsMap: Record<string, Product>): void {
    const headers = [
      'Transaction ID',
      'Date & Time',
      'Type',
      'Product Name',
      'SKU',
      'Barcode',
      'Qty Changed',
      'Previous Stock',
      'New Stock',
      'Reference No',
      'Party / Destination',
      'User',
      'Remarks',
    ]

    const rows = transactions.map(t => {
      const prod = productsMap[t.productId]
      return [
        t.id,
        t.transactionDate.replace('T', ' ').slice(0, 19),
        t.type.toUpperCase(),
        prod ? prod.name : 'Unknown Product',
        prod ? prod.sku : '-',
        prod ? prod.barcode : '-',
        t.quantityChanged,
        t.previousStock,
        t.newStock,
        t.referenceNumber,
        t.destinationOrSupplier,
        t.user,
        t.remarks || '',
      ]
    })

    const csv = this.convertToCsv(headers, rows)
    this.downloadCsv('inventory_movement_history', csv)
  }
}
