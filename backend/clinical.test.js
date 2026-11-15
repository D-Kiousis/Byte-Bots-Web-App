"use strict";

// Run with: node --test backend/clinical.test.js   (no network, no database)

const test = require("node:test");
const assert = require("node:assert/strict");
const { evaluate } = require("./clinical");
const { buildCatalog } = require("../scripts/seed-catalog");

const soup = { sodium_mg: 890, sugar_g: 3, carbs_g: 13, sat_fat_g: 1, potassium_mg: 260, allergens: [], allergen_info_verified: true };
const potato = { sodium_mg: 13, sugar_g: 2, carbs_g: 37, sat_fat_g: 0, potassium_mg: 620, allergens: [], allergen_info_verified: true };
const apple = { sodium_mg: 2, sugar_g: 5, carbs_g: 25, sat_fat_g: 0, potassium_mg: 195, allergens: [], allergen_info_verified: true };

test("a patient with no conditions or allergens gets approved", () => {
    assert.equal(evaluate(soup, {}).status, "approved");
});

test("high-sodium soup is restricted for hypertension, with a reason", () => {
    const result = evaluate(soup, { health_conditions: ["hypertension"] });
    assert.equal(result.status, "restricted");
    assert.match(result.reasons[0], /sodium/);
});

test("overlapping conditions: the worst status wins and all reasons are kept", () => {
    const result = evaluate(potato, { health_conditions: ["diabetes", "chronic_kidney_disease"] });
    assert.equal(result.status, "restricted"); // potassium 620 > 400
    assert.ok(result.reasons.length >= 2, "carbs (capped) and potassium (restricted)");
});

test("moderate values are capped, not restricted", () => {
    assert.equal(evaluate(apple, { health_conditions: ["diabetes"] }).status, "approved");
    assert.equal(evaluate(potato, { health_conditions: ["diabetes"] }).status, "capped");
});

test("allergens: a match or an unreviewed label is restricted", () => {
    const peanut = { ...apple, allergens: ["peanuts"] };
    assert.equal(evaluate(peanut, { allergens: ["peanuts"] }).status, "restricted");
    assert.equal(evaluate({ ...apple, allergen_info_verified: false }, { allergens: ["milk"] }).status, "restricted");
    assert.equal(evaluate(apple, { allergens: ["milk"] }).status, "approved");
});

test("the seed catalog has 100 unique items with bin locations", () => {
    const catalog = buildCatalog();
    assert.equal(catalog.length, 100);
    assert.equal(new Set(catalog.map((item) => item.sku)).size, 100);
    assert.ok(catalog.every((item) => /^[A-E]-\d-\d$/.test(item.bin_location)));
});
