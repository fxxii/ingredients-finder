INSTALL httpfs;
LOAD httpfs;
INSTALL sqlite;
LOAD sqlite;
INSTALL json;
LOAD json;

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

-- Extract from URL (Streaming) with strict column definition
INSERT INTO out.products 
SELECT 
    code, 
    product_name AS name, 
    ingredients_text AS ingredients, 
    -- Fix: Use to_json() for lists
    to_json(ingredients_from_palm_oil_tags)::VARCHAR AS palm_oil_tags,
    to_json(ingredients_that_may_be_from_palm_oil_tags)::VARCHAR AS palm_oil_may_be_tags,
    image_front_small_url AS image_url,
    nutriscore_grade,
    nova_group,
    -- Fix: Use to_json() instead of json_serialize()
    to_json(nutrient_levels)::VARCHAR AS nutrient_levels,
    to_json(additives_tags)::VARCHAR AS additives_tags,
    epoch(now()) AS last_updated
FROM read_json_auto(
    'https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz',
    columns={
        code: 'VARCHAR',
        product_name: 'VARCHAR',
        ingredients_text: 'VARCHAR',
        ingredients_from_palm_oil_tags: 'VARCHAR[]',
        ingredients_that_may_be_from_palm_oil_tags: 'VARCHAR[]',
        image_front_small_url: 'VARCHAR',
        nutriscore_grade: 'VARCHAR',
        nova_group: 'INTEGER',
        nutrient_levels: 'JSON',
        additives_tags: 'VARCHAR[]'
    }
)
WHERE code IS NOT NULL 
  AND (
    ingredients_text IS NOT NULL 
    OR len(ingredients_from_palm_oil_tags) > 0
    OR len(ingredients_that_may_be_from_palm_oil_tags) > 0
  )
LIMIT 100000;

-- Note: Indexes are created by the App on first load (initSchema)
-- This avoids "SQLite databases only have a single schema" errors in DuckDB.

DETACH out;
