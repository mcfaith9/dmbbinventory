import type { IInventoryDatabase } from './database.interface'
import { DexieInventoryDatabase } from '../local/dexie.repositories'

let databaseInstance: IInventoryDatabase | null = null

export function getDatabase(): IInventoryDatabase {
  if (!databaseInstance) {
    // Currently returns Dexie local IndexedDB
    // Future online databases (e.g. Supabase, PostgreSQL) plug in here seamlessly
    databaseInstance = new DexieInventoryDatabase()
  }
  return databaseInstance
}
