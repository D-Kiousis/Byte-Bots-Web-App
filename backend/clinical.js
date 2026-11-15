"use strict";

/*
 * Clinical rules matrix + evaluator (the deterministic System of Record side).
 * Values are PER SERVING and are prototype assumptions drawn from common public
 * guidance (FDA "low sodium" = 140 mg, renal low-potassium ~200 mg, etc.).
 * A registered dietitian must review them before any real-world use.
 *
 *   value <= cap          -> approved (green)
 *   cap < value <= max    -> capped   (yellow, limited quantity)
 *   value > max           -> restricted (red)
 * With several conditions, the WORST status wins and every reason is listed.
 */

const SODIUM = { field: "sodium_mg", label: "sodium", unit: " mg", cap: 140, max: 360 };

const RULES = {
    hypertension: [SODIUM],
    heart_disease: [SODIUM, { field: "sat_fat_g", label: "saturated fat", unit: " g", cap: 1.5, max: 4 }],
    diabetes: [
        { field: "sugar_g", label: "sugar", unit: " g", cap: 6, max: 15 },
        { field: "carbs_g", label: "carbohydrate", unit: " g", cap: 30, max: 45 }
    ],
    chronic_kidney_disease: [SODIUM, { field: "potassium_mg", label: "potassium", unit: " mg", cap: 200, max: 400 }]
};

const CONDITION_NAMES = {
    hypertension: "hypertension",
    heart_disease: "heart disease",
    diabetes: "diabetes",
    chronic_kidney_disease: "kidney disease"
};

const RANK = { approved: 0, capped: 1, restricted: 2 };
const STATUS_LABEL = { approved: "Approved", capped: "Limit", restricted: "Restricted" };

function evaluate(product, profile = {}) {
    let status = "approved";
    const reasons = [];
    const raise = (next, why) => {
        if (RANK[next] > RANK[status]) status = next;
        reasons.push(why);
    };

    for (const condition of profile.health_conditions || []) {
        for (const rule of RULES[condition] || []) {
            const value = Number(product[rule.field] || 0);
            const note = `${rule.label} ${value}${rule.unit} per serving (${CONDITION_NAMES[condition]})`;
            if (value > rule.max) raise("restricted", `Too high in ${note}`);
            else if (value > rule.cap) raise("capped", `Moderate ${note}`);
        }
    }

    const mine = profile.allergens || [];
    if (mine.length) {
        if (product.allergen_info_verified !== true) {
            raise("restricted", "Allergen label has not been reviewed by staff");
        }
        const hits = (product.allergens || []).filter((allergen) => mine.includes(allergen));
        if (hits.length) raise("restricted", `Contains ${hits.join(", ").replace(/_/g, " ")}`);
    }
    return { status, label: STATUS_LABEL[status], reasons };
}

module.exports = { RULES, STATUS_LABEL, evaluate };
