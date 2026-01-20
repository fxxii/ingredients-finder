INSTALL httpfs;
LOAD httpfs;
INSTALL json;
LOAD json;

-- Export directly to JSON (Universal format, bypasses WASM deserialize issues)
COPY (
    SELECT 
        code, 
        product_name AS name, 
        ingredients_text AS ingredients, 
        to_json(ingredients_from_palm_oil_tags)::VARCHAR AS palm_oil_tags,
        to_json(ingredients_that_may_be_from_palm_oil_tags)::VARCHAR AS palm_oil_may_be_tags,
        image_front_small_url AS image_url,
        nutriscore_grade,
        nova_group,
        to_json(nutrient_levels)::VARCHAR AS nutrient_levels,
        to_json(additives_tags)::VARCHAR AS additives_tags,
        (epoch(now()) * 1000)::BIGINT AS last_updated
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
) TO 'products.json' (FORMAT JSON, ARRAY true);
