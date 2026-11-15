"use strict";

// Run with: node --test backend/ai.test.js
// These tests need no network, no API key, and no database.

const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const ai = require("./ai");

const item = (name, category, sodium, id = randomUUID()) => ({ id, name, category, calories: 100, sodium_mg: sodium });
const context = (cart, candidates) => ({
    cartIds: new Set(cart.map((i) => i.id)),
    candidateIds: new Set(candidates.map((i) => i.id))
});
const goodRecipe = (cart, missing = []) => ({
    title: "Rice bowl",
    servings: 2,
    uses_cart_ids: cart.map((i) => i.id),
    missing_ids: missing.map((i) => i.id),
    steps: ["Cook the rice.", "Add the vegetables."],
    why_it_fits: "Low in sodium."
});

test("parseJson accepts markdown-fenced JSON", () => {
    assert.deepEqual(ai.parseJson('```json\n{"recipes":[]}\n```'), { recipes: [] });
});

test("parseJson extracts JSON surrounded by chatter", () => {
    assert.deepEqual(ai.parseJson('Sure! {"recipes":[]} Enjoy.'), { recipes: [] });
});

test("parseJson rejects non-JSON with a retryable error", () => {
    assert.throws(() => ai.parseJson("no json here"), (error) => error instanceof ai.AiError && error.retryable);
});

test("validateRecipes keeps a valid recipe", () => {
    const cart = [item("Brown rice", "Grains", 5)];
    const extra = [item("Spinach", "Produce", 20)];
    const { recipes, dropped } = ai.validateRecipes({ recipes: [goodRecipe(cart, extra)] }, context(cart, extra));
    assert.equal(recipes.length, 1);
    assert.equal(dropped.length, 0);
});

test("validateRecipes keeps five distinct safe recipes", () => {
    const cart = [item("Brown rice", "Grains", 5)];
    const ideas = Array.from({ length: 6 }, (_, index) => ({
        ...goodRecipe(cart),
        title: index === 5 ? "Meal 0" : `Meal ${index}`
    }));
    const { recipes } = ai.validateRecipes({ recipes: ideas }, context(cart, []));
    assert.equal(recipes.length, 5);
    assert.equal(new Set(recipes.map((recipe) => recipe.title)).size, 5);
});

test("Gemini prompt contains general recipe data, not a patient profile", () => {
    const prompt = ai.buildPrompt({
        tier: null,
        cart: [item("Brown rice", "Grains", 5)],
        candidates: []
    });
    assert.match(prompt, /no patient health profile is provided/);
    assert.doesNotMatch(prompt, /diabetes|peanut/i);
});

test("validateRecipes drops a recipe that invents an ingredient id", () => {
    const cart = [item("Brown rice", "Grains", 5)];
    const bad = goodRecipe(cart, [item("Imaginary cheese", "Dairy", 0)]);
    const { recipes, dropped } = ai.validateRecipes({ recipes: [bad] }, context(cart, []));
    assert.equal(recipes.length, 0);
    assert.equal(dropped.length, 1);
});

test("validateRecipes drops a recipe that uses an item not in the cart", () => {
    const cart = [item("Brown rice", "Grains", 5)];
    const stranger = item("Canned soup", "Pantry", 900);
    const bad = goodRecipe([stranger]);
    const { recipes } = ai.validateRecipes({ recipes: [bad] }, context(cart, []));
    assert.equal(recipes.length, 0);
});

test("validateRecipes rejects steps that are too few", () => {
    const cart = [item("Brown rice", "Grains", 5)];
    const bad = { ...goodRecipe(cart), steps: ["Only one step."] };
    assert.equal(ai.validateRecipes({ recipes: [bad] }, context(cart, [])).recipes.length, 0);
});

test("validateRecipes throws when the recipes array is missing", () => {
    assert.throws(() => ai.validateRecipes({}, context([], [])), ai.AiError);
});

test("fallback recipes pass the same validation as model output", () => {
    const cart = [item("Brown rice", "Grains", 5)];
    const candidates = [item("Spinach", "Produce", 20), item("Lentils", "Protein", 10)];
    const fallback = ai.fallbackRecipes({ cart, candidates });
    const { recipes } = ai.validateRecipes({ recipes: fallback }, context(cart, candidates));
    assert.equal(fallback.length, 5);
    assert.equal(recipes.length, 5);
    assert.deepEqual(recipes[0].missing_ids.length, 2);
});

test("recommendRecipes falls back when the provider has no API key", async () => {
    process.env.AI_PROVIDER = "gemini";
    delete process.env.GEMINI_API_KEY;
    const cart = [item("Brown rice", "Grains", 5)];
    const result = await ai.recommendRecipes({ tier: null, cart, candidates: [] });
    assert.equal(result.source, "fallback");
    assert.match(result.reason, /GEMINI_API_KEY/);
    assert.ok(result.recipes.length >= 1);
});

