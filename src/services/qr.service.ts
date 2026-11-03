import QRCode from 'qrcode'
import type { QRCodeToDataURLOptions, QRCodeRenderersOptions, QRCodeToStringOptions } from 'qrcode'

export interface QRCodeGenerateOptions {
  width?: number
  margin?: number
  color?: {
    dark?: string
    light?: string
  }
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
}

export class QRCodeService {
  /**
   * Generates a base64 Data URL (PNG) from text
   */
  static async generateDataURL(text: string, options: QRCodeGenerateOptions = {}): Promise<string> {
    if (!text || text.trim() === '') return ''
    const opts: QRCodeToDataURLOptions = {
      width: options.width ?? 240,
      margin: options.margin ?? 2,
      color: {
        dark: options.color?.dark ?? '#000000',
        light: options.color?.light ?? '#ffffff',
      },
      errorCorrectionLevel: options.errorCorrectionLevel ?? 'M',
    }
    return QRCode.toDataURL(text, opts)
  }

  /**
   * Renders QR code onto an existing HTMLCanvasElement
   */
  static async renderToCanvas(
    canvas: HTMLCanvasElement,
    text: string,
    options: QRCodeGenerateOptions = {}
  ): Promise<void> {
    if (!canvas || !text || text.trim() === '') return
    const opts: QRCodeRenderersOptions = {
      width: options.width ?? 240,
      margin: options.margin ?? 2,
      color: {
        dark: options.color?.dark ?? '#000000',
        light: options.color?.light ?? '#ffffff',
      },
      errorCorrectionLevel: options.errorCorrectionLevel ?? 'M',
    }
    await QRCode.toCanvas(canvas, text, opts)
  }

  /**
   * Generates an SVG string representation of the QR code
   */
  static async generateSVG(text: string, options: QRCodeGenerateOptions = {}): Promise<string> {
    if (!text || text.trim() === '') return ''
    const opts: QRCodeToStringOptions = {
      type: 'svg',
      width: options.width ?? 240,
      margin: options.margin ?? 2,
      color: {
        dark: options.color?.dark ?? '#000000',
        light: options.color?.light ?? '#ffffff',
      },
      errorCorrectionLevel: options.errorCorrectionLevel ?? 'M',
    }
    return QRCode.toString(text, opts)
  }

  /**
   * Encodes product information into a structured or standard SKU text format
   */
  static formatProductPayload(product: {
    sku: string
    barcode?: string
    id?: string
    name?: string
  }): string {
    // Primary stable lookup identifier is SKU/Barcode for universal scanner compatibility
    return product.sku || product.barcode || product.id || ''
  }
}
