import { useQuery } from '@tanstack/react-query';
import { searchProductLocal } from '../lib/db';
import { fetchProductFromOFF } from '../lib/api';
import { addScanToHistory } from '../lib/history';

export function useProduct(code: string | null) {

  return useQuery({
    queryKey: ['product', code],
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

      // 2. API Fallback
      if (navigator.onLine) {
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
      }

      // 3. Not Found
      await addScanToHistory(code, null); // Log failed scan
      return { source: 'none', data: null };
    },
    enabled: !!code,
    retry: false
  });
}
