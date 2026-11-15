"use strict";

// Run with: node --test tests/ui-roles.test.js
//
// Renders the real frontend/src/App.js without a browser, using a tiny
// stand-in for React (state, effects, function components). It checks what each
// kind of person can see and which API calls their screens make.
// It does not test styling, and the server enforces permissions separately
// (see backend/server.e2e.test.js).

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const appSource = fs.readFileSync(path.join(__dirname, "..", "frontend", "src", "App.js"), "utf8");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function createMiniReact() {
    const slots = [];
    const pending = [];
    let hookIndex = 0;
    let dirty = false;
    let rootElement = null;
    let tree = [];

    const Fragment = Symbol("fragment");
    const React = {
        Fragment,
        createElement(type, props, ...children) {
            return { type, props: props || {}, children: children.flat(Infinity) };
        },
        useState(initial) {
            const index = hookIndex++;
            if (!slots[index]) slots[index] = { value: typeof initial === "function" ? initial() : initial };
            const slot = slots[index];
            return [slot.value, (next) => {
                const value = typeof next === "function" ? next(slot.value) : next;
                if (!Object.is(value, slot.value)) {
                    slot.value = value;
                    dirty = true;
                }
            }];
        },
        useMemo(factory) {
            hookIndex += 1;
            return factory();
        },
        useEffect(effect) {
            const index = hookIndex++;
            if (!slots[index]) {
                slots[index] = { ran: true };
                pending.push(effect);
            }
        }
    };
    const ReactDOM = { createRoot: () => ({ render: (element) => { rootElement = element; } }) };

    function expandInto(node, out) {
        if (node === null || node === undefined || typeof node === "boolean") return;
        if (typeof node === "string" || typeof node === "number") {
            out.push(String(node));
            return;
        }
        if (Array.isArray(node)) {
            node.forEach((child) => expandInto(child, out));
            return;
        }
        if (node.type === Fragment) {
            node.children.forEach((child) => expandInto(child, out));
            return;
        }
        if (typeof node.type === "function") {
            expandInto(node.type({ ...node.props, children: node.children }), out);
            return;
        }
        const children = [];
        node.children.forEach((child) => expandInto(child, children));
        out.push({ tag: node.type, props: node.props, children });
    }

    function render() {
        hookIndex = 0;
        const out = [];
        expandInto(rootElement, out);
        tree = out;
    }

    async function settle() {
        let quiet = 0;
        for (let i = 0; i < 60 && quiet < 4; i += 1) {
            const effects = pending.splice(0);
            effects.forEach((effect) => effect());
            await sleep(3);
            if (dirty) {
                dirty = false;
                render();
                quiet = 0;
            } else {
                quiet += 1;
            }
        }
    }

    const textOf = (nodes) => [].concat(nodes).map((node) => (typeof node === "string" ? node : textOf(node.children))).join(" ");
    function findAll(nodes, predicate, found = []) {
        for (const node of [].concat(nodes)) {
            if (typeof node === "string") continue;
            if (predicate(node)) found.push(node);
            findAll(node.children, predicate, found);
        }
        return found;
    }

    return {
        React,
        ReactDOM,
        async start() {
            render();
            await settle();
        },
        text: () => textOf(tree).replace(/\s+/g, " "),
        buttons: (label) => findAll(tree, (node) => node.tag === "button" && node.props.onClick
            && textOf(node).replace(/\s+/g, " ").trim().startsWith(label)),
        byAria: (label) => findAll(tree, (node) => node.props["aria-label"] === label && node.props.onClick),
        async click(node) {
            assert.ok(node, "expected a button to click");
            node.props.onClick({});
            await settle();
        },
        async clickButton(label) {
            const [button] = this.buttons(label);
            assert.ok(button, `no button labelled "${label}"; page shows: ${this.text()}`);
            await this.click(button);
        }
    };
}

function mockFetch(routes) {
    const calls = [];
    const fetchMock = async (url, options = {}) => {
        const method = (options.method || "GET").toUpperCase();
        calls.push(`${method} ${url}`);
        const route = routes[`${method} ${url}`];
        const reply = typeof route === "function" ? route() : route || { status: 404, body: { error: "not found" } };
        return { ok: reply.status < 400, status: reply.status, json: async () => reply.body };
    };
    fetchMock.calls = calls;
    return fetchMock;
}

