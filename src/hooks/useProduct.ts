import { useQuery } from '@tanstack/react-query';
import { searchProductLocal } from '../lib/db';
import { fetchProductFromOFF } from '../lib/api';
import { addScanToHistory } from '../lib/history';
import { useStore } from '../lib/store';

export function useProduct(code: string | null) {
  const isOnline = useStore((state) => state.isOnline);

  return useQuery({
    queryKey: ['product', code, { isOnline }],
    queryFn: async () => {
      if (!code) return null;

      // 1. Local Lookup
      try {
        console.log(`[useProduct] Checking local DB for ${code}...`);
        
        // Timeout race to prevent hanging
        const localData = await Promise.race([
          searchProductLocal(code),
          new Promise((_, reject) => setTimeout(() => reject(new Error("DB Timeout")), 2000))
        ]) as any;

        console.log(`[useProduct] Local Result:`, localData ? 'FOUND' : 'MISSING');

        if (localData) {
          await addScanToHistory(code, localData);
          return { source: 'local', data: localData };
        }
      } catch (err) {
        console.warn("[useProduct] Local DB skipped:", err);
      }

      // 3. API Fetch
      // If we are offline (according to our robust Global Status), throw offline error.
      // This respects the ping check from the Footer.
      if (!navigator.onLine || !isOnline) {
         throw new Error("Offline: Waiting for connection...");
      }

      try {
        const remoteData = await fetchProductFromOFF(code);
        
        if (remoteData && remoteData.product) {
          const mapped = {
             code,
             name: remoteData.product.product_name,
             ingredients: remoteData.product.ingredients_text,
             palm_oil_tags: JSON.stringify(remoteData.product.ingredients_from_palm_oil_tags || []),
             palm_oil_may_be_tags: JSON.stringify(remoteData.product.ingredients_that_may_be_from_palm_oil_tags || []),
             image_url: remoteData.product.image_front_small_url,
             nutriscore_grade: remoteData.product.nutriscore_grade,
             nova_group: remoteData.product.nova_group,
             nutrient_levels: JSON.stringify(remoteData.product.nutrient_levels || {}),
             additives_tags: JSON.stringify(remoteData.product.additives_tags || [])
          };
          await addScanToHistory(code, mapped);
          return { source: 'api', data: mapped };
        }
      } catch (apiErr: any) {
        // Handle explicit network failures (e.g. WiFi on but no Internet, or DNS failure)
        // "TypeError: Failed to fetch" is the standard browser error for this.
        if (apiErr.message === 'Failed to fetch' || apiErr.name === 'TypeError') {
             console.log("[useProduct] Fetch failed (Network), retrying...");
             throw new Error("Network request failed");
        }

        console.warn("[useProduct] API Fetch failed:", apiErr);
        // If it was a network error (failed to fetch), re-throw so RQ pauses/retries
        // If it was a 404/logic error within fetch, we might want to return 'none'
        // But fetchProductFromOFF throws on non-404 network errors.
        throw apiErr; 
      }

      // 4. Not Found (Online but API said 404)
      await addScanToHistory(code, null); // Log failed scan
      return { source: 'none', data: null };
    },
    enabled: !!code,
    retry: (failureCount, error) => {
        // If we are definitely offline, stop retrying immediately to prevent loops.
        // React Query will automatically refetch when connection is restored.
        if (error.message.includes("Offline")) return false;
        
        // true = retry infinite times for other errors (like temporarily server blips if we decided so, or just false)
        // Let's cap it to 3 for standard errors to be safe.
        return failureCount < 3;
    },
    networkMode: 'offlineFirst', // Allows queryFn to run even if offline (to check local DB)
    staleTime: 1000 * 60 * 60, // Cache results for 1 hour
  });
}
