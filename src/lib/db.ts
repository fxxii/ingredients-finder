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

export async function writeDatabaseFile(data: Uint8Array) {
  const { db: destDb, sqlite3 } = await getDB();
  if (!destDb) throw new Error("DB not init");

  // 1. Load data into an in-memory DB
  const memDb = await sqlite3.open_v2(
    ':memory:',
    SQLite.SQLITE_OPEN_READWRITE | SQLite.SQLITE_OPEN_CREATE
  );
  
  // Deserialize the downloaded blob into the memory DB
  // explicit flags required for some builds, but default works often.
  // We use SQLITE_DESERIALIZE_RESIZEABLE | SQLITE_DESERIALIZE_FREEONCLOSE
  const flags = 0; 
  await sqlite3.deserialize(memDb, 'main', data, data.length, data.length, flags);

  // 2. Backup Memory DB -> Persistent DB (Disk)
  // This effectively overwrites the persistent DB with the downloaded one
  // while handling locking correctly.
  const backup = await sqlite3.backup_init(destDb, 'main', memDb, 'main');
  if (backup) {
    await sqlite3.backup_step(backup, -1); // -1 = copy all pages
    await sqlite3.backup_finish(backup);
  } else {
    throw new Error("Failed to init backup");
  }

  await sqlite3.close(memDb);
  
  // 3. Re-init schema just in case (e.g. if we downloaded a file without indexes)
  // But usually the downloaded file is complete. 
  // We can optimize by assuming it's good.
  
  return true;
}
