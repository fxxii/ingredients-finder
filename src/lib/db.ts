import { openDB, DBSchema, IDBPDatabase } from 'idb';

const DB_NAME = 'foodscan_v1';
const STORE_NAME = 'products';
const DB_VERSION = 1;

interface Product {
  code: string;
  name?: string;
  ingredients?: string;
  palm_oil_tags?: string;
  palm_oil_may_be_tags?: string;
  nutriscore_grade?: string;
  nova_group?: number;
  nutrient_levels?: string | object; // Can be JSON string or parsed object
  additives_tags?: string;
  last_updated?: number;
  [key: string]: any;
}

interface FoodScanDB extends DBSchema {
  products: {
    key: string;
    value: Product;
  };
}

let dbPromise: Promise<IDBPDatabase<FoodScanDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<FoodScanDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          console.log('Creating products object store...');
          db.createObjectStore(STORE_NAME, { keyPath: 'code' });
        }
      },
      blocked() {
        console.warn('DB initialization blocked');
      },
      blocking() {
        console.warn('DB initialization blocking');
      },
      terminated() {
        console.error('DB terminated');
        dbPromise = null;
      },
    });
  }
  return dbPromise;
}

export async function searchProductLocal(code: string): Promise<Product | null> {
  try {
    const db = await getDB();
    const product = await db.get(STORE_NAME, code);
    return product || null;
  } catch (err) {
    console.error('Local IDB lookup failed', err);
    return null;
  }
}

export async function getDatabaseStats() {
  try {
    const db = await getDB();
    const count = await db.count(STORE_NAME);
    // Rough "last updated" by just checking one item or returning Now if empty
    // Ideally we store metadata elsewhere, but for now just returning count is the critical part
    return {
      items_count: count,
      last_updated: Date.now() // Placeholder, real logic would require a metadata store
    };
  } catch (err) {
    console.error('Failed to get stats', err);
    return { items_count: 0, last_updated: 0 };
  }
}

/**
 * STREAMING IMPORT LOGIC
 * Reads a Gzipped NDJSON file piece by piece, parses lines, and saves to IDB.
 */
export async function importFromStream(
  url: string, 
  onProgress?: (count: number, totalEstimated?: number) => void
) {
  console.log(`Starting import from ${url}`);
  const response = await fetch(url);
  
  if (!response.body) {
    throw new Error('ReadableStream not supported or no body');
  }

  // Decompress is handled automatically if Content-Encoding is set.
  // BUT for static hosting (GitHub Pages), .gz files are often served as application/gzip without Content-Encoding.
  // In that case, we must decompress manually.
  let stream = response.body;
  if (url.endsWith('.gz') && !response.headers.get('Content-Encoding')?.includes('gzip')) {
      console.log("Manual decompression triggered");
      const ds = new DecompressionStream('gzip');
      stream = stream.pipeThrough(ds);
  }

  // If the server provides Content-Length (and it's not gzipped or we can't know decompressed size),
  // we can only estimate.
  let bytesRead = 0;

  const reader = stream.getReader();
  const decoder = new TextDecoder('utf-8');
  
  let { value: chunk, done: readerDone } = await reader.read();
  let buffer = '';
  
  const BATCH_SIZE = 500;
  let batch: Product[] = [];
  let totalImported = 0;

  const db = await getDB();

  try {
    while (!readerDone || buffer.length > 0) {
      // Process the chunk
      if (chunk) {
        bytesRead += chunk.byteLength;
        buffer += decoder.decode(chunk, { stream: true }); // stream: true handles incomplete multi-byte chars
      } else {
        // Final flush
        buffer += decoder.decode();
      }

      // Split by newline
      const lines = buffer.split('\n');
      
      // Keep the last partial line in the buffer
      // If reader is done, the last line is complete (or empty)
      if (!readerDone) {
        buffer = lines.pop() || ''; 
      } else {
        buffer = ''; 
      }

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const product = JSON.parse(trimmed);
          
          // Optimization: Parse nested JSON fields here to save runtime CPU later
          const jsonFields = ['nutrient_levels', 'palm_oil_tags', 'palm_oil_may_be_tags', 'additives_tags'];
          
          for (const field of jsonFields) {
            if (typeof product[field] === 'string') {
              try {
                product[field] = JSON.parse(product[field]);
              } catch (e) { 
                // If parse fails, leave as string or set to empty default? 
                // Leave as is, let UI handle or fail gracefully.
              }
            }
          }
          
          batch.push(product);
        } catch (parseErr) {
          console.warn('Failed to parse line:', line.substring(0, 50), parseErr);
        }

        if (batch.length >= BATCH_SIZE) {
          await saveBatch(db, batch);
          totalImported += batch.length;
          batch = []; // Clear RAM
          
          // Yield to UI loop casually
          if (onProgress) {
             onProgress(totalImported);
             await new Promise(r => setTimeout(r, 0)); 
          }
        }
      }

      if (readerDone) break;
      
      // Read next chunk
      ({ value: chunk, done: readerDone } = await reader.read());
    }

    // Save remaining items
    if (batch.length > 0) {
      await saveBatch(db, batch);
      totalImported += batch.length;
    }

    console.log(`Import complete! Total records: ${totalImported}`);
    return totalImported;

  } catch (err) {
    console.error('Stream Import Failed', err);
    throw err;
  }
}

async function saveBatch(db: IDBPDatabase<FoodScanDB>, products: Product[]) {
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  
  // Parallel puts are faster than awaiting each one in sequence
  await Promise.all([
    ...products.map(p => store.put(p)),
    tx.done
  ]);
}
