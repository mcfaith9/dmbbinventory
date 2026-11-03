/**
 * Enterprise Print Service
 * Provides bulletproof printing for Barcode and QR Code inventory labels.
 * 
 * Why this exists:
 * In Single Page Applications (Vue/React), printing elements nested inside flexbox containers
 * and `overflow-y-auto` elements (like AppLayout's <main>) causes browser print engines
 * to render blank pages, fail page breaks, or clip content.
 * 
 * This service clones the printable content directly into a clean root-level `#company-print-portal`
 * on `document.body`, converts all HTML5 <canvas> elements (QR codes) into high-resolution <img>
 * data URLs (guaranteeing rasterization in all print drivers), ensures SVGs have explicit geometry,
 * waits for fonts to settle, and triggers `window.print()` with complete cleanup afterwards.
 */

export interface PrintOptions {
  pageTitle?: string
  copies?: number
}

export class PrintService {
  private static portalId = 'company-print-portal'

  /**
   * Prepares and prints a target element by cloning it into the top-level print portal.
   */
  static async printElement(sourceElement: HTMLElement, _options: PrintOptions = {}): Promise<void> {
    if (!sourceElement) {
      console.warn('PrintService: sourceElement not provided.')
      return
    }

    // 1. Wait for document fonts to finish loading
    if ('fonts' in document) {
      await (document as any).fonts.ready
    }

    // 2. Remove any previous leftover print portal
    this.cleanup()

    // 3. Create the dedicated root-level print container
    const portal = document.createElement('div')
    portal.id = this.portalId

    // 4. Deep clone the source element
    const clone = sourceElement.cloneNode(true) as HTMLElement
    clone.id = 'printable-area-active'
    clone.style.margin = '0'
    clone.style.padding = '0'
    clone.style.background = '#ffffff'
    clone.style.color = '#000000'

    // 5. Convert all canvas elements in the clone to high-res images
    // This is critical because print engines frequently fail to paint raw canvas buffers
    const sourceCanvases = sourceElement.querySelectorAll('canvas')
    const clonedCanvases = clone.querySelectorAll('canvas')

    sourceCanvases.forEach((srcCanvas, idx) => {
      const clonedCanvas = clonedCanvases[idx]
      if (clonedCanvas) {
        try {
          const img = document.createElement('img')
          img.src = srcCanvas.toDataURL('image/png')
          img.style.display = 'block'
          img.style.margin = '0 auto'
          img.style.maxWidth = '100%'
          img.style.height = 'auto'
          img.alt = 'QR Code'
          clonedCanvas.parentNode?.replaceChild(img, clonedCanvas)
        } catch (e) {
          console.warn('PrintService: Canvas conversion warning:', e)
        }
      }
    })

    // 6. Ensure all SVG elements have explicit vector sizing and crisp rendering
    const clonedSvgs = clone.querySelectorAll('svg')
    clonedSvgs.forEach((svg) => {
      svg.setAttribute('shape-rendering', 'crispEdges')
      svg.style.maxWidth = '100%'
      svg.style.height = 'auto'
      svg.style.display = 'block'
      svg.style.margin = '0 auto'
    })

    // 7. Append clone to portal and portal to document.body
    portal.appendChild(clone)
    document.body.appendChild(portal)

    // 8. Add is-printing class to body to activate clean print media rules
    document.body.classList.add('is-printing-labels')

    // 9. Allow browser layout to settle across animation frames
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))

    // 10. Execute window.print() and register automatic cleanup
    const cleanupHandler = () => {
      window.removeEventListener('afterprint', cleanupHandler)
      PrintService.cleanup()
    }

    window.addEventListener('afterprint', cleanupHandler)

    // Fallback cleanup timer in case afterprint doesn't fire (e.g. print cancelled quickly)
    setTimeout(() => {
      // Small delay so print spooler completes reading DOM
      window.print()
      setTimeout(() => {
        PrintService.cleanup()
      }, 1500)
    }, 50)
  }

  /**
   * Cleans up the temporary print portal and resets document.body classes.
   */
  static cleanup(): void {
    document.body.classList.remove('is-printing-labels')
    const existing = document.getElementById(this.portalId)
    if (existing) {
      existing.remove()
    }
  }
}
