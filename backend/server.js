const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const ai = require("./ai");
const auth = require("./auth");
const clinical = require("./clinical");
const { randomUUID } = require("node:crypto");

if (typeof process.loadEnvFile === "function") {
    try {
        process.loadEnvFile(path.resolve(__dirname, "..", ".env"));
    } catch (error) {
        if (error.code !== "ENOENT") {
            throw error;
        }
    }
}

const port = Number(process.env.PORT) || 3000;
const frontendRoot = path.resolve(__dirname, "..", "frontend");
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "");
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const geminiConfigured = Boolean(process.env.GEMINI_API_KEY);
const sessionHours = Number(process.env.SESSION_HOURS) || 8;
const maxBodySize = 64 * 1024;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const enrollmentStatuses = ["active", "pending", "expired"];
const healthConditions = ["diabetes", "hypertension", "heart_disease", "chronic_kidney_disease"];
const allergens = ["milk", "eggs", "fish", "shellfish", "tree_nuts", "peanuts", "wheat", "soy", "sesame"];
const patientColumns = "id,created_at,display_name,household_size,enrollment_status";
const patientSelfColumns = `${patientColumns},health_conditions,allergens`;
const productColumns = "id,name,sku,category,unit,calories_per_serving,sodium_mg,allergens,allergen_info_verified,active,created_at,protein_g,carbs_g,sugar_g,sat_fat_g,potassium_mg,bin_location";
const allergenTerms = {
    milk: ["milk", "dairy", "cheese", "butter", "cream", "whey", "casein"],
    eggs: ["egg", "eggs"],
    fish: ["fish", "anchovy", "salmon", "tuna"],
    shellfish: ["shellfish", "shrimp", "prawn", "crab", "lobster", "crayfish"],
    tree_nuts: ["tree nut", "almond", "walnut", "pecan", "cashew", "pistachio", "hazelnut"],
    peanuts: ["peanut", "groundnut"],
    wheat: ["wheat", "flour", "breadcrumbs"],
    soy: ["soy", "soya", "tofu", "edamame"],
    sesame: ["sesame", "tahini"]
};
const contentTypes = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8"
};

class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

function sendJson(res, status, data, headers = {}) {
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        ...headers
    });
    res.end(JSON.stringify(data));
}

function readJson(req) {
    return new Promise((resolve, reject) => {
        // Browsers cannot send application/json from another site without a CORS
        // preflight, which this server never approves. Requiring it blocks
        // cross-site form posts from acting as a signed-in person.
        const contentType = String(req.headers["content-type"] || "").toLowerCase();
        if (!contentType.startsWith("application/json")) {
            reject(new HttpError(415, "Requests must be sent as application/json."));
            return;
        }

        const chunks = [];
        let size = 0;
        let tooLarge = false;

        req.on("data", (chunk) => {
            size += chunk.length;
            if (size > maxBodySize) {
                tooLarge = true;
                return;
            }
            chunks.push(chunk);
        });

        req.on("end", () => {
            if (tooLarge) {
                reject(new HttpError(413, "Request body is too large."));
                return;
            }

            try {
                resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
            } catch {
                reject(new HttpError(400, "Request body must be valid JSON."));
            }
        });

        req.on("error", reject);
    });
}

function requireObject(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new HttpError(400, "Request body must be a JSON object.");
    }
    return value;
}

function optionalText(value, fieldName) {
    if (value === undefined || value === null || value === "") {
        return null;
    }
    if (typeof value !== "string") {
        throw new HttpError(400, `${fieldName} must be text.`);
    }
    return value.trim() || null;
}

function limitedText(value, fieldName, maxLength) {
    const text = optionalText(value, fieldName);
    if (text && text.length > maxLength) {
        throw new HttpError(400, `${fieldName} must be ${maxLength} characters or fewer.`);
    }
    return text;
}

function nonNegativeNumber(value, fieldName) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        throw new HttpError(400, `${fieldName} must be a non-negative number.`);
    }
    return value;
}

function enumList(value, fieldName, allowed) {
    if (!Array.isArray(value) || value.length > allowed.length
        || !value.every((item) => typeof item === "string" && allowed.includes(item))) {
        throw new HttpError(400, `${fieldName} must contain only supported options.`);
    }
    return [...new Set(value)];
}

