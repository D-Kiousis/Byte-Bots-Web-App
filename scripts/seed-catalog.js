"use strict";

/*
 * Seeds the 100-item product catalog (macros, allergen flags, bin locations),
 * starting stock, and 5 fictional patient personas.
 *   1. Run database/schema_v2.sql in Supabase.   2. node scripts/seed-catalog.js
 * Safe to re-run (products match on SKU). Nutrition values are rounded,
 * typical per-serving figures for a DEMO, not lab-verified label data.
 *
 * Row format: name|unit|calories|sodium_mg|protein_g|carbs_g|sugar_g|sat_fat_g|potassium_mg|allergens
 * Aisles: A Produce, B Protein, C Grains, D Pantry, E Dairy. Bin = aisle-shelf-bin.
 */

const path = require("node:path");

const SECTIONS = {
    Produce: ["A", `Spinach|bunch|7|24|1|1|0|0|167
Kale|bunch|33|29|3|6|2|0|299
Carrots|bag|25|42|1|6|3|0|195
Broccoli|head|31|30|3|6|2|0|288
Cauliflower|head|27|32|2|5|2|0|299
Sweet potatoes|lb|112|72|2|26|5|0|438
Russet potatoes|bag|160|13|4|37|2|0|620
Bananas|bunch|105|1|1|27|14|0|422
Apples|bag|95|2|0|25|19|0|195
Oranges|bag|62|0|1|15|12|0|237
Blueberries|pint|84|1|1|21|15|0|114
Strawberries|pint|49|2|1|12|7|0|233
Grapes|bag|62|2|1|16|15|0|176
Pears|bag|101|2|1|27|17|0|206
Cabbage|head|22|16|1|5|3|0|170
Green beans|bag|31|6|2|7|3|0|211
Bell peppers|bag|30|4|1|7|4|0|251
Cucumbers|each|16|2|1|4|2|0|152
Tomatoes|bag|22|6|1|5|3|0|292
Yellow onions|bag|44|4|1|10|5|0|161
Zucchini|each|33|16|2|6|5|0|512
Celery|bunch|16|81|1|3|1|0|260
Romaine lettuce|head|8|4|1|2|1|0|116
Avocados|each|240|11|3|13|1|3|690
Mangoes|each|99|2|1|25|23|0|277
Cantaloupe|each|53|26|1|13|12|0|472
Pineapple|each|82|2|1|22|16|0|180
Beets|bunch|58|106|2|13|9|0|442
Butternut squash|each|82|8|2|22|4|0|582
Mushrooms|pack|15|4|2|2|1|0|223`],
    Protein: ["B", `Canned salmon|can|120|230|17|0|0|1.5|280|fish
Canned tuna, low sodium|can|100|50|22|0|0|0.5|200|fish
Chicken breast|lb|140|65|26|0|0|1|220
Ground turkey|lb|170|75|21|0|0|2.5|240
Eggs|dozen|70|70|6|0|0|1.5|70|eggs
Dried black beans|bag|110|0|7|20|1|0|370
Canned black beans|can|110|460|7|20|0|0|300
Dried lentils|bag|115|2|9|20|1|0|365
Canned chickpeas|can|120|350|6|20|1|0|240
Peanut butter|jar|190|140|7|7|3|3|210|peanuts
Tofu|block|80|10|9|2|0|1|150|soy
Canned pinto beans|can|110|420|7|19|0|0|340
Pork chops|lb|180|60|25|0|0|3|370
Beef chuck roast|lb|210|70|22|0|0|5|330
Tilapia fillets|bag|110|45|23|0|0|1|280|fish
Frozen shrimp|bag|80|220|18|0|0|0|90|shellfish
Canned chicken|can|90|330|15|1|0|0.5|150
Deli ham|pack|60|550|9|1|1|1|150
Sausage links|pack|180|520|9|1|0|5|180
Almonds|bag|160|0|6|6|1|1|208|tree_nuts`],
    Grains: ["C", `Brown rice|bag|160|5|4|34|0|0.5|84
White rice|bag|160|0|3|36|0|0|55
Rolled oats|canister|150|0|5|27|1|0.5|150
Whole wheat pasta|box|180|0|7|37|2|0.5|190|wheat
White pasta|box|200|0|7|42|2|0|60|wheat
Quinoa|bag|120|5|4|21|1|0|172
Whole wheat bread|loaf|80|130|4|14|2|0|70|wheat
White bread|loaf|75|150|2|14|2|0|35|wheat
Corn tortillas|pack|60|10|1|12|0|0|40
Flour tortillas|pack|140|350|4|24|1|1|70|wheat
Cornmeal|bag|110|0|2|24|0|0|60
Barley|bag|170|5|6|35|1|0|160|wheat
Sweetened cereal|box|140|190|2|30|12|0|50|wheat
Bran flakes|box|100|190|3|24|6|0|200|wheat
Saltine crackers|box|130|230|2|22|1|1|40|wheat
Bagels|pack|270|430|10|53|6|0.5|120|wheat
Couscous|box|175|5|6|36|0|0|90|wheat
Granola bars|box|100|80|2|17|7|1|90|tree_nuts`],
    Pantry: ["D", `Canned tomatoes|can|25|180|1|5|3|0|230
Canned chicken noodle soup|can|90|890|4|13|3|1|260|wheat
Chicken broth, low sodium|carton|10|140|1|1|0|0|60
Pasta sauce|jar|70|480|2|11|7|0.5|330
Olive oil|bottle|120|0|0|0|0|2|0
Canola oil|bottle|120|0|0|0|0|1|0
Canned corn|can|60|280|2|13|3|0|190
Canned green beans|can|20|330|1|4|1|0|110
Peaches in syrup|can|100|10|1|26|24|0|180
Peaches in juice|can|60|10|1|15|13|0|180
Unsweetened applesauce|jar|50|0|0|13|11|0|90
Raisins|box|130|10|1|31|25|0|320
Honey|bottle|60|0|0|17|17|0|11
Granulated sugar|bag|45|0|0|12|12|0|0
Salt-free seasoning|jar|0|0|0|0|0|0|10
Soy sauce|bottle|10|900|1|1|0|0|40|soy,wheat
Ketchup|bottle|20|160|0|5|4|0|50
Yellow mustard|bottle|0|55|0|0|0|0|10
Potato chips|bag|150|170|2|15|0|1.5|350
Instant ramen|pack|190|830|4|27|1|3.5|90|wheat
Fruit cocktail|can|60|10|0|15|14|0|100
Pancake syrup|bottle|110|20|0|28|20|0|2`],
    Dairy: ["E", `Whole milk|gallon|150|105|8|12|12|4.5|350|milk
Skim milk|gallon|80|130|8|12|12|0|400|milk
Plain yogurt|tub|100|65|9|7|6|1.5|240|milk
Nonfat Greek yogurt|tub|90|55|15|5|4|0|240|milk
Cheddar cheese|block|110|180|7|0|0|6|30|milk
Mozzarella|bag|80|180|6|1|0|3.5|30|milk
Cottage cheese|tub|90|360|12|5|4|1.5|130|milk
Butter|lb|100|80|0|0|0|7|3|milk
Unsweetened almond milk|carton|30|170|1|1|0|0|160|tree_nuts
Soy milk|carton|80|90|7|4|1|0.5|300|soy`]
};

