import { bulkImport } from './db';

const DATA_PATH = `${import.meta.env.BASE_URL}data`;

export interface SyncStats {
  lastUpdated: number | null;
  updateAvailable: boolean;
}

export const getRemoteVersion = async (): Promise<number | null> => {
  try {
    const res = await fetch(`${DATA_PATH}/version.json?t=${Date.now()}`);
    if (!res.ok) return null;
    
    // Check if we actually got JSON (Vite/SPA might return index.html for 404s)
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.warn("Version check returned non-JSON response. Check if public/data/version.json exists.");
      return null;
    }

    const data = await res.json();
    return data.last_updated;
  } catch (e) {
    console.error("Failed to check remote version", e);
    return null;
  }
};

export const syncDatabase = async (onProgress?: (msg: string) => void) => {
  try {
    if (onProgress) onProgress("Checking for updates...");
    
    const remoteTs = await getRemoteVersion();
    if (!remoteTs) throw new Error("Could not fetch version info");

    // Check if we already have this version
    const localTs = localStorage.getItem('db_version');
    if (localTs && Number(localTs) >= remoteTs) {
      if (onProgress) onProgress("Database is up to date.");
      return false; 
    }

    if (onProgress) onProgress("Downloading database (might take a while)...");
    
    // Fetch JSON.gz
    const response = await fetch(`${DATA_PATH}/products.json.gz`);
    if (!response.ok) throw new Error("Download failed");
    if (!response.body) throw new Error("Response body is empty");

    // Decompress
    const ds = new DecompressionStream("gzip");
    const stream = response.body.pipeThrough(ds);
    const newResponse = new Response(stream);
    
    // Parse JSON
    if (onProgress) onProgress("Parsing data...");
    const products = await newResponse.json();

    if (onProgress) onProgress(`Importing ${products.length} items...`);

    // Bulk Import
    await bulkImport(products, (count) => {
       if (onProgress) onProgress(`Imported ${count} items...`);
    });
    
    // Update local version
    localStorage.setItem('db_version', String(remoteTs));
    
    if (onProgress) onProgress("Success! Database updated.");
    return true;

  } catch (err) {
    console.error("Sync failed", err);
    if (onProgress) onProgress("Sync failed: " + (err as Error).message);
    throw err;
  }
};
