import JsBarcode from 'jsbarcode'
import type { BarcodeFormat } from '@/database/core/database.types'

export class BarcodeService {
  /**
   * Calculates official EAN-13 checksum for 12 digits
   */
  static calculateEan13Checksum(digits12: string): number {
    if (digits12.length !== 12 || !/^\d+$/.test(digits12)) {
      throw new Error('EAN-13 base must be exactly 12 numeric digits.')
    }

    let sum = 0
    for (let i = 0; i < 12; i++) {
      const num = parseInt(digits12[i]!, 10)
      sum += i % 2 === 0 ? num : num * 3
    }
    const remainder = sum % 10
    return remainder === 0 ? 0 : 10 - remainder
  }

  /**
   * Generates a unique barcode for products based on chosen symbology
   */
  static generateBarcodeNumber(format: BarcodeFormat = 'CODE128', prefix: string = '79'): string {
    if (format === 'EAN13') {
      // 12 digits + 1 checksum digit
      // Prefix with 2 digits (e.g. '79' or '20' internal), then 10 random digits
      let base = prefix.slice(0, 2)
      while (base.length < 12) {
        base += Math.floor(Math.random() * 10).toString()
      }
      const checksum = this.calculateEan13Checksum(base)
      return `${base}${checksum}`
    } else {
      // CODE128: Alphanumeric barcode (12 characters standard)
      const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      let result = 'DMB'
      for (let i = 0; i < 9; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return result
    }
  }

  /**
   * Generates a clean human-readable SKU
   */
  static generateSku(productName: string = '', categoryPrefix: string = 'INV'): string {
    const cleanPrefix = categoryPrefix.slice(0, 3).toUpperCase() || 'INV'
    const namePart = productName
      .trim()
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 3)
      .toUpperCase() || 'ITM'
    const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString()
    return `${cleanPrefix}-${namePart}-${randomSuffix}`
  }

  /**
   * Validates a barcode string for a given format
   */
  static isValidBarcode(barcode: string, format: BarcodeFormat): boolean {
    if (!barcode || barcode.trim() === '') return false

    if (format === 'EAN13') {
      if (!/^\d{13}$/.test(barcode)) return false
      const base = barcode.slice(0, 12)
      const expectedChecksum = this.calculateEan13Checksum(base)
      return parseInt(barcode[12]!, 10) === expectedChecksum
    }

    // Code 128 accepts most ASCII characters
    return barcode.length >= 3 && barcode.length <= 48
  }

  /**
   * Renders barcode into an SVG or Canvas element using JsBarcode
   */
  static renderBarcode(
    element: SVGElement | HTMLCanvasElement,
    text: string,
    format: BarcodeFormat = 'CODE128',
    options: {
      width?: number
      height?: number
      displayValue?: boolean
      fontSize?: number
      margin?: number
      background?: string
      lineColor?: string
    } = {}
  ): void {
    if (!text || text.trim() === '') return

    try {
      JsBarcode(element, text, {
        format: format === 'EAN13' ? 'EAN13' : 'CODE128',
        width: options.width ?? 2,
        height: options.height ?? 60,
        displayValue: options.displayValue ?? true,
        font: 'monospace',
        fontSize: options.fontSize ?? 14,
        textMargin: 4,
        margin: options.margin ?? 10,
        background: options.background ?? '#ffffff',
        lineColor: options.lineColor ?? '#000000',
        valid: (valid) => {
          if (!valid) {
            console.warn(`JsBarcode validation failed for text: ${text}`)
          }
        },
      })
    } catch (err) {
      console.error('Barcode rendering error:', err)
    }
  }
}