// Fictional personas with overlapping chronic conditions (first names only).
const PERSONAS = [
    { display_name: "Maria", household_size: 4, health_conditions: ["diabetes", "hypertension"], allergens: [] },
    { display_name: "James", household_size: 2, health_conditions: ["chronic_kidney_disease", "hypertension"], allergens: [] },
    { display_name: "Linda", household_size: 1, health_conditions: ["heart_disease", "diabetes"], allergens: ["peanuts"] },
    { display_name: "Robert", household_size: 3, health_conditions: ["hypertension"], allergens: ["shellfish"] },
    { display_name: "Aisha", household_size: 5, health_conditions: ["chronic_kidney_disease", "diabetes", "heart_disease"], allergens: ["milk"] }
];

function buildCatalog() {
    const items = [];
    for (const [category, [aisle, rows]] of Object.entries(SECTIONS)) {
        rows.split("\n").forEach((row, index) => {
            const [name, unit, cal, na, protein, carbs, sugar, sat, k, allergens = ""] = row.split("|");
            const n = items.length + 1;
            items.push({
                name, category, unit,
                sku: `EC-${String(n).padStart(3, "0")}`,
                calories_per_serving: Number(cal), sodium_mg: Number(na), protein_g: Number(protein),
                carbs_g: Number(carbs), sugar_g: Number(sugar), sat_fat_g: Number(sat), potassium_mg: Number(k),
                allergens: allergens ? allergens.split(",") : [],
                allergen_info_verified: true,
                bin_location: `${aisle}-${Math.floor(index / 8) + 1}-${(index % 8) + 1}`
            });
        });
    }
    return items;
}

async function main() {
    if (typeof process.loadEnvFile === "function") {
        try { process.loadEnvFile(path.resolve(__dirname, "..", ".env")); } catch (error) { if (error.code !== "ENOENT") throw error; }
    }
    const url = process.env.SUPABASE_URL && process.env.SUPABASE_URL.replace(/\/+$/, "");
    const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SECRET_KEY in .env first.");

    async function rest(resource, { method = "GET", body, prefer } = {}) {
        const response = await fetch(`${url}/rest/v1/${resource}`, {
            method,
            headers: {
                apikey: key,
                ...(key.startsWith("sb_secret_") ? {} : { Authorization: `Bearer ${key}` }),
                "Content-Type": "application/json",
                ...(prefer ? { Prefer: prefer } : {})
            },
            body: body ? JSON.stringify(body) : undefined
        });
        const text = await response.text();
        if (!response.ok) throw new Error(`${resource}: HTTP ${response.status} ${text}`);
        return text ? JSON.parse(text) : null;
    }

    const catalog = buildCatalog();
    const saved = await rest("products?on_conflict=sku&select=id,sku", {
        method: "POST", body: catalog, prefer: "resolution=merge-duplicates,return=representation"
    });
    const idBySku = new Map(saved.map((row) => [row.sku, row.id]));
    const stock = catalog.map((item, index) => ({
        product_id: idBySku.get(item.sku),
        quantity: (index + 1) % 13 === 0 ? 4 : 20 + ((index * 7) % 50), // every 13th item starts low, to demo restocking
        reorder_level: 10
    }));
    await rest("inventory?on_conflict=product_id", { method: "POST", body: stock, prefer: "resolution=merge-duplicates" });

    const names = PERSONAS.map((persona) => persona.display_name).join(",");
    const existing = await rest(`patients?select=display_name&display_name=in.(${names})`);
    const have = new Set(existing.map((row) => row.display_name));
    const fresh = PERSONAS.filter((persona) => !have.has(persona.display_name));
    if (fresh.length) await rest("patients", { method: "POST", body: fresh });
    console.log(`Seeded ${catalog.length} products with stock and ${fresh.length} new patient personas.`);
}

module.exports = { buildCatalog, PERSONAS };

if (require.main === module) {
    main().catch((error) => { console.error(error.message); process.exit(1); });
}
