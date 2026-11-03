# Modern Barcode & QR Inventory Management System - PHP Currency, UsersRound Icon & QR Engine Upgrade

Implementation plan for integrating standard Philippine Peso (₱) formatting across the entire catalog and reporting suite, standardizing the UsersRound icon, implementing a dual Barcode & QR Code generator with multi-size printable label sheets, and upgrading the scanner to seamlessly handle both 1D barcodes and 2D QR codes via camera and hardware wedge devices.

## User Review & Critical Decisions

> [!IMPORTANT]
> Based on your responses to the initial questions, the following architecture decisions are established:

- **Confirmed Decision 1 (QR Generation Library)**: We will install the lightweight, industry-standard `qrcode` library (`@types/qrcode` as dev dependency). It enables crisp client-side SVG vector and HTML5 Canvas rasterization without remote API roundtrips or privacy leakage.
- **Confirmed Decision 2 (Encoded QR Data Format)**: QR codes will encode the stable **Product SKU / Barcode**, ensuring instant interoperability with both hardware 2D laser scanners (USB/Bluetooth HID wedge) and the integrated camera scanner, while supporting automated lookup across existing Stock In and Stock Out flows.
- **Confirmed Decision 3 (Printable Label Sheets)**: We will provide a configurable multi-size label print studio with presets (Standard 50×30mm retail shelf sticker, Compact 40×20mm asset tag, and Large 70×40mm carton label) displaying product name, SKU, price in PHP (`₱`), and side-by-side barcode / QR code options.

---

### 1. Overview & Core Concept

- **What It Does**: Upgrades the existing Vue 3 + Dexie.js offline-first inventory platform with:
  1. Universal **Philippine Peso (`₱`)** currency formatting via a centralized utility adhering to `en-PH` locale specifications (e.g. `₱1,000.00`, `₱540.00`, `₱0.00`).
  2. Uniform usage of the **`UsersRound`** icon from `@lucide/vue` across all user, team, and account navigation touchpoints.
  3. A robust **QR Code Generator** supporting individual product label rendering, bulk generation for product catalogs, real-time download (SVG / PNG), and dedicated printable multi-size sticker sheets.
  4. An enhanced **Unified Scanner** supporting both 1D barcodes (Code 128, EAN-13) and 2D QR codes via device cameras (`html5-qrcode`) and high-speed USB/Bluetooth HID wedge scanners with audio/visual detection feedback and direct product resolution.
- **Target Audience**: Warehouse staff, retail managers, and stock clerks needing fast mobile camera scanning, desktop USB wedge barcode guns, clear Philippine Peso pricing, and printable QR label batches.
- **Key Value**: Streamlines receiving (Stock In), fulfillment (Stock Out), and inventory auditing with zero external API dependencies and instant offline Dexie persistence.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  - **Currency Uniformity**: Every product card, inventory valuation tile on the dashboard, stock transaction row, adjustment log, and report table renders formatted currency as `₱X,XXX.XX` using monospace tabular numerals (`font-mono tabular-nums`) for clean financial scannability.
  - **QR Code Generation & Print Sheet**: Users can navigate to the Barcode & QR Generator, select any product or input custom text, switch between Barcode (Code128/EAN-13) and QR Code (High-density 2D matrix), configure label size (50×30mm, 40×20mm, 70×40mm), preview the printable grid, and trigger clean `@media print` sheets with no browser UI chrome.
  - **Unified Scanning Workflow**: The scanner interface automatically recognizes whether a scanned code is a 1D barcode or a 2D QR code. It verifies the SKU/barcode against Dexie storage, immediately presents product details (name, category, current stock, price in PHP), and provides 1-click actions: "View Details", "Stock In (+)", or "Stock Out (-)".
- **Visual Identity & Theme**:
  - *Design System*: Consistent Zinc dark/light theme, clean hairline dividers (`border-border`), and typography paired with tabular numbers.
  - *Color Palette*: Slate dark mode background (`bg-background`), primary accent `#18181b` / `#fafafa` (light/dark), success indicators (`#16a34a` emerald) for Stock In, and dispatch indicators (`#d97706` amber) for Stock Out.
  - *Typography*: Clean display sans headings paired with `font-mono tabular-nums` for currency figures (`₱1,250.00`) and SKU identifiers.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Centralized Currency Formatter (`formatPHP`)**
  - *Chosen Approach*: Implement a single reusable helper function in `src/lib/currency.ts` exporting `formatPHP(amount: number): string` that formats amounts with `₱` and `en-PH` locale settings (`minimumFractionDigits: 2`, `maximumFractionDigits: 2`).
  - *Why*: Prevents hardcoded dollar signs (`$`) or duplicate `toLocaleString()` implementations across 10+ views, and makes currency formatting globally maintainable.