async function openApp(routes) {
    const ui = createMiniReact();
    const fetchMock = mockFetch(routes);
    Object.assign(globalThis, {
        React: ui.React,
        ReactDOM: ui.ReactDOM,
        fetch: fetchMock,
        window: { crypto: require("node:crypto").webcrypto, setTimeout, confirm: () => true },
        document: { getElementById: () => ({}) }
    });
    vm.runInThisContext(appSource);
    await ui.start();
    return { ui, calls: fetchMock.calls };
}

const PATIENT_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";
const ok = (body) => ({ status: 200, body });

const adminRoutes = {
    "GET /api/auth/me": ok({ account: { id: "a1", username: "admin", role: "admin", patient_id: null, must_change_password: false }, patient: null }),
    "GET /api/health": ok({ status: "running", databaseConfigured: true, geminiConfigured: false }),
    "GET /api/patients": ok([
        { id: PATIENT_ID, created_at: "2026-11-14T10:00:00Z", display_name: "Sam", household_size: 3, enrollment_status: "active",
          accounts: { username: "pt-abc234", active: true, must_change_password: true, last_login_at: null } },
        { id: OTHER_ID, created_at: "2026-11-14T11:00:00Z", display_name: null, household_size: 1, enrollment_status: "pending", accounts: null }
    ]),
    "GET /api/inventory": ok([
        { id: "i1", product_id: "p1", quantity: "20.00", reorder_level: "5.00", updated_at: "2026-11-14T12:00:00Z",
          products: { name: "Brown rice", category: "Grains", unit: "bag", calories_per_serving: "160", sodium_mg: "5", active: true } }
    ])
};

const patientRoutes = {
    "GET /api/auth/me": ok({
        account: { id: "a2", username: "pt-abc234", role: "patient", patient_id: PATIENT_ID, must_change_password: false },
        patient: { id: PATIENT_ID, created_at: "2026-11-14T10:00:00Z", display_name: "Sam", household_size: 3, enrollment_status: "active" }
    }),
    "GET /api/groceries": ok([
        { id: "p1", name: "Brown rice", category: "Grains", unit: "bag", calories_per_serving: 160, sodium_mg: 5, safety: { status: "restricted", label: "Restricted" }, availability: "in_stock" },
        { id: "p2", name: "Spinach", category: "Produce", unit: "bunch", calories_per_serving: 7, sodium_mg: 24, availability: "limited" }
    ]),
    "POST /api/ai/recipes": ok({
        source: "gemini",
        excluded_count: 0,
        recipes: [{
            source: "gemini",
            title: "Brown rice bowl",
            servings: 2,
            uses: [{ id: "p1", name: "Brown rice", category: "Grains" }],
            missing: [],
            steps: ["Cook the rice.", "Serve warm."],
            why_it_fits: "A general idea built from available groceries."
        }]
    })
};

test("an administrator sees patients and products, and can add products", async () => {
    const { ui, calls } = await openApp(adminRoutes);
    const home = ui.text();
    for (const label of ["Dashboard", "Patients", "Grocery inventory", "Settings", "Sign out", "Administrator"]) {
        assert.ok(home.includes(label), `admin should see "${label}"`);
    }
    assert.ok(!home.includes("My profile"), "admin has no patient profile page");
    assert.ok(calls.includes("GET /api/patients") && calls.includes("GET /api/inventory"));

    await ui.clickButton("Patients");
    const patients = ui.text();
    assert.ok(patients.includes("Sam") && patients.includes("pt-abc234"));
    assert.ok(patients.includes("Temporary password") && patients.includes("No login"));

    await ui.click(ui.byAria("Open Sam record")[0]);
    assert.ok(ui.text().includes("Reset password"), "admin can manage the patient's login");

    await ui.clickButton("Grocery inventory");
    assert.ok(ui.text().includes("Add product"), "admin can add products");
    assert.ok(ui.text().includes("QTY AVAILABLE"), "admin can edit stock");
});

