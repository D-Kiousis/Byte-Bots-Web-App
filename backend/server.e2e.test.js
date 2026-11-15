"use strict";

// Run with: node --test backend/server.e2e.test.js
// Starts the real server.js on a free port, pointed at an in-memory fake of
// Supabase. No network, no keys, and your real database is never touched.

const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const net = require("node:net");
const path = require("node:path");
const { startFakeSupabase } = require("./test-support/fake-postgrest");

const ADMIN_PASSWORD = "Start-pass-1";
const ADMIN_NEW_PASSWORD = "Admin-new-pass-2";
const PATIENT_NEW_PASSWORD = "Patient-new-pass-3";

let fake;
let child;
let base;
let output = "";
const state = {};

function freePort() {
    return new Promise((resolve, reject) => {
        const probe = net.createServer();
        probe.on("error", reject);
        probe.listen(0, "127.0.0.1", () => {
            const { port } = probe.address();
            probe.close(() => resolve(port));
        });
    });
}

async function api(method, route, { body, cookie, headers = {} } = {}) {
    const response = await fetch(base + route, {
        method,
        redirect: "manual",
        headers: {
            ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
            ...(cookie ? { Cookie: cookie } : {}),
            ...headers
        },
        body: body !== undefined ? JSON.stringify(body) : undefined
    });
    const text = await response.text();
    let data = null;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = null;
    }
    return { status: response.status, data, text, setCookie: response.headers.getSetCookie() };
}

function cookieFrom(result) {
    const raw = result.setCookie.find((value) => value.startsWith("mtg_session="));
    return raw ? raw.split(";")[0] : null;
}

async function signIn(username, password) {
    const result = await api("POST", "/api/auth/login", { body: { username, password } });
    return { result, cookie: cookieFrom(result) };
}

test.before(async () => {
    fake = await startFakeSupabase();
    const port = await freePort();
    base = `http://127.0.0.1:${port}`;
    child = spawn(process.execPath, [path.join(__dirname, "server.js")], {
        env: {
            ...process.env,
            PORT: String(port),
            SUPABASE_URL: fake.url,
            SUPABASE_SECRET_KEY: "sb_secret_test",
            BOOTSTRAP_ADMIN_USERNAME: "admin",
            BOOTSTRAP_ADMIN_PASSWORD: ADMIN_PASSWORD,
            AI_PROVIDER: "off",
            SESSION_HOURS: "1"
        }
    });
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });

    const deadline = Date.now() + 10000;
    while (!output.includes("Created the first administrator")) {
        if (Date.now() > deadline) {
            throw new Error(`Server did not start. Output so far:\n${output}`);
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
    }
});

test.after(async () => {
    if (child) child.kill();
    if (fake) await fake.close();
});

test("signed-out visitors can reach nothing except sign-in and a bare health check", async () => {
    for (const route of ["/api/patients", "/api/products", "/api/inventory", "/api/groceries", "/api/auth/me", "/api/ai/ping"]) {
        assert.equal((await api("GET", route)).status, 401, `GET ${route}`);
    }
    assert.equal((await api("POST", "/api/patients", { body: {} })).status, 401);
    assert.equal((await api("POST", "/api/products", { body: { name: "x" } })).status, 401);
    assert.equal((await api("PATCH", `/api/inventory/${"0".repeat(8)}-0000-4000-8000-${"0".repeat(12)}`, { body: { quantity: 1 } })).status, 401);
    const health = await api("GET", "/api/health");
    assert.equal(health.status, 200);
    assert.deepEqual(health.data, { status: "running" });
});