- **Decision 2: QR Library Selection (`qrcode`)**
  - *Chosen Approach*: Install `qrcode` (and `@types/qrcode`).
  - *Why*: It weighs < 30kb, runs completely offline inside the browser, supports both Canvas rasterization and SVG string generation, and works reliably with Vue 3 reactive canvas refs without DOM hydration conflicts.
- **Decision 3: Unified 1D Barcode & 2D QR Scanner in `html5-qrcode`**
  - *Chosen Approach*: Configure `Html5Qrcode` formats to include both `Html5QrcodeSupportedFormats.QR_CODE` and 1D formats (`CODE_128`, `EAN_13`).
  - *Why*: Users do not need to manually toggle "Barcode Mode" vs "QR Mode" when scanning; the camera feed and USB scanner identify either code type automatically.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                          DMBB Inventory App                            │
├────────────────────────────────────────────────────────────────────────┤
│ Navigation: AppSidebar (UsersRound icon) + AppLayout (PHP Header)      │
└──────────┬─────────────────────────────┬───────────────────────────────┘
           │                             │
           ▼                             ▼
┌─────────────────────────┐   ┌──────────────────────────────────────────┐
│  Presentation & Views   │   │         Services & Utilities             │
├─────────────────────────┤   ├──────────────────────────────────────────┤
│ • DashboardView (₱)     │   │ • formatPHP() in src/lib/currency.ts     │
│ • ProductsView (₱)      │   │ • BarcodeService (Code128, EAN-13)       │
│ • ProductDetailView (₱) │   │ • QRCodeService (Canvas, SVG, Labels)    │
│ • BarcodeGeneratorView  │   │ • InventoryService (Valuations in ₱)     │
│   (Barcode & QR Studio) │   │ • AuthService (Users & Sessions)         │
│ • BarcodeScannerView    │   └────────────────────┬─────────────────────┘
│   (Unified 1D/2D)       │                        │
│ • BarcodePrintSheet     │                        ▼
│   (Configurable Labels) │   ┌──────────────────────────────────────────┐
│ • StockIn/Out/Reports   │   │      Dexie.js IndexedDB Local Store      │
└─────────────────────────┘   │ (Products, Transactions, Suppliers, etc.)│
                              └──────────────────────────────────────────┘
```

#### Affected Files & Implementation Steps

1. **Dependencies**:
   - Install `qrcode` and `@types/qrcode`.
2. **Central Currency Utility**:
   - Create `src/lib/currency.ts` providing `formatPHP(amount: number): string` and `parseCurrencyInput(val: string): number`.
   - Update all views currently rendering prices or totals (`DashboardView.vue`, `ProductsView.vue`, `ProductDetailView.vue`, `StockInView.vue`, `StockOutView.vue`, `StockAdjustmentsView.vue`, `InventoryHistoryView.vue`, `ReportsView.vue`, `BarcodePrintSheet.vue`).
3. **UsersRound Icon Update**:
   - Update `src/components/AppSidebar.vue`, `src/components/NavUser.vue`, `src/pages/SettingsView.vue`, and any user-related triggers to use `UsersRound` from `@lucide/vue`.
4. **QR Code Service & Components**:
   - Create `src/services/qr.service.ts` for generating QR code data URLs and SVG elements with error correction level options.
   - Upgrade `src/pages/BarcodeGeneratorView.vue` with tabs/toggles for Barcode vs. QR Code, preview card, download button, and bulk generator.
   - Upgrade `src/components/BarcodePrintSheet.vue` to render multi-size printable label sheets (50×30mm, 40×20mm, 70×40mm) with PHP currency, barcode/QR code, SKU, and product name.
5. **Unified Scanner Upgrade**:
   - Enhance `src/pages/BarcodeScannerView.vue` and global scanner hooks to support both 1D Barcode and 2D QR decoding, detect format type, match against Dexie database, and show informative missing-product prompts.
6. **Compilation & Verification**:
   - Run `compile_applet` and test all routes to ensure zero regressions and strict TypeScript compliance.