test("a patient sees only their own page and the available groceries", async () => {
    const { ui, calls } = await openApp(patientRoutes);
    const home = ui.text();
    for (const label of ["My profile", "Groceries", "Hi, Sam", "Household size", "Sign out", "Patient"]) {
        assert.ok(home.includes(label), `patient should see "${label}"`);
    }
    for (const label of ["Dashboard", "Grocery inventory", "Settings", "Orders", "Add patient"]) {
        assert.ok(!home.includes(label), `patient must not see "${label}"`);
    }
    assert.equal(ui.buttons("Patients").length, 0, "no Patients menu item");
    assert.ok(home.includes(PATIENT_ID), "their own ID is shown");
    assert.ok(!home.includes(OTHER_ID), "nobody else's ID is shown");
    assert.ok(home.includes("Health and allergy profile") && home.includes("Chronic kidney disease"));
    assert.ok(home.includes("Peanuts") && home.includes("not sent to Gemini"));

    await ui.clickButton("Groceries");
    const groceries = ui.text();
    assert.ok(groceries.includes("Brown rice") && groceries.includes("Spinach"));
    assert.ok(groceries.includes("Restricted"), "patient grocery cards show clinical safety labels");
    assert.ok(groceries.includes("Limited") && groceries.includes("Add to cart"));
    assert.ok(!groceries.includes("Add product"), "patients cannot add products");
    assert.ok(!groceries.includes("QTY AVAILABLE"), "patients cannot see or edit stock");

    await ui.clickButton("Recipe recommendations");
    assert.ok(ui.text().includes("Generate AI recommendations"));
    await ui.clickButton("Generate AI recommendations");
    assert.ok(ui.text().includes("Brown rice bowl"), "generated recipes appear on the patient screen");
    assert.ok(calls.includes("POST /api/ai/recipes"), "the patient screen calls the server recipe route");

    for (const forbidden of ["/api/patients", "/api/inventory", "/api/health", "/api/products"]) {
        assert.ok(!calls.some((call) => call.endsWith(forbidden)), `the patient screens must not request ${forbidden}`);
    }
});

test("a signed-out visitor sees only the sign-in form", async () => {
    const { ui, calls } = await openApp({ "GET /api/auth/me": { status: 401, body: { error: "Please sign in." } } });
    const text = ui.text();
    assert.ok(text.includes("Sign in") && text.includes("Username") && text.includes("Password"));
    for (const label of ["Dashboard", "Patients", "Groceries", "My profile"]) {
        assert.ok(!text.includes(label), `signed-out visitors must not see "${label}"`);
    }
    assert.deepEqual(calls, ["GET /api/auth/me"]);
});

test("a temporary password blocks everything until it is changed", async () => {
    const routes = {
        "GET /api/auth/me": ok({
            account: { id: "a2", username: "pt-abc234", role: "patient", patient_id: PATIENT_ID, must_change_password: true },
            patient: { id: PATIENT_ID, created_at: "2026-11-14T10:00:00Z", display_name: "Sam", household_size: 3, enrollment_status: "active" }
        })
    };
    const { ui, calls } = await openApp(routes);
    const text = ui.text();
    assert.ok(text.includes("Choose a new password") && text.includes("Save new password"));
    assert.ok(!text.includes("Groceries") && !text.includes("My profile"));
    assert.deepEqual(calls, ["GET /api/auth/me"], "no data is requested before the password is changed");
});

test("an expired session returns to sign-in and clears what was on screen", async () => {
    let expired = false;
    const routes = {
        ...patientRoutes,
        "GET /api/groceries": () => (expired
            ? { status: 401, body: { error: "Please sign in." } }
            : patientRoutes["GET /api/groceries"])
    };
    const { ui } = await openApp(routes);
    await ui.clickButton("Groceries");
    assert.ok(ui.text().includes("Brown rice"));

    expired = true;
    await ui.clickButton("Refresh");
    const text = ui.text();
    assert.ok(text.includes("Your session ended. Sign in again."));
    assert.ok(text.includes("Username"));
    assert.ok(!text.includes("Brown rice") && !text.includes("Please sign in."));
});
