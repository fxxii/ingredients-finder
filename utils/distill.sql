INSTALL httpfs;
LOAD httpfs;
INSTALL sqlite;
LOAD sqlite;

-- Attach valid SQLite database for output
ATTACH 'products.sqlite' AS out (TYPE SQLITE);

-- Create Schema in SQLite file
CREATE TABLE out.products (
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

-- Extract from URL (Streaming) and Insert directly into SQLite
-- Using 10GB input file from OFF.
INSERT INTO out.products 
SELECT 
    code, 
    product_name AS name, 
    ingredients_text AS ingredients, 
    -- Fix: Ensure JSON arrays are strings
    list_to_json(ingredients_from_palm_oil_tags)::VARCHAR AS palm_oil_tags,
    list_to_json(ingredients_that_may_be_from_palm_oil_tags)::VARCHAR AS palm_oil_may_be_tags,
    image_front_small_url AS image_url,
    nutriscore_grade,
    nova_group,
    -- Fix: Ensure JSON object is string
    json_serialize(nutrient_levels) AS nutrient_levels,
    list_to_json(additives_tags)::VARCHAR AS additives_tags,
    epoch(now()) AS last_updated
FROM read_ndjson('https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz')
WHERE code IS NOT NULL 
  AND (
    ingredients_text IS NOT NULL 
    OR ingredients_from_palm_oil_tags IS NOT NULL
    OR ingredients_that_may_be_from_palm_oil_tags IS NOT NULL
  )
LIMIT 100000; -- Limit during dev/initial sync to avoid timeout

-- Create Indices in SQLite
CREATE INDEX out.idx_products_name ON products(name);

DETACH out;
