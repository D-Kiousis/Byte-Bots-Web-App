const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
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
const maxBodySize = 64 * 1024;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
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

function sendJson(res, status, data) {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(data));
}

function readJson(req) {
    return new Promise((resolve, reject) => {
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

function nonNegativeNumber(value, fieldName) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        throw new HttpError(400, `${fieldName} must be a non-negative number.`);
    }
    return value;
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
            "Content-Type": contentTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream"
        });
        res.end(content);
    });
}

async function handleApi(req, res, url) {
    if (req.method === "GET" && url.pathname === "/api/health") {
        sendJson(res, 200, {
            status: "running",
            databaseConfigured: Boolean(supabaseUrl && supabaseKey),
            geminiConfigured
        });
        return;
    }

    if (req.method === "GET" && url.pathname === "/api/patients") {
        const patients = await supabaseRequest(
            "patients?select=id,created_at&order=created_at.desc&limit=100"
        );
        sendJson(res, 200, patients);
        return;
    }

    if (req.method === "POST" && url.pathname === "/api/patients") {
        const body = requireObject(await readJson(req));
        const id = body.id === undefined ? randomUUID() : body.id;
        if (typeof id !== "string" || !uuidPattern.test(id)) {
            throw new HttpError(400, "Patient ID must be a valid UUID.");
        }
        const patient = await supabaseRequest("patients?select=id,created_at", {
            method: "POST",
            body: { id },
            prefer: "return=representation"
        });
        sendJson(res, 201, patient[0]);
        return;
    }

    if (req.method === "GET" && url.pathname === "/api/products") {
        const products = await supabaseRequest(
            "products?select=id,name,sku,category,unit,calories_per_serving,sodium_mg,active,created_at&order=name.asc&limit=500"
        );
        sendJson(res, 200, products);
        return;
    }

    if (req.method === "POST" && url.pathname === "/api/products") {
        const body = requireObject(await readJson(req));
        const name = optionalText(body.name, "name");
        if (!name) {
            throw new HttpError(400, "Product name is required.");
        }

        const product = await supabaseRequest(
            "products?select=id,name,sku,category,unit,calories_per_serving,sodium_mg,active,created_at",
            {
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
                        : nonNegativeNumber(body.sodium_mg, "sodium_mg")
                },
                prefer: "return=representation"
            }
        );
        sendJson(res, 201, product[0]);
        return;
    }

    if (req.method === "GET" && url.pathname === "/api/inventory") {
        const inventory = await supabaseRequest(
            "inventory?select=id,product_id,quantity,reorder_level,updated_at,products(id,name,sku,category,unit,calories_per_serving,sodium_mg,active)&order=updated_at.desc&limit=500"
        );
        sendJson(res, 200, inventory);
        return;
    }

    const inventoryMatch = url.pathname.match(/^\/api\/inventory\/([0-9a-f-]{36})$/i);
    if (req.method === "PATCH" && inventoryMatch) {
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
        sendJson(res, status, { error: error.message || "Internal server error." });
    });
});

server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