test("handleRecipeRequest keeps restricted items out of recipes and reports them", async () => {
    process.env.AI_PROVIDER = "off";
    const rice = randomUUID();
    const soup = randomUUID();
    const spinach = randomUUID();
    const row = (id, name, category, sodium, quantity) => ({
        product_id: id,
        quantity,
        products: { name, category, unit: "each", calories_per_serving: 100, sodium_mg: sodium, active: true }
    });
    const rows = [
        row(rice, "Brown rice", "Grains", 5, 10),
        row(soup, "Canned soup", "Pantry", 900, 10),
        row(spinach, "Spinach", "Produce", 20, 10),
        row(randomUUID(), "Pickles", "Pantry", 800, 10)
    ];
    const result = await ai.handleRecipeRequest({ cart_ids: [rice, soup] }, async () => rows);

    assert.deepEqual(result.restricted_in_cart.map((i) => i.name), ["Canned soup"]);
    assert.equal(result.source, "fallback");
    for (const recipe of result.recipes) {
        assert.ok(!recipe.uses_cart_ids.includes(soup), "restricted item must not be used");
        assert.ok(recipe.missing.every((m) => m.name !== "Pickles"), "restricted candidates must not be suggested");
    }
});

test("handleRecipeRequest rejects malformed or unknown cart ids", async () => {
    await assert.rejects(() => ai.handleRecipeRequest({ cart_ids: ["nope"] }, async () => []), { status: 400 });
    await assert.rejects(() => ai.handleRecipeRequest({ cart_ids: [randomUUID()] }, async () => []), { status: 400 });
});

// ---- Busy-model handling (fetch is mocked, so no network or key is needed) ----

const jsonResponse = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const geminiText = (text) => ({ candidates: [{ content: { parts: [{ text }] } }] });

function mockGemini(handler) {
    const original = global.fetch;
    const calls = [];
    global.fetch = async (url) => {
        calls.push(String(url));
        return handler(String(url), calls.length);
    };
    return { calls, restore: () => { global.fetch = original; } };
}

function useGeminiEnv(extra = {}) {
    process.env.AI_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-key";
    process.env.GEMINI_MODEL = "main-model";
    process.env.AI_RETRY_DELAY_MS = "0";
    delete process.env.GEMINI_FALLBACK_MODEL;
    Object.assign(process.env, extra);
}

function clearGeminiEnv() {
    for (const name of ["AI_PROVIDER", "GEMINI_API_KEY", "GEMINI_MODEL", "GEMINI_FALLBACK_MODEL", "AI_RETRY_DELAY_MS"]) {
        delete process.env[name];
    }
}

test("a busy main model switches to the backup model", async () => {
    useGeminiEnv({ GEMINI_FALLBACK_MODEL: "backup-model" });
    const cart = [item("Brown rice", "Grains", 5)];
    const reply = JSON.stringify({ recipes: [goodRecipe(cart)] });
    const mock = mockGemini((url) => url.includes("main-model")
        ? jsonResponse(503, { error: { message: "high demand" } })
        : jsonResponse(200, geminiText(reply)));
    try {
        const result = await ai.recommendRecipes({ tier: null, cart, candidates: [] });
        assert.equal(result.source, "gemini");
        assert.equal(result.model, "backup-model");
        assert.equal(mock.calls.length, 2);
    } finally {
        mock.restore();
        clearGeminiEnv();
    }
});

test("with no backup model, a busy model is retried once", async () => {
    useGeminiEnv();
    const cart = [item("Brown rice", "Grains", 5)];
    const reply = JSON.stringify({ recipes: [goodRecipe(cart)] });
    const mock = mockGemini((url, callNumber) => callNumber === 1
        ? jsonResponse(503, { error: { message: "high demand" } })
        : jsonResponse(200, geminiText(reply)));
    try {
        const result = await ai.recommendRecipes({ tier: null, cart, candidates: [] });
        assert.equal(result.source, "gemini");
        assert.equal(mock.calls.length, 2);
    } finally {
        mock.restore();
        clearGeminiEnv();
    }
});

test("a wrong model name is not retried and uses the built-in recipe", async () => {
    useGeminiEnv({ GEMINI_FALLBACK_MODEL: "backup-model" });
    const cart = [item("Brown rice", "Grains", 5)];
    const mock = mockGemini(() => jsonResponse(404, { error: { message: "model not found" } }));
    try {
        const result = await ai.recommendRecipes({ tier: null, cart, candidates: [] });
        assert.equal(result.source, "fallback");
        assert.match(result.reason, /model not found/);
        assert.equal(mock.calls.length, 1);
    } finally {
        mock.restore();
        clearGeminiEnv();
    }
});

test("when every model is busy the built-in recipe is returned", async () => {
    useGeminiEnv({ GEMINI_FALLBACK_MODEL: "backup-model" });
    const cart = [item("Brown rice", "Grains", 5)];
    const mock = mockGemini(() => jsonResponse(503, { error: { message: "high demand" } }));
    try {
        const result = await ai.recommendRecipes({ tier: null, cart, candidates: [] });
        assert.equal(result.source, "fallback");
        assert.ok(result.recipes.length >= 1);
        assert.equal(mock.calls.length, 2);
    } finally {
        mock.restore();
        clearGeminiEnv();
    }
});

test("ping reports which model actually answered", async () => {
    useGeminiEnv({ GEMINI_FALLBACK_MODEL: "backup-model" });
    const mock = mockGemini((url) => url.includes("main-model")
        ? jsonResponse(503, { error: { message: "high demand" } })
        : jsonResponse(200, geminiText('{"ok":true}')));
    try {
        const result = await ai.ping();
        assert.equal(result.ok, true);
        assert.equal(result.used_model, "backup-model");
    } finally {
        mock.restore();
        clearGeminiEnv();
    }
});