function patientFields(body) {
    const fields = {};
    if (body.display_name !== undefined) {
        fields.display_name = limitedText(body.display_name, "display_name", 60);
    }
    if (body.household_size !== undefined) {
        if (!Number.isInteger(body.household_size) || body.household_size < 1 || body.household_size > 20) {
            throw new HttpError(400, "household_size must be a whole number from 1 to 20.");
        }
        fields.household_size = body.household_size;
    }
    if (body.enrollment_status !== undefined) {
        if (!enrollmentStatuses.includes(body.enrollment_status)) {
            throw new HttpError(400, "enrollment_status must be active, pending or expired.");
        }
        fields.enrollment_status = body.enrollment_status;
    }
    return fields;
}

async function supabaseRequest(resource, options = {}) {
    if (!supabaseUrl || !supabaseKey) {
        throw new HttpError(503, "Supabase is not configured. Set its URL and service role key in .env.");
    }

    let response;
    try {
        response = await fetch(`${supabaseUrl}/rest/v1/${resource}`, {
            method: options.method || "GET",
            headers: {
                apikey: supabaseKey,
                ...(!supabaseKey.startsWith("sb_secret_")
                    ? { Authorization: `Bearer ${supabaseKey}` }
                    : {}),
                Accept: "application/json",
                ...(options.body ? { "Content-Type": "application/json" } : {}),
                ...(options.prefer ? { Prefer: options.prefer } : {})
            },
            ...(options.body ? { body: JSON.stringify(options.body) } : {})
        });
    } catch (error) {
        console.error("Supabase connection failed:", error);
        throw new HttpError(502, "Could not connect to Supabase.");
    }

    const text = await response.text();
    let data = null;
    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            data = null;
        }
    }

    if (!response.ok) {
        const status = response.status === 409 ? 409 : 502;
        const message = data && data.message
            ? data.message
            : `Supabase request failed with HTTP ${response.status}.`;
        throw new HttpError(status, message);
    }

    return data;
}

const authService = auth.createAuth({ db: supabaseRequest, HttpError, sessionHours });

function isHttps(req) {
    return Boolean(req.socket.encrypted)
        || String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim() === "https";
}

function sessionToken(req) {
    return auth.parseCookies(req.headers.cookie)[auth.COOKIE_NAME] || null;
}

async function getSession(req) {
    const token = sessionToken(req);
    const account = await authService.authenticate(token);
    return { token, account };
}

// Any signed-in person. Someone who still has a temporary password may only
// change it (the routes that pass allowPasswordChange) until they do.
async function requireAccount(req, { allowPasswordChange = false } = {}) {
    const session = await getSession(req);
    if (!session.account) {
        throw new HttpError(401, "Please sign in.");
    }
    if (session.account.must_change_password && !allowPasswordChange) {
        throw new HttpError(403, "Choose a new password before continuing.");
    }
    return session;
}

async function requireAdmin(req) {
    const session = await requireAccount(req);
    if (session.account.role !== "admin") {
        throw new HttpError(403, "Administrator access is required.");
    }
    return session;
}

async function loadProfile(account) {
    let patient = null;
    if (account.role === "patient" && account.patient_id) {
        const rows = await supabaseRequest(
            `patients?id=eq.${encodeURIComponent(account.patient_id)}&select=${patientSelfColumns}`
        );
        patient = rows && rows[0] ? rows[0] : null;
    }
    return { account, patient };
}

function serveFrontend(req, res, pathname) {
    if (req.method !== "GET") {
        res.writeHead(405, { Allow: "GET" });
        res.end("Method Not Allowed");
        return;
    }

    let decodedPath;
    try {
        decodedPath = decodeURIComponent(pathname === "/" ? "/index.html" : pathname);
    } catch {
        res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Invalid URL path.");
        return;
    }

    const filePath = path.resolve(frontendRoot, `.${decodedPath}`);
    const relativePath = path.relative(frontendRoot, filePath);
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not Found");
        return;
    }

    fs.readFile(filePath, (error, content) => {
        if (error) {
            const status = error.code === "ENOENT" ? 404 : 500;
            if (status === 500) {
                console.error("Unable to load frontend file:", error);
            }
            res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
            res.end(status === 404 ? "Not Found" : "Unable to load frontend.");
            return;
        }

        res.writeHead(200, {
            "Content-Type": contentTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "Referrer-Policy": "same-origin"
        });
        res.end(content);
    });
}

