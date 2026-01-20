INSTALL httpfs;
LOAD httpfs;
INSTALL fts;
LOAD fts;

-- Output file
OPEN 'products.sqlite';

-- Turn off safety for speed
PRAGMA synchronous=OFF;
PRAGMA journal_mode=MEMORY;

-- Create Schema
CREATE TABLE products (
    code TEXT PRIMARY KEY,
    name TEXT,
    ingredients TEXT,
    palm_oil_tags TEXT,
    last_updated INTEGER
);

-- Extract from URL (Streaming)
-- Note: 'auto_detect=true' works for JSONL.
-- Using 10GB input file from OFF.
INSERT INTO products
SELECT 
    code, 
    product_name AS name, 
    ingredients_text AS ingredients, 
    ingredients_from_palm_oil_tags AS palm_oil_tags,
    ingredients_that_may_be_from_palm_oil_tags AS palm_oil_may_be_tags,
    image_front_small_url AS image_url,
    nutriscore_grade,
    nova_group,
    json_serialize(nutrient_levels) AS nutrient_levels,
    list_string_agg(additives_tags) AS additives_tags,
    epoch(now()) AS last_updated
FROM read_ndjson('https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz')
WHERE code IS NOT NULL 
  AND (
    ingredients_text IS NOT NULL 
    OR ingredients_from_palm_oil_tags IS NOT NULL
    OR ingredients_that_may_be_from_palm_oil_tags IS NOT NULL
  );

-- Create Indices (Critical for mobile perf)
CREATE INDEX idx_products_name ON products(name);
-- SQLite will auto-index PRIMARY KEY code.

-- FTS (Optional show-off, adds size)
-- CREATE VIRTUAL TABLE products_fts USING fts5(name, ingredients, content='products', content_rowid='rowid');
-- INSERT INTO products_fts(products_fts) VALUES('rebuild');

-- Optimize
VACUUM;
