# Modern Barcode-Based Inventory Management System

A production-grade, local-first inventory management application extending the existing Vue 3, Vite, TypeScript, and shadcn-vue stack with offline Dexie.js persistence, full stock lifecycle tracking, dual-format barcode generation, and hybrid USB/camera scanning.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed based on your preferences and requirements:
> - **Initial Database State**: Start with an empty database (blank slate), providing a dedicated "Load Demo Data" option in Settings if sample verification is ever needed.
> - **Barcode Symbology**: Dual-format generation support (Code 128 for warehouse alphanumeric SKUs and EAN-13 for standard retail products).
> - **Camera Scanner Engine**: HTML5-QRCode library for lightweight, reliable camera barcode decoding on mobile and desktop web browsers.
> - **Architecture Separation**: Database abstraction layer (Repository & Service patterns) with UUIDs, timestamps, and synchronization metadata, ensuring seamless future migration to PostgreSQL or Supabase without modifying UI modules.
> - **Preserved Foundations**: Unaltered OTP login flow, Zinc design tokens, shadcn-vue UI components, and existing application sidebar layout.

---

### 1. Overview & Core Concept

- **What It Does**: Provides warehouse and retail operations with end-to-end inventory control—including product catalog management, barcode creation and batch printing, instant stock-in receiving, stock-out dispatches, quantity reconciliations with audit logs, and live inventory valuation reporting.
- **Target Audience / Persona**: Warehouse managers, inventory clerks, and retail store operators who require high-speed barcode scanning via handheld USB wedges or mobile cameras, alongside robust offline data integrity.
- **Key Value**: Replaces error-prone manual spreadsheets with an intuitive, local-first inventory workspace that functions reliably offline, prevents negative inventory, maintains an immutable transaction audit log, and is pre-architected for future cloud database synchronization.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. *Authentication*: User inputs 6-digit verification code into the existing `OTPForm.vue` to unlock session and route into the inventory workspace.
  2. *Product Catalog & Barcode Creation*: Create products with unique SKU, barcode, unit, cost, selling price, and supplier. Generate single or batch Code 128 / EAN-13 barcodes, then trigger a clean, black-and-white print preview formatted for standard label sheets.
  3. *Barcode Scanning & Operations*:
     - **USB Wedge**: Seamlessly captures keystroke bursts from standard handheld USB laser scanners terminating in Enter, instantly looking up product details without requiring camera activation.
     - **Camera Scanner**: Launches live camera viewfinder with a scanning reticle, auto-detecting Code 128 / EAN-13 barcodes.
     - *Quick Action Modal*: Offers direct 1-tap "Stock In" or "Stock Out" modal dialogs immediately upon barcode match.
  4. *Inventory Movements & Auditing*: Perform stock receiving, release to department/customer, or quantity reconciliation with required reason codes. Updates current stock atomically and records an immutable transaction ledger.
  5. *Reporting & Valuation*: Real-time analytics displaying inventory valuation (cost vs. retail), low stock alerts, stockout rosters, movement histories, and 1-click CSV exports.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Refined Zinc utilitarian industrial aesthetic matching the existing shadcn-vue foundation. High contrast, clean hairline borders (`border-border`), and crisp typography.
  - *Color Palette & Tokens*: Preserves the configured OKLCH variables in `src/style.css`. Clean neutral backgrounds (`--background`), subtle card elevations (`--card`), dark primary accents (`--primary`), and strict semantic indicators (green for stock-in, amber for low stock, crimson for stockout/stock-out).
  - *Typography & Hierarchy*: Headings in balanced semi-bold sans; dense data tables, product SKUs, and monetary values explicitly styled with `font-mono tabular-nums` for vertical alignment.
  - *Component Styling & Layout*: Clean desktop workspace using `SidebarProvider` with persistent left sidebar, top breadcrumb toolbar, and a fluid main viewport container ($1440\text{px}$ baseline).

- **Interactive Feedback & Motion**:
  - Immediate visual feedback on scanner detection with subtle audio beep confirmation.
  - Zero-latency optimistic UI updates with rollback safeguards.
  - Empty states with call-to-action buttons for empty inventory tables.
  - Dedicated `@media print` CSS rules hiding navigation, headers, and UI buttons during label printing.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Local-First IndexedDB with Dexie.js & Abstraction Layer**
  - *Chosen Approach*: Implement a Repository Pattern (`IProductRepository`, `ITransactionRepository`, `ISupplierRepository`, etc.) backed by Dexie.js v4, accessed through an injectable `DatabaseFactory`.
  - *Why*: Delivers instant sub-millisecond query performance, works completely offline, and allows future replacement with PostgreSQL, Supabase, or REST backends without rewriting any Vue components or business logic.
  - *Alternatives Considered*: Direct Dexie usage in components (rejected due to tight coupling and poor migration readiness); mock in-memory stores (rejected because data would vanish on reload).

