import { z } from 'zod';

const OFFProductSchema = z.object({
  code: z.string().optional(),
  product: z.object({
    product_name: z.string().optional(),
    ingredients_text: z.string().optional(),
    ingredients_from_palm_oil_tags: z.array(z.string()).optional(),
    ingredients_that_may_be_from_palm_oil_tags: z.array(z.string()).optional(),
    image_front_small_url: z.string().optional(),
    nutriscore_grade: z.string().optional(),
    nova_group: z.number().optional(),
    nutrient_levels: z.record(z.string()).optional(), // JSON object
    additives_tags: z.array(z.string()).optional(),
  }).passthrough().optional(),
  status: z.coerce.number().optional(),
}).passthrough();

export type OFFProduct = z.infer<typeof OFFProductSchema>;

const USER_AGENT = 'FoodScan/1.0 (GramTV; +https://github.com/GramTV/foodscan)';

export async function fetchProductFromOFF(code: string): Promise<OFFProduct | null> {
  try {
    // v2 is the recommended API endpoint for newer applications.
    const url = `https://world.openfoodfacts.org/api/v2/product/${code}?fields=code,product_name,ingredients_text,ingredients_from_palm_oil_tags,ingredients_that_may_be_from_palm_oil_tags,image_front_small_url,nutriscore_grade,nova_group,nutrient_levels,additives_tags`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json'
      }
    });
    
    if (!res.ok) {
       if (res.status === 404) return null;
       throw new Error(`OFF API Error: ${res.status}`);
    }

    const data = await res.json();
    console.log("OFF API Raw Data:", data);
    const parsed = OFFProductSchema.safeParse(data);
    
    if (!parsed.success) {
      console.warn("OFF API Schema Mismatch", parsed.error);
      return null;
    }

    console.log("OFF API Parsed Status:", parsed.data.status);
    if (parsed.data.status === 0) return null;

    return parsed.data;
  } catch (err) {
    console.error("Fetch Product Failed", err);
    throw err;
  }
}
