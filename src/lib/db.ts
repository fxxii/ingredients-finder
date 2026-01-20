import * as SQLite from 'wa-sqlite';
import SQLiteAsyncESMFactory from 'wa-sqlite/dist/wa-sqlite-async.mjs';
import { IDBBatchAtomicVFS } from 'wa-sqlite/src/examples/IDBBatchAtomicVFS.js';

// Singleton state
let sqlite3: any = null;
let db: number | null = null;
let initPromise: Promise<{ db: number; sqlite3: any }> | null = null;

const DB_NAME = 'foodscan_v1.sqlite';

export async function getDB() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const module = await SQLiteAsyncESMFactory({
        locateFile: (file: string) => {
          if (file.includes('wa-sqlite-async.wasm')) return './wa-sqlite-async.wasm';
          return file;
        }
      });

      sqlite3 = SQLite.Factory(module);

      // Register VFS if possible (IDBBatchAtomicVFS is best for persistence)
      if (typeof navigator !== 'undefined' && navigator.locks) {
        try {
          const vfs = new IDBBatchAtomicVFS(DB_NAME);
          sqlite3.vfs_register(vfs, true);
        } catch (vfsErr) {
          console.warn("VFS registration failed, falling back to default/memory", vfsErr);
        }
      }

      db = await sqlite3.open_v2(
        DB_NAME,
        SQLite.SQLITE_OPEN_READWRITE | SQLite.SQLITE_OPEN_CREATE
      );

      // Initialize Schema with individual, trimmed statements
      await initSchema(db as number, sqlite3);

      return { db: db as number, sqlite3 };
    } catch (err) {
      initPromise = null; // Clear promise so we can retry
      console.error("CRITICAL: Failed to init DB", err);
      throw err;
    }
  })();

  return initPromise;
}

async function initSchema(db: number, sqlite3: any) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS products (
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
    )`,
    `CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)`
  ];

  for (const sql of statements) {
    // Trim and execute one by one to avoid "not an error" bugs in WASM
    await sqlite3.exec(db, sql.trim());
  }
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

export async function getDatabaseStats() {
  const { db, sqlite3 } = await getDB();
  if (!db) return null;

  try {
    let lastUpdated = 0;
    await sqlite3.exec(db, `SELECT MAX(last_updated) as ts FROM products`, (row: any) => {
      lastUpdated = row[0];
    });
    return { last_updated: lastUpdated };
  } catch (e) {
    return { last_updated: 0 };
  }
}

// Helper to escape SQL string values
function toSqlVal(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val.toString();
  // Escape single quotes by doubling them
  const str = String(val).replace(/'/g, "''");
  return `'${str}'`;
}

export async function bulkImport(products: any[], onProgress?: (count: number) => void) {
  const { db, sqlite3 } = await getDB();
  if (!db) throw new Error("DB not init");

  // Transaction for speed
  await sqlite3.exec(db, "BEGIN TRANSACTION");
  
  try {
    // Clear existing data (Mega Sync replacement strategy)
    await sqlite3.exec(db, "DELETE FROM products");

    // Batch Insert (using raw SQL strings to avoid 'prepare' API issues)
    const BATCH_SIZE = 50;
    let count = 0;
    
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);
      if (batch.length === 0) continue;

      const values = batch.map((p: any) => {
        return `(
          ${toSqlVal(p.code)}, 
          ${toSqlVal(p.name)}, 
          ${toSqlVal(p.ingredients)}, 
          ${toSqlVal(p.palm_oil_tags)}, 
          ${toSqlVal(p.palm_oil_may_be_tags)}, 
          ${toSqlVal(p.image_url)}, 
          ${toSqlVal(p.nutriscore_grade)}, 
          ${toSqlVal(p.nova_group)}, 
          ${toSqlVal(p.nutrient_levels)}, 
          ${toSqlVal(p.additives_tags)}, 
          ${toSqlVal(p.last_updated)}
        )`;
      }).join(",");

      const sql = `
        INSERT INTO products (
          code, name, ingredients, palm_oil_tags, palm_oil_may_be_tags, 
          image_url, nutriscore_grade, nova_group, nutrient_levels, 
          additives_tags, last_updated
        ) VALUES ${values};
      `;

      await sqlite3.exec(db, sql);
      
      count += batch.length;
      if (count % 1000 === 0 && onProgress) onProgress(count);
    }
    
    await sqlite3.exec(db, "COMMIT");
    return count;
    
  } catch (err) {
    console.error("Bulk Import Failed", err);
    await sqlite3.exec(db, "ROLLBACK");
    throw err;
  }
}