async function handleApi(req, res, url) {
    const { pathname } = url;
    const method = req.method;

    // ---- Public ----------------------------------------------------------
    if (method === "GET" && pathname === "/api/health") {
        const { account } = await getSession(req);
        // Configuration details are for administrators only.
        sendJson(res, 200, account && account.role === "admin"
            ? { status: "running", databaseConfigured: Boolean(supabaseUrl && supabaseKey), geminiConfigured }
            : { status: "running" });
        return;
    }

    // ---- Sign in / out ---------------------------------------------------
    if (method === "POST" && pathname === "/api/auth/login") {
        const body = requireObject(await readJson(req));
        const result = await authService.login(body.username, body.password);
        sendJson(res, 200, await loadProfile(result.account), {
            "Set-Cookie": auth.sessionCookie(result.token, result.maxAgeSeconds, isHttps(req))
        });
        return;
    }

    if (method === "POST" && pathname === "/api/auth/logout") {
        await authService.logout(sessionToken(req));
        sendJson(res, 200, { ok: true }, { "Set-Cookie": auth.clearedSessionCookie(isHttps(req)) });
        return;
    }

    if (method === "GET" && pathname === "/api/auth/me") {
        const { account } = await requireAccount(req, { allowPasswordChange: true });
        sendJson(res, 200, await loadProfile(account));
        return;
    }

    if (method === "POST" && pathname === "/api/auth/change-password") {
        const { account, token } = await requireAccount(req, { allowPasswordChange: true });
        const body = requireObject(await readJson(req));
        await authService.changePassword(account, token, body.current_password, body.new_password);
        sendJson(res, 200, { ok: true });
        return;
    }

    if (method === "PATCH" && pathname === "/api/patient/profile") {
        const { account } = await requireAccount(req);
        if (account.role !== "patient" || !account.patient_id) {
            throw new HttpError(403, "Patient access is required.");
        }
        const body = requireObject(await readJson(req));
        const updates = {};
        if (Object.hasOwn(body, "health_conditions")) {
            updates.health_conditions = enumList(body.health_conditions, "health_conditions", healthConditions);
        }
        if (Object.hasOwn(body, "allergens")) {
            updates.allergens = enumList(body.allergens, "allergens", allergens);
        }
        if (Object.keys(updates).length === 0) {
            throw new HttpError(400, "Provide health_conditions or allergens to update.");
        }
        const rows = await supabaseRequest(
            `patients?id=eq.${encodeURIComponent(account.patient_id)}&select=health_conditions,allergens`,
            { method: "PATCH", body: updates, prefer: "return=representation" }
        );
        if (!rows || rows.length === 0) {
            throw new HttpError(404, "Patient profile not found.");
        }
        sendJson(res, 200, rows[0]);
        return;
    }

    // ---- Patients (administrators only) ---------------------------------
    if (method === "GET" && pathname === "/api/patients") {
        await requireAdmin(req);
        const patients = await supabaseRequest(
            `patients?select=${patientColumns},accounts(username,active,must_change_password,last_login_at)&order=created_at.desc&limit=100`
        );
        sendJson(res, 200, patients);
        return;
    }

    if (method === "POST" && pathname === "/api/patients") {
        await requireAdmin(req);
        const body = requireObject(await readJson(req));
        const id = body.id === undefined ? randomUUID() : body.id;
        if (typeof id !== "string" || !uuidPattern.test(id)) {
            throw new HttpError(400, "Patient ID must be a valid UUID.");
        }
        const patient = await supabaseRequest(`patients?select=${patientColumns}`, {
            method: "POST",
            body: { id, ...patientFields(body) },
            prefer: "return=representation"
        });
        sendJson(res, 201, patient[0]);
        return;
    }

    const patientMatch = pathname.match(/^\/api\/patients\/([0-9a-f-]{36})(\/account|\/reset-password)?$/i);
    if (patientMatch) {
        const patientId = patientMatch[1];
        const action = patientMatch[2];
        if (!uuidPattern.test(patientId)) {
            throw new HttpError(400, "A valid patient ID is required.");
        }

        if (method === "PATCH" && !action) {
            await requireAdmin(req);
            const updates = patientFields(requireObject(await readJson(req)));
            if (Object.keys(updates).length === 0) {
                throw new HttpError(400, "Provide display_name, household_size or enrollment_status to update.");
            }
            const rows = await supabaseRequest(
                `patients?id=eq.${encodeURIComponent(patientId)}&select=${patientColumns}`,
                { method: "PATCH", body: updates, prefer: "return=representation" }
            );
            if (!rows || rows.length === 0) {
                throw new HttpError(404, "Patient not found.");
            }
            sendJson(res, 200, rows[0]);
            return;
        }

        if (method === "POST" && action === "/account") {
            await requireAdmin(req);
            const body = requireObject(await readJson(req));
            const username = optionalText(body.username, "username");
            sendJson(res, 201, await authService.createPatientLogin(patientId, username));
            return;
        }

        if (method === "POST" && action === "/reset-password") {
            await requireAdmin(req);
            sendJson(res, 200, await authService.resetPatientPassword(patientId));
            return;
        }
    }

    // ---- Products and inventory (administrators only) -------------------
    if (method === "GET" && pathname === "/api/products") {
        await requireAdmin(req);
        const products = await supabaseRequest(`products?select=${productColumns}&order=name.asc&limit=500`);
        sendJson(res, 200, products);
        return;
    }

    if (method === "POST" && pathname === "/api/products") {
        await requireAdmin(req);
        const body = requireObject(await readJson(req));
        const name = optionalText(body.name, "name");
        if (!name) {
            throw new HttpError(400, "Product name is required.");
        }
        if (body.allergen_info_verified !== undefined && typeof body.allergen_info_verified !== "boolean") {
            throw new HttpError(400, "allergen_info_verified must be a boolean.");
        }

        const product = await supabaseRequest(`products?select=${productColumns}`, {
            method: "POST",
            body: {
                name,
                sku: optionalText(body.sku, "sku"),
                category: optionalText(body.category, "category"),
                unit: optionalText(body.unit, "unit") || "each",
                calories_per_serving: body.calories_per_serving === undefined
                    ? 0
                    : nonNegativeNumber(body.calories_per_serving, "calories_per_serving"),
                sodium_mg: body.sodium_mg === undefined
                    ? 0
                    : nonNegativeNumber(body.sodium_mg, "sodium_mg"),
                allergens: body.allergens === undefined ? [] : enumList(body.allergens, "allergens", allergens),
                allergen_info_verified: body.allergen_info_verified === true
            },
            prefer: "return=representation"
        });
        sendJson(res, 201, product[0]);
        return;
    }

    const productMatch = pathname.match(/^\/api\/products\/([0-9a-f-]{36})$/i);
    if (method === "PATCH" && productMatch) {
        await requireAdmin(req);
        const productId = productMatch[1];
        if (!uuidPattern.test(productId)) {
            throw new HttpError(400, "A valid product ID is required.");
        }
        const body = requireObject(await readJson(req));
        const updates = {};
        if (Object.hasOwn(body, "allergens")) {
            updates.allergens = enumList(body.allergens, "allergens", allergens);
        }
        if (Object.hasOwn(body, "allergen_info_verified")) {
            if (typeof body.allergen_info_verified !== "boolean") {
                throw new HttpError(400, "allergen_info_verified must be a boolean.");
            }
            updates.allergen_info_verified = body.allergen_info_verified;
        }
        if (Object.keys(updates).length === 0) {
            throw new HttpError(400, "Provide allergens or allergen_info_verified to update.");
        }
        const rows = await supabaseRequest(
            `products?id=eq.${encodeURIComponent(productId)}&select=${productColumns}`,
            { method: "PATCH", body: updates, prefer: "return=representation" }
        );
        if (!rows || rows.length === 0) {
            throw new HttpError(404, "Product not found.");
        }
        sendJson(res, 200, rows[0]);
        return;
    }

    if (method === "GET" && pathname === "/api/inventory") {
        await requireAdmin(req);
        const inventory = await supabaseRequest(
            "inventory?select=id,product_id,quantity,reorder_level,updated_at,products(id,name,sku,category,unit,calories_per_serving,sodium_mg,allergens,allergen_info_verified,active)&order=updated_at.desc&limit=500"
        );
        sendJson(res, 200, inventory);
        return;
    }

    const inventoryMatch = pathname.match(/^\/api\/inventory\/([0-9a-f-]{36})$/i);
    if (method === "PATCH" && inventoryMatch) {
        await requireAdmin(req);
        const productId = inventoryMatch[1];
        if (!uuidPattern.test(productId)) {
            throw new HttpError(400, "A valid product ID is required.");
        }

        const body = requireObject(await readJson(req));
        const updates = {};
        if (Object.hasOwn(body, "quantity")) {
            updates.quantity = nonNegativeNumber(body.quantity, "quantity");
        }
        if (Object.hasOwn(body, "reorder_level")) {
            updates.reorder_level = nonNegativeNumber(body.reorder_level, "reorder_level");
        }
        if (Object.keys(updates).length === 0) {
            throw new HttpError(400, "Provide quantity or reorder_level to update.");
        }

        const inventory = await supabaseRequest(
            `inventory?product_id=eq.${encodeURIComponent(productId)}&select=id,product_id,quantity,reorder_level,updated_at`,
            {
                method: "PATCH",
                body: updates,
                prefer: "return=representation"
            }
        );
        if (!inventory || inventory.length === 0) {
            throw new HttpError(404, "Inventory record not found.");
        }
        sendJson(res, 200, inventory[0]);
        return;
    }

    // ---- Groceries: what is available right now (any signed-in person) --
    // Deliberately exposes no exact quantities, SKUs or reorder levels.
    if (method === "GET" && pathname === "/api/groceries") {
        const { account } = await requireAccount(req);
        let profile = null;
        if (account.role === "patient") {
            if (!account.patient_id) {
                throw new HttpError(403, "Patient profile is not linked to this account.");
            }
            const profiles = await supabaseRequest(
                `patients?id=eq.${encodeURIComponent(account.patient_id)}&select=health_conditions,allergens`
            );
            if (!profiles || !profiles[0]) {
                throw new HttpError(404, "Patient profile not found.");
            }
            profile = profiles[0];
        }
        const rows = await supabaseRequest(
            "inventory?select=product_id,quantity,reorder_level,products(name,category,unit,calories_per_serving,sodium_mg,allergens,allergen_info_verified,active,protein_g,carbs_g,sugar_g,sat_fat_g,potassium_mg,bin_location)&quantity=gt.0&limit=500"
        );
        const groceries = rows
            .filter((row) => row.products && row.products.active)
            .map((row) => ({
                id: row.product_id,
                name: row.products.name,
                category: row.products.category,
                unit: row.products.unit,
                calories_per_serving: row.products.calories_per_serving,
                sodium_mg: row.products.sodium_mg,
                allergens: row.products.allergens || [],
                allergen_info_verified: row.products.allergen_info_verified === true,
                safety: profile ? clinical.evaluate(row.products, profile) : null,
                availability: Number(row.quantity) <= Number(row.reorder_level) ? "limited" : "in_stock"
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
        sendJson(res, 200, groceries);
        return;
    }

    // ---- AI --------------------------------------------------------------
    if (method === "GET" && pathname === "/api/ai/ping") {
        await requireAdmin(req);
        sendJson(res, 200, await ai.ping());
        return;
    }

    if (method === "POST" && pathname === "/api/ai/recipes") {
        const { account } = await requireAccount(req);
        const body = requireObject(await readJson(req));
        try {
            const inventoryRows = await supabaseRequest(
                "inventory?select=product_id,quantity,products(name,category,unit,calories_per_serving,sodium_mg,allergens,allergen_info_verified,active)&limit=500"
            );
            if (account.role === "patient") {
                if (!account.patient_id) {
                    throw new HttpError(403, "Patient profile is not linked to this account.");
                }
                const profile = await supabaseRequest(
                    `patients?id=eq.${encodeURIComponent(account.patient_id)}&select=allergens`
                );
                if (!profile || !profile[0]) {
                    throw new HttpError(404, "Patient profile not found.");
                }
                const selectedAllergens = Array.isArray(profile[0].allergens) ? profile[0].allergens : [];
                const inStock = inventoryRows
                    .filter((row) => row.products && row.products.active !== false && Number(row.quantity) > 0);
                if (inStock.length === 0) {
                    sendJson(res, 200, {
                        source: "none",
                        recipes: [],
                        excluded_count: 0,
                        eligible_products_count: 0,
                        excluded_products_count: 0,
                        reason: "no_stock"
                    });
                    return;
                }
                const isProductAllowed = (product) => {
                    if (!product || product.active === false) return false;
                    if (selectedAllergens.length && product.allergen_info_verified !== true) return false;
                    const productAllergens = Array.isArray(product.allergens) ? product.allergens : [];
                    return !productAllergens.some((allergen) => selectedAllergens.includes(allergen));
                };
                const eligibleInStock = inStock.filter((row) => isProductAllowed(row.products));
                if (eligibleInStock.length < 2) {
                    sendJson(res, 200, {
                        source: "none",
                        recipes: [],
                        excluded_count: 0,
                        eligible_products_count: eligibleInStock.length,
                        excluded_products_count: inStock.length - eligibleInStock.length,
                        reason: "insufficient_eligible_inventory"
                    });
                    return;
                }
                const available = eligibleInStock.slice(0, 30);
                const byId = new Map(inventoryRows.map((row) => [row.product_id, row]));
                const result = await ai.handleRecipeRequest(
                    { cart_ids: available.map((row) => row.product_id) },
                    async () => inventoryRows,
                    (item) => isProductAllowed(byId.get(item.id)?.products)
                );
                const terms = selectedAllergens.flatMap((allergen) => allergenTerms[allergen] || []);
                const safeRecipes = result.recipes.filter((recipe) => {
                    if (recipe.uses_cart_ids.length < 2) return false;
                    const ids = [...recipe.uses_cart_ids, ...recipe.missing_ids];
                    if (ids.some((id) => !isProductAllowed(byId.get(id)?.products))) return false;
                    const text = `${recipe.title} ${recipe.why_it_fits} ${recipe.steps.join(" ")}`.toLowerCase();
                    return !terms.some((term) => text.includes(term));
                }).slice(0, 5);
                const safeItems = available.map((row) => ({
                    id: row.product_id,
                    name: row.products.name,
                    category: row.products.category || "Other",
                    calories: Number(row.products.calories_per_serving || 0),
                    sodium_mg: Number(row.products.sodium_mg || 0)
                }));
                const fallbackRecipes = safeItems.length >= 2
                    ? ai.fallbackRecipes({ cart: safeItems, candidates: [] }).map((recipe) => ({
                    ...recipe,
                    uses: recipe.uses_cart_ids.map((id) => {
                        const item = safeItems.find((candidate) => candidate.id === id);
                        return { id, name: item.name, category: item.category };
                    }),
                    missing: [],
                    source: "fallback"
                }))
                    : [];
                const recipes = [
                    ...safeRecipes.map((recipe) => ({ ...recipe, source: result.source })),
                    ...fallbackRecipes
                ].slice(0, 5);
                sendJson(res, 200, {
                    ...result,
                    recipes,
                    excluded_count: result.recipes.length - safeRecipes.length,
                    eligible_products_count: eligibleInStock.length,
                    excluded_products_count: inStock.length - eligibleInStock.length,
                    profile_fields_sent_to_model: false
                });
                return;
            }
            sendJson(res, 200, await ai.handleRecipeRequest(body, async () => inventoryRows));
        } catch (error) {
            throw error instanceof ai.AiError ? new HttpError(error.status, error.message) : error;
        }
        return;
    }

    sendJson(res, 404, { error: "API route not found." });
}

const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    const handleRequest = url.pathname.startsWith("/api/")
        ? handleApi(req, res, url)
        : serveFrontend(req, res, url.pathname);

    Promise.resolve(handleRequest).catch((error) => {
        const status = error instanceof HttpError ? error.status : 500;
        if (!(error instanceof HttpError)) {
            console.error("Request failed:", error);
        }
        sendJson(res, status, { error: error instanceof HttpError ? error.message : "Internal server error." });
    });
});

server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    authService
        .ensureBootstrapAdmin({
            username: process.env.BOOTSTRAP_ADMIN_USERNAME,
            password: process.env.BOOTSTRAP_ADMIN_PASSWORD
        })
        .then((result) => {
            if (result.created) {
                console.log(
                    `Created the first administrator "${process.env.BOOTSTRAP_ADMIN_USERNAME}". ` +
                    "Sign in, choose a new password, then remove BOOTSTRAP_ADMIN_PASSWORD from .env."
                );
            }
        })
        .catch((error) => {
            console.error("Could not create the first administrator:", error.message);
        });
});