test("sign-in needs JSON and rejects wrong credentials without a cookie", async () => {
    const plain = await fetch(`${base}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ username: "admin", password: ADMIN_PASSWORD })
    });
    assert.equal(plain.status, 415);

    const wrong = await signIn("admin", "not-the-password");
    assert.equal(wrong.result.status, 401);
    assert.equal(wrong.cookie, null);
});

test("the administrator must replace the bootstrap password before doing anything", async () => {
    const { result, cookie } = await signIn("admin", ADMIN_PASSWORD);
    assert.equal(result.status, 200);
    assert.ok(cookie, "a session cookie is set");
    const header = result.setCookie.find((value) => value.startsWith("mtg_session="));
    assert.match(header, /HttpOnly/);
    assert.match(header, /SameSite=Lax/);
    assert.equal(result.data.account.role, "admin");
    assert.equal(result.data.account.must_change_password, true);
    assert.equal(JSON.stringify(result.data).includes("password_hash"), false);

    assert.equal((await api("GET", "/api/patients", { cookie })).status, 403);
    assert.equal((await api("POST", "/api/auth/change-password", { cookie, body: { current_password: "wrong-wrong-1", new_password: ADMIN_NEW_PASSWORD } })).status, 403);
    assert.equal((await api("POST", "/api/auth/change-password", { cookie, body: { current_password: ADMIN_PASSWORD, new_password: ADMIN_NEW_PASSWORD } })).status, 200);

    state.admin = (await signIn("admin", ADMIN_NEW_PASSWORD)).cookie;
    assert.ok(state.admin);
    assert.equal((await api("GET", "/api/patients", { cookie: state.admin })).status, 200);
    const health = await api("GET", "/api/health", { cookie: state.admin });
    assert.equal(health.data.databaseConfigured, true);
});

test("an administrator can add products and set stock", async () => {
    const make = async (body) => (await api("POST", "/api/products", { cookie: state.admin, body })).data;
    state.rice = await make({ name: "Brown rice", category: "Grains", unit: "bag", calories_per_serving: 160, sodium_mg: 5 });
    state.spinach = await make({ name: "Spinach", category: "Produce", unit: "bunch", calories_per_serving: 7, sodium_mg: 24 });
    state.soup = await make({ name: "Canned soup", category: "Pantry", sku: "S-1", sodium_mg: 890 });
    assert.ok(state.rice.id && state.spinach.id && state.soup.id);

    const stock = (product, quantity, reorder) =>
        api("PATCH", `/api/inventory/${product.id}`, { cookie: state.admin, body: { quantity, reorder_level: reorder } });
    assert.equal((await stock(state.rice, 20, 5)).status, 200);
    assert.equal((await stock(state.spinach, 3, 5)).status, 200);
    assert.equal((await stock(state.soup, 0, 5)).status, 200);
});

test("an administrator can create patients with logins; password hashes never leave the server", async () => {
    const first = await api("POST", "/api/patients", { cookie: state.admin, body: { display_name: "Sam", household_size: 3 } });
    assert.equal(first.status, 201);
    state.patient = first.data;
    const second = await api("POST", "/api/patients", { cookie: state.admin, body: { display_name: "Robin" } });
    state.otherPatient = second.data;

    const login = await api("POST", `/api/patients/${state.patient.id}/account`, { cookie: state.admin, body: {} });
    assert.equal(login.status, 201);
    state.patientUser = login.data.username;
    state.patientTemp = login.data.temporary_password;
    const otherLogin = await api("POST", `/api/patients/${state.otherPatient.id}/account`, { cookie: state.admin, body: {} });
    state.otherUser = otherLogin.data.username;

    assert.equal((await api("POST", `/api/patients/${state.patient.id}/account`, { cookie: state.admin, body: {} })).status, 409);

    const list = await api("GET", "/api/patients", { cookie: state.admin });
    assert.equal(list.data.length, 2);
    assert.ok(list.data.some((patient) => patient.accounts && patient.accounts.username === state.patientUser));
    assert.equal(list.text.includes("password_hash"), false);
    assert.equal(list.text.includes(state.patientTemp), false);

    assert.equal((await api("PATCH", `/api/patients/${state.patient.id}`, { cookie: state.admin, body: { household_size: 4 } })).status, 200);
    assert.equal((await api("PATCH", `/api/patients/${state.patient.id}`, { cookie: state.admin, body: { enrollment_status: "bogus" } })).status, 400);
    assert.equal((await api("PATCH", `/api/patients/${state.patient.id}`, { cookie: state.admin, body: {} })).status, 400);

    assert.ok(fake.tables().accounts.every((account) => account.password_hash.startsWith("scrypt$")), "no plaintext passwords stored");
});

test("a patient must choose a new password, then sees only their own information", async () => {
    const { result, cookie } = await signIn(state.patientUser, state.patientTemp);
    assert.equal(result.status, 200);
    assert.equal(result.data.account.role, "patient");
    assert.equal(result.data.account.must_change_password, true);

    assert.equal((await api("GET", "/api/groceries", { cookie })).status, 403, "blocked until the password is changed");
    assert.equal((await api("POST", "/api/auth/change-password", { cookie, body: { current_password: state.patientTemp, new_password: PATIENT_NEW_PASSWORD } })).status, 200);
    state.patientCookie = cookie;

    const me = await api("GET", "/api/auth/me", { cookie });
    assert.equal(me.status, 200);
    assert.equal(me.data.patient.id, state.patient.id);
    assert.equal(me.data.patient.display_name, "Sam");
    assert.equal(me.data.patient.household_size, 4);
    assert.equal(me.text.includes(state.otherPatient.id), false, "no other patient's data");
    assert.equal(me.text.includes("password_hash"), false);
});

test("a patient is refused on every administrator route", async () => {
    const cookie = state.patientCookie;
    const inventoryPath = `/api/inventory/${state.rice.id}`;
    const attempts = [
        ["GET", "/api/patients"],
        ["POST", "/api/patients", {}],
        ["PATCH", `/api/patients/${state.patient.id}`, { household_size: 9 }],
        ["POST", `/api/patients/${state.patient.id}/account`, {}],
        ["POST", `/api/patients/${state.otherPatient.id}/reset-password`, {}],
        ["GET", "/api/products"],
        ["POST", "/api/products", { name: "Sneaky item" }],
        ["GET", "/api/inventory"],
        ["PATCH", inventoryPath, { quantity: 999 }],
        ["GET", "/api/ai/ping"]
    ];
    for (const [method, route, body] of attempts) {
        const result = await api(method, route, { cookie, body });
        assert.equal(result.status, 403, `${method} ${route}`);
    }
    assert.equal(fake.tables().products.some((product) => product.name === "Sneaky item"), false);
    assert.equal(fake.tables().inventory.find((row) => row.product_id === state.rice.id).quantity, 20);
    assert.deepEqual((await api("GET", "/api/health", { cookie })).data, { status: "running" });
});

test("the grocery list shows only what is available, with no stock details", async () => {
    const cookie = state.patientCookie;
    const groceries = await api("GET", "/api/groceries", { cookie });
    assert.equal(groceries.status, 200);
    assert.deepEqual(groceries.data.map((item) => item.name), ["Brown rice", "Spinach"], "out-of-stock soup is hidden");
    const byName = Object.fromEntries(groceries.data.map((item) => [item.name, item]));
    assert.equal(byName["Brown rice"].availability, "in_stock");
    assert.equal(byName.Spinach.availability, "limited");
    for (const item of groceries.data) {
        for (const hidden of ["quantity", "reorder_level", "sku", "products"]) {
            assert.equal(hidden in item, false, `${hidden} must not be exposed`);
        }
    }

    const spinach = fake.tables().products.find((product) => product.id === state.spinach.id);
    spinach.active = false;
    const withoutSpinach = await api("GET", "/api/groceries", { cookie });
    assert.deepEqual(withoutSpinach.data.map((item) => item.name), ["Brown rice"], "inactive products are hidden");
    spinach.active = true;
});

test("patients can ask for recipe ideas, signed-out visitors cannot", async () => {
    const asPatient = await api("POST", "/api/ai/recipes", { cookie: state.patientCookie, body: { cart_ids: [] } });
    assert.equal(asPatient.status, 400);
    const signedOut = await api("POST", "/api/ai/recipes", { body: { cart_ids: [] } });
    assert.equal(signedOut.status, 401);
});

test("an administrator reset signs the patient out and forces a new password", async () => {
    const reset = await api("POST", `/api/patients/${state.patient.id}/reset-password`, { cookie: state.admin, body: {} });
    assert.equal(reset.status, 200);
    assert.equal((await api("GET", "/api/auth/me", { cookie: state.patientCookie })).status, 401, "old session is dead");
    assert.equal((await signIn(state.patientUser, PATIENT_NEW_PASSWORD)).result.status, 401, "old password is dead");
    const again = await signIn(state.patientUser, reset.data.temporary_password);
    assert.equal(again.result.status, 200);
    assert.equal(again.result.data.account.must_change_password, true);
    state.patientCookie = again.cookie;
});

test("signing out ends the session and clears the cookie", async () => {
    const out = await api("POST", "/api/auth/logout", { cookie: state.patientCookie });
    assert.equal(out.status, 200);
    assert.match(out.setCookie.find((value) => value.startsWith("mtg_session=")), /Max-Age=0/);
    assert.equal((await api("GET", "/api/auth/me", { cookie: state.patientCookie })).status, 401);
});

test("five wrong passwords lock an account for a while", async () => {
    for (let i = 0; i < 5; i += 1) {
        assert.equal((await signIn(state.otherUser, "definitely-wrong-1")).result.status, 401);
    }
    const locked = await signIn(state.otherUser, "definitely-wrong-1");
    assert.equal(locked.result.status, 429);
});
