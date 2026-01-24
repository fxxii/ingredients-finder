import fs from 'fs';
import path from 'path';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const INPUT_FILE = path.join(__dirname, '../public/data/products.json');
const OUTPUT_FILE = path.join(__dirname, '../public/data/products.jsonl');
const OUTPUT_GZ_FILE = path.join(__dirname, '../public/data/products.jsonl.gz');

async function convert() {
  console.log('Reading products.json...');
  try {
    const rawData = fs.readFileSync(INPUT_FILE, 'utf-8');
    const products = JSON.parse(rawData);

    if (!Array.isArray(products)) {
      throw new Error('products.json must be an array');
    }

    console.log(`Found ${products.length} products. converting to NDJSON...`);

    const writeStream = fs.createWriteStream(OUTPUT_FILE);
    
    for (const product of products) {
      // Ensure it's a single line string
      const line = JSON.stringify(product) + '\n';
      writeStream.write(line);
    }
    
    writeStream.end();
    
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    console.log('NDJSON Created. Compressing to .gz...');

    const source = fs.createReadStream(OUTPUT_FILE);
    const destination = fs.createWriteStream(OUTPUT_GZ_FILE);
    const gzip = createGzip();

    await pipeline(source, gzip, destination);

    console.log('Compression complete!');
    console.log(`Original: ${(fs.statSync(INPUT_FILE).size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`NDJSON:   ${(fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Gzipped:  ${(fs.statSync(OUTPUT_GZ_FILE).size / 1024 / 1024).toFixed(2)} MB`);

  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

convert();