- **Decision 2: Dual Scanning Architecture (USB Wedge + HTML5-QRCode)**
  - *Chosen Approach*: Global keydown event listener with burst-timing detection for USB hardware scanners, combined with an on-demand HTML5-QRCode camera canvas component.
  - *Why*: Allows warehouse staff to use fast industrial handheld barcode guns without camera permission barriers, while still enabling smartphone/tablet camera scanning in mobile settings.
  - *Alternatives Considered*: Camera-only scanning (sluggish and battery-draining for busy stock clerks); USB-only (excludes mobile devices).

- **Decision 3: Atomic Stock Transactions with Negative Stock Guards**
  - *Chosen Approach*: Execute inventory quantity adjustments and transaction log insertions within Dexie's atomic `db.transaction('rw', ...)` blocks. Disallow negative stock unless authorized through explicit stock adjustment overrides.
  - *Why*: Prevents race conditions and inventory drift, guaranteeing that stock movements and audit records remain strictly synchronized.

---

### 4. Technical Architecture & Data Strategy

#### System & Component Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Vue 3 Single Page App                         │
│                                                                        │
│  ┌───────────────────────┐         ┌────────────────────────────────┐  │
│  │   Vue Router & Auth   │ ──────> │       AppLayout (Shell)        │  │
│  │ (OTP Session Guard)   │         │ (AppSidebar + Breadcrumbs)     │  │
│  └───────────────────────┘         └───────────────┬────────────────┘  │
│                                                    │                   │
│         ┌──────────────────────────────────────────┴──────────────┐    │
│         │                     Router Views                        │    │
│         ├────────────────────────┬────────────────────────────────┤    │
│         │ DashboardView          │ StockInView / StockOutView     │    │
│         │ ProductsView / Detail  │ StockAdjustmentsView           │    │
│         │ BarcodeGeneratorView   │ InventoryHistoryView           │    │
│         │ BarcodeScannerView     │ Categories / Suppliers / Units │    │
│         │ ReportsView            │ SettingsView                   │    │
│         └───────────┬──────────────────────────────┬──────────────┘    │
│                     │                              │                   │
│                     ▼                              ▼                   │
│         ┌───────────────────────┐      ┌─────────────────────────┐     │
│         │   Inventory Service   │      │     Barcode Service     │     │
│         │ (Business Logic & TX) │      │ (JsBarcode & Detection) │     │
│         └───────────┬───────────┘      └─────────────────────────┘     │
│                     │                                                  │
│                     ▼                                                  │
│         ┌────────────────────────────────────────────────────────┐     │
│         │          Repository Abstraction Layer                  │     │
│         │ (IProductRepo, ITransactionRepo, ISupplierRepo, etc.)  │     │
│         └───────────────────────┬────────────────────────────────┘     │
│                                 │                                      │
│                                 ▼                                      │
│         ┌────────────────────────────────────────────────────────┐     │
│         │         Dexie.js IndexedDB Local Storage               │     │
│         │ (Indexed tables: products, transactions, suppliers...) │     │
│         │ * Prepared for future Supabase / PostgreSQL provider   │     │
│         └────────────────────────────────────────────────────────┘     │
└────────────────────────────────────────────────────────────────────────┘
```

#### Core Data Entities

- **Product**:
  - `id` (UUID string), `name`, `sku` (unique), `barcode` (unique), `categoryId`, `brandId`, `unitId`, `supplierId`
  - `description`, `costPrice` (number), `sellingPrice` (number), `currentStock` (number), `minStockLevel` (number)
  - `status` (`'active' | 'archived'`), `image` (base64 or URL)
  - Sync metadata: `createdAt`, `updatedAt`, `deletedAt`, `syncStatus`, `lastSyncedAt`
- **InventoryTransaction**:
  - `id` (UUID), `productId`, `type` (`'stock_in' | 'stock_out' | 'adjustment'`)
  - `quantityChanged` (number), `previousStock` (number), `newStock` (number)
  - `referenceNumber` (string), `destinationOrSupplier` (string), `remarks` (string), `user` (string)
  - `transactionDate` (ISO timestamp), `createdAt`
- **Category & Brand**: `id`, `name`, `slug`, `createdAt`, `updatedAt`
- **Supplier**: `id`, `name`, `contactPerson`, `phone`, `email`, `address`, `reference`, `createdAt`
- **UnitOfMeasurement**: `id`, `name`, `abbreviation`, `createdAt`

#### State Mutations & User Interactions

1. **Product Management Flow**: Form validation ensures unique SKU and Barcode against existing database indexes before persisting. On save, triggers repository create/update and invalidates cached lists.
2. **Barcode Scanner Flow**: Keydown buffers characters with timestamp diffs $\le 50\text{ms}$. When `Enter` is detected, parses the buffer and searches indexed `barcode` field. If matched, displays product drawer with quick-action Stock In / Stock Out buttons.
3. **Inventory Operation Flow**: Transaction service locks records, recalculates stock, ensures `newStock >= 0` (for Stock Out), writes the transaction ledger record, and commits both updates in a single atomic transaction.
4. **Printing Flow**: Selected products generate barcode SVGs via `JsBarcode` into a dedicated print container with `@media print` styling, invoking native `window.print()` while hiding application headers and sidebar.
