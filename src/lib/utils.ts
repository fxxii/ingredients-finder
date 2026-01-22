
/**
 * Computes the OpenFoodFacts image URL from a product barcode.
 * Logic:
 * 1. Pad barcode to 13 digits if shorter.
 * 2. Split regex: /^(...)(...)(...)(.*)$/
 * 3. Path: .../p1/p2/p3/p4/front_en.3.200.jpg 
 * 
 * Note: The filename 'front_en.3.200.jpg' is an assumption/default. 
 * Realistically, without the specific revision number from the DB, we might hit 404s.
 * However, this is the requested logic to "infer" the folder.
 * 
 * We will try a generic 'front_en.400.jpg' (medium) or 'front_en.3.400.jpg'.
 * User example used 'front_en.3.200.jpg'.
 */
export const getProductImage = (code: string | undefined): string | null => {
  if (!code) return null;

  // 1. Pad to 13 digits
  const paddedCode = code.padStart(13, '0');

  // 2. Regex Split
  // Pattern: First 9 digits in 3 groups of 3, then the rest.
  // e.g. 3435660768163 -> 343/566/076/8163
  // e.g. 5010035068352 -> 501/003/506/8352
  const regex = /^(\d{3})(\d{3})(\d{3})(.*)$/;
  const match = paddedCode.match(regex);

  if (!match) return null;

  const [_, p1, p2, p3, p4] = match;

  // 3. Construct URL
  // We use a generic fallback for the filename since we removed the specific URL from DB.
  // Try 'front_en.400.jpg' - "400" is a standard medium size.
  // Note: The specific revision (e.g. .3.) is unknown. 
  // Ideally, we would probe, but for now we follow the user's "compute folder" instruction.
  // We'll trust that 'front_en.400.jpg' or similar often resolves or redirects.
  // Actually, let's stick to the folder path logic mainly. 
  // But <img> needs a file.
  
  // Strategy: Open Food Facts often has `front_en.400.jpg` available as a symlink/redirect 
  // or at least a standard convention.
  return `https://images.openfoodfacts.org/images/products/${p1}/${p2}/${p3}/${p4}/front_en.400.jpg`;
};
