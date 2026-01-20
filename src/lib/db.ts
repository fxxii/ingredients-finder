import * as SQLite from 'wa-sqlite';
import SQLiteAsyncESMFactory from 'wa-sqlite/dist/wa-sqlite-async.mjs';
import { IDBBatchAtomicVFS } from 'wa-sqlite/src/examples/IDBBatchAtomicVFS.js';

// Singleton instance
let db: number | null = null;
let sqlite3: any = null;

const DB_NAME = 'foodscan_v1.sqlite';

export async function getDB() {
  if (db) return { db, sqlite3 };

  try {
    const module = await SQLiteAsyncESMFactory({
      locateFile: (file: string) => {
        // file might be just "wa-sqlite-async.wasm" or have path.
        // We want to force it to load from root /wa-sqlite-async.wasm
        if (file.includes('wa-sqlite-async.wasm')) return '/wa-sqlite-async.wasm';
        return file;
      }
    });

    sqlite3 = SQLite.Factory(module);

    // Register IDB VFS (Persistence) only if WebLocks is available (Secure Context)
    // IDBBatchAtomicVFS requires navigator.locks, which is missing on HTTP (except localhost)
    if (typeof navigator !== 'undefined' && navigator.locks) {
      const vfs = new IDBBatchAtomicVFS(DB_NAME);
      sqlite3.vfs_register(vfs, true); // Make it default
    } else {
      console.warn("WebLocks API missing (Non-Secure Context?). Falling back to transient Memory VFS. History will be lost on reload.");
      // Memory VFS is default if nothing else is registered.
    }

    // Open connection
    db = await sqlite3.open_v2(
      DB_NAME,
      SQLite.SQLITE_OPEN_READWRITE | SQLite.SQLITE_OPEN_CREATE
    );

    // Initialize Schema
    await initSchema(db as number, sqlite3);

    return { db, sqlite3 };
  } catch (err) {
    console.error("Failed to init DB", err);
    throw err;
  }
}

async function initSchema(db: number, sqlite3: any) {
  await sqlite3.exec(db, `
    CREATE TABLE IF NOT EXISTS products (
      code TEXT PRIMARY KEY,
      name TEXT,
      ingredients TEXT,
      palm_oil_tags TEXT,
      palm_oil_may_be_tags TEXT,
      image_url TEXT,
      nutriscore_grade TEXT,
      nova_group INTEGER,
      nutrient_levels TEXT,
      additives_tags TEXT,
      last_updated INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
  `);
}

export async function searchProductLocal(code: string) {
  const { db, sqlite3 } = await getDB();
  if (!db) return null;

  const results: any[] = [];
  await sqlite3.exec(db, `SELECT * FROM products WHERE code = ?`, (row: any, columns: string[]) => {
    const obj: any = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    results.push(obj);
  }, [code]);

  return results.length > 0 ? results[0] : null;
}
