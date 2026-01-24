import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface FoodScanDB extends DBSchema {
  history: {
    key: number;
    value: {
      code: string;
      scannedAt: number;
      synced: boolean;
      // potentially cache product data here too
      productName?: string;
      palmOilText?: string;
      status?: 'green' | 'yellow' | 'red' | 'unknown'; 
    };
    indexes: { 'by-date': number };
  };
}

const HISTORY_DB = 'foodscan-history';

async function getHistoryDB() {
  return openDB<FoodScanDB>(HISTORY_DB, 3, { // Version 3
    upgrade(db: IDBPDatabase<FoodScanDB>) {
      // Clear old store if exists to reset schema
      if (db.objectStoreNames.contains('history')) {
        db.deleteObjectStore('history');
      }
      const store = db.createObjectStore('history', {
        keyPath: 'code', // Unique by product code
      });
      store.createIndex('by-date', 'scannedAt');
    },
  });
}

export async function addScanToHistory(code: string, data?: any) {
  const db = await getHistoryDB();
  
  // Deriving status text if not provided
  let palmText = '';
  let status: 'green' | 'red' | 'yellow' | 'unknown' = 'unknown';

  if (data) {
    const palmTags = Array.isArray(data.palm_oil_tags) ? data.palm_oil_tags : JSON.parse(data.palm_oil_tags || '[]');
    const palmMayBeTags = Array.isArray(data.palm_oil_may_be_tags) ? data.palm_oil_may_be_tags : JSON.parse(data.palm_oil_may_be_tags || '[]');
    const hasPalm = palmTags.length > 0;
    const mayHavePalm = palmMayBeTags.length > 0;

    if (hasPalm) {
      status = 'red';
      palmText = 'Palm Oil';
    } else if (mayHavePalm) {
      status = 'yellow';
      palmText = 'May Contain Palm Oil';
    } else {
      status = 'green';
      palmText = 'No Palm Oil';
    }
  }

  await db.put('history', {
    code,
    scannedAt: Date.now(),
    synced: !!data,
    productName: data?.name || data?.product_name || 'Unknown Product',
    palmOilText: palmText,
    status: status
  });
}

export async function getScanHistory(limit = 50) {
  const db = await getHistoryDB();
  // Reverse chronological
  let cursor = await db.transaction('history').store.index('by-date').openCursor(null, 'prev');
  const results = [];
  while (cursor && results.length < limit) {
    results.push(cursor.value);
    cursor = await cursor.continue();
  }
  return results;
}
