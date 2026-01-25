
import fs from 'fs';
import path from 'path';
import { createUnzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const GZ_FILE = path.join(__dirname, '../public/data/products.jsonl.gz');
const OUTPUT_FILE = path.join(__dirname, '../public/data/products.json');

async function restore() {
    console.log(`Restoring ${OUTPUT_FILE} from ${GZ_FILE}...`);
    
    if (!fs.existsSync(GZ_FILE)) {
        console.error('GZ file not found!');
        process.exit(1);
    }

    const source = fs.createReadStream(GZ_FILE);
    const destination = fs.createWriteStream(OUTPUT_FILE);
    const unzip = createUnzip();

    try {
        await pipeline(source, unzip, destination);
        console.log('Restoration complete.');
    } catch (err) {
        console.error('Error restoring file:', err);
        process.exit(1);
    }
}

restore();
