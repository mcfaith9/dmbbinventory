# DMBB Inventory - Modern Barcode-Based Inventory Management System

A production-grade, local-first inventory management application built with **Vue 3**, **Vite**, **TypeScript**, **Tailwind CSS v4**, **shadcn-vue**, and **Dexie.js (IndexedDB)**.

## Core Features

- **OTP Authentication**: Preserved 6-digit OTP verification flow (`/login`) with session guarding on all inventory routes.
- **Product Catalog Management**: Complete CRUD for items with unique SKU, barcode, category, brand, supplier, unit of measurement, pricing, stock levels, and reorder thresholds (`/products`, `/products/:id`).
- **Dual-Symbology Barcode Generation**: Real-time rendering of **Code 128** (alphanumeric warehouse SKUs) and **EAN-13** (13-digit retail barcodes with automatic modulo-10 checksum calculation). Supports instant SVG download and single/bulk label printing (`/barcode-generator`).
- **Hybrid Barcode Scanner**:
  - **USB Hardware Wedge**: Background keyboard listener capturing rapid burst inputs terminating with the `Enter` key, performing instant lookups without camera requirements.
  - **Camera Scanner**: Mobile and desktop webcam barcode scanner using `html5-qrcode`.
  - **Quick Action Drawer**: Instant 1-tap Stock In and Stock Out modal dialogs directly from scan matches (`/barcode-scanner`).
- **Inventory Movements**:
  - **Stock In**: Receive goods from suppliers with PO / Invoice reference numbers and audit remarks (`/stock-in`).
  - **Stock Out**: Dispatch items to departments or customers with negative stock prevention guards (`/stock-out`).
  - **Stock Adjustments**: Reconcile physical counts vs system records with discrepancy calculators and reason codes (`/stock-adjustments`).
  - **Movement History**: Searchable, filterable audit ledger of all movements with CSV export (`/inventory-history`).
- **Supporting Catalogs**: Categories, brands, suppliers, and units of measurement management.
- **Reporting & Valuation**: Real-time asset cost valuation, retail potential, low stock alerts, stockout lists, and CSV data downloads (`/reports`).
- **Printable Barcode Labels**: Dedicated `@media print` component supporting multiple label sizes (compact, standard, shipping), hiding navigation during printing (`BarcodePrintSheet.vue`).
- **Future Online Database Compatibility**: Clean repository pattern (`IProductRepository`, `ITransactionRepository`, `ISupplierRepository`) with UUID primary keys, ISO-8601 timestamps, and sync metadata (`syncStatus`), allowing plug-and-play migration to PostgreSQL or Supabase via `database.factory.ts`.

## Technology Stack

- **Framework**: Vue 3 (Composition API `<script setup lang="ts">`)
- **Routing**: Vue Router 4
- **Persistence**: Dexie.js 4 (IndexedDB)
- **Styling**: Tailwind CSS v4 with OKLCH Zinc Theme
- **UI Components**: shadcn-vue on `reka-ui`
- **Icons**: `@lucide/vue`
- **Barcode Engine**: `jsbarcode` & `html5-qrcode`

## Getting Started

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` to launch the application. Use any 6-digit code or `123456` to log in. In **Settings**, you can optionally click **Load Sample Data** to populate realistic warehouse catalog items.
