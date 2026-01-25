
const IGNORE_PHRASES = [
    'hearts of palm', 
    'palm sugar', 
    'coconut', 
    'palmitic acid', 
    'palmesukker',
    'coeurs de palmiers', 'palmito', 'palmeherz'
];

let PALM_VARIANTS = [
    'palm oil', 'palm fat', 'palm kernel', 'palmitate', 'elaeis guineensis', 'sustainable palm', 'huile de palme', 
    'vegetable oil', 'vegetable fat', 'vegetable fats', 'vegetable oils',
    'graisse de palme', 'palmfett', 'palmolie', 'ölpalme', 'palmkerne', 'palmkern', 'palm- und', 'palm und', 
    'huile de palmiste', 'huile palme', 'palm õil', 'grăsime palmier', 'palmöl', 'palmekjerne', 'vegetabte',
    'fat palm', 'fats palm', 'oil palm', 
    'palm oll', 'palm ol', 'palm oi', 'palm 0i', 'palm lemal oll', 'vegetable palm', 'olio di palma',
    'palm and rapeseed', 'palm & rapeseed', 'palm and/or', 'palm and or', 'palm & or'
];

const CONTEXT_KEYWORDS = 'vegetable|vegtable|végétal|margarine|fette|fetter|graisse|fat|oil|oils|vegetabte';

function checkIngredients(ingredients) {
    console.log(`\nTesting ingredients: "${ingredients}"`);
    
    // 1. Normalize
    let text = ingredients.toLowerCase().replace(/\s+/g, ' ');
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
    let detectionMethod = '';

    // A. Check Known Variants (Nuclear)
    const isKnown = PALM_VARIANTS.some(v => {
        const simpleV = v.replace(/[^a-z0-9]/g, '');
        if (simpleText.includes(simpleV)) {
            // console.log(`Matched variant: ${v}`);
            return true;
        }
        return false;
    });

    if (isKnown) {
        detected = true;
        detectionMethod = 'Variant Match';
    }

    // B. Context Regex (margarine etc)
    if (!detected) {
        // Use original text (with spaces) for context regex
        const contextRegex = new RegExp(`(?:${CONTEXT_KEYWORDS}).{0,100}[:\\(\\[][^\\)\\]]*palm`, 'i');
        if (contextRegex.test(text)) {
            detected = true;
            detectionMethod = 'Context Regex';
        }
    }

    console.log(`Detected: ${detected} (${detectionMethod})`);
    return detected;
}

// Test Case 1: The user provided example (Rapeseed)
const product1 = "Noodles (Gram Flour, Maize Flour, Potato Starch, Vegetable Oil (Rapeseed), Salt, Chillies, Caraway Seeds, Cumin Seeds, Sodium Bicarbonate), Peanuts, Lentils, Chick Peas, Vegetable Oil (Rapeseed), Salt, Spices.";

// Test Case 2: Should match (Vegetable Oil with Palm)
const product2 = "Vegetable Oil (Palm), Salt.";

// Test Case 3: Mixed
const product3 = "Vegetable Oil (Rapeseed, Palm Oil)";

console.log("--- RUN 1: WITH GENERIC VEGETABLE OILS ---");
checkIngredients(product1);
checkIngredients(product2);
checkIngredients(product3);

console.log("\n--- RUN 2: REMOVING GENERIC VEGETABLE OILS ---");
PALM_VARIANTS = PALM_VARIANTS.filter(v => !['vegetable oil', 'vegetable fat', 'vegetable fats', 'vegetable oils'].includes(v));
checkIngredients(product1); // Should be FALSE now
checkIngredients(product2); // Should be TRUE (via regex or specific variant?)
checkIngredients(product3); // Should be TRUE
