import fs from 'fs';

const FILE_PATH = process.argv[2] || './public/data/products.json';
const IGNORE_PHRASES = [
    'hearts of palm', 
    'palm sugar', 
    'coconut', 
    'palmitic acid', 
    'palmesukker',
    'coeurs de palmiers', 'palmito', 'palmeherz'
];

// Variants list verified by user
const PALM_VARIANTS = [
    'palm oil', 'palm fat', 'palm kernel', 'palmitate', 'elaeis guineensis', 'sustainable palm', 'huile de palme', 
    'graisse de palme', 'palmfett', 'palmolie', 'ölpalme', 'palmkerne', 'palmkern', 'palm- und', 'palm und', 
    'huile de palmiste', 'huile palme', 'palm õil', 'grăsime palmier', 'palmöl', 'palmekjerne',
    'fat palm', 'fats palm', 'oil palm', 
    'palm oll', 'palm ol', 'palm oi', 'palm 0i', 'palm lemal oll', 'vegetable palm', 'olio di palma',
    'palm and rapeseed', 'palm & rapeseed', 'palm and/or', 'palm and or', 'palm & or'
];

const CONTEXT_KEYWORDS = 'vegetable|vegtable|végétal|margarine|fette|fetter|graisse|fat|oil|oils|vegetabte';

function tagPalmOil() {
    console.log(`Reading ${FILE_PATH}...`);
    
    if (!fs.existsSync(FILE_PATH)) {
        console.error(`File not found: ${FILE_PATH}`);
        process.exit(1);
    }

    try {
        const rawData = fs.readFileSync(FILE_PATH, 'utf8');
        let products;
        try {
            products = JSON.parse(rawData);
        } catch (e) {
            // Try parsing as NDJSON if standard JSON parse fails
            try {
                products = rawData.trim().split('\n').filter(line => line.trim()).map(line => JSON.parse(line));
                console.log('Detected NDJSON input format, parsing line by line...');
            } catch (e2) {
                // If both fail, throw the original error or a combined one
                throw new Error(`Failed to parse input file: ${e.message}`); 
            }
        }
        let updatedCount = 0;

        products.forEach(p => {
            if (!p.ingredients) return;

            // 1. Normalize
            let text = p.ingredients.toLowerCase().replace(/\s+/g, ' ');
            const simpleTextOriginal = text.replace(/[^a-z0-9]/g, '');

            // 2. Remove Ignored Phrases
            IGNORE_PHRASES.forEach(phrase => {
                const parts = phrase.split(' ');
                const pattern = parts.map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[^a-z0-9]+');
                const regex = new RegExp(pattern, 'g');
                text = text.replace(regex, (match) => ' '.repeat(match.length));
            });

            // 3. Simple Text Check (Nuclear Option)
            const simpleText = text.replace(/[^a-z0-9]/g, '');
            
            let detected = false;

            // A. Check Known Variants (Nuclear)
            const isKnown = PALM_VARIANTS.some(v => {
                const simpleV = v.replace(/[^a-z0-9]/g, '');
                return simpleText.includes(simpleV);
            });

            if (isKnown) detected = true;

            // B. Context Regex (margarine etc)
            if (!detected) {
                // Use original text (with spaces) for context regex
                const contextRegex = new RegExp(`(?:${CONTEXT_KEYWORDS}).{0,100}[:\\(\\[][^\\)\\]]*palm`, 'i');
                if (contextRegex.test(text)) detected = true;
            }

            // 4. Update Product
            if (detected) {
                // Parse existing tags
                let tags = [];
                try {
                    tags = JSON.parse(p.palm_oil_tags || '[]');
                } catch (e) { tags = []; }

                if (tags.length === 0) {
                    tags.push('detected-palm-oil');
                    p.palm_oil_tags = JSON.stringify(tags);
                    updatedCount++;
                }
            }
        });

        const stream = fs.createWriteStream(FILE_PATH);
        stream.write('[\n');
        
        products.forEach((p, index) => {
             const optimized = {
                c: p.c || p.code,
                n: p.n || p.name || p.product_name,
                i: p.i || p.ingredients || p.ingredients_text,
                pt: p.pt || p.palm_oil_tags,
                pmt: p.pmt || p.palm_oil_may_be_tags,
                ns: p.ns || p.nutriscore_grade,
                ng: p.ng || p.nova_group,
                nl: p.nl || p.nutrient_levels,
                at: p.at || p.additives_tags,
                l: p.l || p.last_updated
            };
            const separator = index < products.length - 1 ? ',\n' : '\n';
            stream.write(JSON.stringify(optimized) + separator);
        });
        
        stream.write(']');
        stream.end();
        console.log(`Saved updated data to ${FILE_PATH} (JSON format)`);

    } catch (err) {
        console.error("Error processing file:", err);
        process.exit(1);
    }
}

tagPalmOil();
