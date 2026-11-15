"use strict";

/*
 * A tiny in-memory stand-in for Supabase's REST API (PostgREST), for tests only.
 * It supports the filters, embeds, defaults and unique checks this app uses.
 *
 *   createFakeDb()      -> { request, handle, tables }   (request mimics supabaseRequest)
 *   startFakeSupabase() -> HTTP server speaking the same protocol
 */

const http = require("node:http");
const { randomUUID } = require("node:crypto");

const EMBEDS = {
    inventory: { products: { table: "products", local: "product_id", foreign: "id" } },
    sessions: { accounts: { table: "accounts", local: "account_id", foreign: "id" } },
    patients: { accounts: { table: "accounts", local: "id", foreign: "patient_id" } }
};

const UNIQUE = {
    accounts: ["username", "patient_id"],
    products: ["sku"],
    sessions: ["token_hash"],
    patients: ["id"]
};

function splitTopLevel(select) {
    const parts = [];
    let depth = 0;
    let current = "";
    for (const char of select) {
        if (char === "(") depth += 1;
        if (char === ")") depth -= 1;
        if (char === "," && depth === 0) {
            parts.push(current.trim());
            current = "";
        } else {
            current += char;
        }
    }
    if (current.trim()) parts.push(current.trim());
    return parts;
}

function createFakeDb() {
    const tables = { patients: [], products: [], inventory: [], accounts: [], sessions: [] };

    function project(table, row, select) {
        const out = {};
        for (const part of splitTopLevel(select || "*")) {
            const embed = part.match(/^([a-z_]+)\(([\s\S]*)\)$/);
            if (embed) {
                const def = (EMBEDS[table] || {})[embed[1]];
                if (!def) continue;
                const related = tables[def.table].find((candidate) => candidate[def.foreign] === row[def.local]);
                out[embed[1]] = related ? project(def.table, related, embed[2]) : null;
            } else if (part === "*") {
                Object.assign(out, row);
            } else {
                out[part] = row[part];
            }
        }
        return out;
    }

    function matches(row, key, expression) {
        const dot = expression.indexOf(".");
        const op = expression.slice(0, dot);
        const raw = expression.slice(dot + 1);
        const value = row[key];
        const compare = typeof value === "number" ? Number(raw) : raw;
        if (op === "eq") return String(value) === raw;
        if (op === "neq") return String(value) !== raw;
        if (op === "gt") return value !== null && value > compare;
        if (op === "lt") return value !== null && value < compare;
        throw new Error(`fake-postgrest: unsupported filter ${expression}`);
    }

    function filtered(table, params) {
        const ignored = new Set(["select", "order", "limit"]);
        return tables[table].filter((row) => {
            for (const [key, expression] of params.entries()) {
                if (ignored.has(key)) continue;
                if (!matches(row, key, expression)) return false;
            }
            return true;
        });
    }

    function withDefaults(table, input) {
        const now = new Date().toISOString();
        const base = { id: randomUUID(), created_at: now };
        const defaults = {
            patients: { display_name: null, household_size: 1, enrollment_status: "active" },
            products: { sku: null, category: null, unit: "each", calories_per_serving: 0, sodium_mg: 0, active: true },
            inventory: { quantity: 0, reorder_level: 0, updated_at: now },
            accounts: {
                patient_id: null, must_change_password: false, active: true,
                failed_logins: 0, locked_until: null, last_login_at: null
            },
            sessions: {}
        }[table];
        const row = { ...base, ...defaults, ...input };
        if (table === "sessions") delete row.id;
        return row;
    }

    function handle(method, resource, body, prefer = "") {
        const [table, query = ""] = resource.split("?");
        if (!tables[table]) {
            return { status: 404, body: { message: `relation "${table}" does not exist` } };
        }
        const params = new URLSearchParams(query);
        const select = params.get("select");
        const wantsRows = prefer.includes("return=representation");

        if (method === "GET") {
            let rows = filtered(table, params);
            const order = params.get("order");
            if (order) {
                const [column, direction] = order.split(".");
                rows = [...rows].sort((a, b) => (a[column] > b[column] ? 1 : a[column] < b[column] ? -1 : 0));
                if (direction === "desc") rows.reverse();
            }
            if (params.get("limit")) rows = rows.slice(0, Number(params.get("limit")));
            return { status: 200, body: rows.map((row) => project(table, row, select)) };
        }

        if (method === "POST") {
            const created = [];
            for (const input of Array.isArray(body) ? body : [body]) {
                const row = withDefaults(table, input);
                for (const column of UNIQUE[table] || []) {
                    if (row[column] !== null && row[column] !== undefined
                        && tables[table].some((existing) => existing[column] === row[column])) {
                        return { status: 409, body: { message: `duplicate key value violates unique constraint on ${column}` } };
                    }
                }
                tables[table].push(row);
                created.push(row);
                if (table === "products") {
                    tables.inventory.push(withDefaults("inventory", { product_id: row.id }));
                }
            }
            return wantsRows
                ? { status: 201, body: created.map((row) => project(table, row, select)) }
                : { status: 201, body: null };
        }

        if (method === "PATCH") {
            const rows = filtered(table, params);
            for (const row of rows) {
                Object.assign(row, body);
                if (table === "inventory") row.updated_at = new Date().toISOString();
            }
            return wantsRows
                ? { status: 200, body: rows.map((row) => project(table, row, select)) }
                : { status: 204, body: null };
        }

        if (method === "DELETE") {
            const doomed = new Set(filtered(table, params));
            tables[table] = tables[table].filter((row) => !doomed.has(row));
            return { status: 204, body: null };
        }

        return { status: 405, body: { message: "method not allowed" } };
    }

    // Same call shape as the server's supabaseRequest(resource, options).
    async function request(resource, options = {}) {
        const result = handle(options.method || "GET", resource, options.body, options.prefer || "");
        if (result.status >= 400) {
            const error = new Error(result.body.message);
            error.status = result.status;
            throw error;
        }
        return result.body;
    }

    return {
        request,
        handle,
        get tables() {
            return tables;
        }
    };
}

async function startFakeSupabase() {
    const fake = createFakeDb();
    const server = http.createServer((req, res) => {
        const chunks = [];
        req.on("data", (chunk) => chunks.push(chunk));
        req.on("end", () => {
            const resource = req.url.replace(/^\/rest\/v1\//, "");
            const raw = Buffer.concat(chunks).toString("utf8");
            const result = fake.handle(req.method, resource, raw ? JSON.parse(raw) : undefined, String(req.headers.prefer || ""));
            if (result.body === null) {
                res.writeHead(result.status);
                res.end();
                return;
            }
            res.writeHead(result.status, { "Content-Type": "application/json" });
            res.end(JSON.stringify(result.body));
        });
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    return {
        url: `http://127.0.0.1:${server.address().port}`,
        tables: () => fake.tables,
        close: () => new Promise((resolve) => server.close(resolve))
    };
}

module.exports = { createFakeDb, startFakeSupabase };
