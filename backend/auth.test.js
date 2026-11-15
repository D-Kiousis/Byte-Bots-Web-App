"use strict";

// Run with: node --test backend/auth.test.js
// No network, no database, no API keys needed.

const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const auth = require("./auth");
const { createFakeDb } = require("./test-support/fake-postgrest");

class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

function setup() {
    const clock = { time: new Date("2026-11-14T15:00:00Z") };
    const fake = createFakeDb();
    const service = auth.createAuth({
        db: fake.request,
        HttpError,
        sessionHours: 8,
        now: () => new Date(clock.time)
    });
    const advanceMinutes = (minutes) => { clock.time = new Date(clock.time.getTime() + minutes * 60000); };
    const addPatient = () => {
        const patient = { id: randomUUID(), created_at: clock.time.toISOString(), display_name: null, household_size: 1, enrollment_status: "active" };
        fake.tables.patients.push(patient);
        return patient;
    };
    return { fake, service, advanceMinutes, addPatient };
}

test("passwords are salted scrypt hashes and verify correctly", async () => {
    const one = await auth.hashPassword("correct horse battery");
    const two = await auth.hashPassword("correct horse battery");
    assert.match(one, /^scrypt\$/);
    assert.notEqual(one, two, "each hash uses a fresh salt");
    assert.equal(await auth.verifyPassword("correct horse battery", one), true);
    assert.equal(await auth.verifyPassword("wrong password", one), false);
    assert.equal(await auth.verifyPassword("anything", "not-a-hash"), false);
});

test("temporary passwords are readable and random", () => {
    const first = auth.generateTemporaryPassword();
    assert.match(first, /^[A-HJ-NP-Za-km-z2-9]{4}-[A-HJ-NP-Za-km-z2-9]{4}-[A-HJ-NP-Za-km-z2-9]{4}$/);
    assert.notEqual(first, auth.generateTemporaryPassword());
});

test("cookies: parsed safely and issued HttpOnly", () => {
    assert.deepEqual(auth.parseCookies("a=1; mtg_session=abc%20def; broken"), { a: "1", mtg_session: "abc def" });
    const cookie = auth.sessionCookie("tok", 3600, true);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
    assert.match(cookie, /Secure/);
    assert.doesNotMatch(auth.sessionCookie("tok", 3600, false), /Secure/);
});

test("bootstrap creates the first admin once, and forces a password change", async () => {
    const { service, fake } = setup();
    assert.deepEqual(await service.ensureBootstrapAdmin({}), { created: false, reason: "not configured" });
    assert.equal((await service.ensureBootstrapAdmin({ username: "Admin", password: "Start-pass-1" })).created, true);
    assert.equal((await service.ensureBootstrapAdmin({ username: "other", password: "Start-pass-2" })).created, false);
    assert.equal(fake.tables.accounts.length, 1);
    assert.equal(fake.tables.accounts[0].username, "admin");
    assert.equal(fake.tables.accounts[0].must_change_password, true);
    assert.notEqual(fake.tables.accounts[0].password_hash, "Start-pass-1");
});

test("login creates a session and stores only hashes", async () => {
    const { service, fake } = setup();
    await service.createAccount({ username: "admin", password: "Start-pass-1", role: "admin" });
    const result = await service.login("  ADMIN ", "Start-pass-1");
    assert.equal(result.account.role, "admin");
    assert.equal(fake.tables.sessions.length, 1);
    assert.notEqual(fake.tables.sessions[0].token_hash, result.token, "raw token is never stored");
    assert.equal(fake.tables.sessions[0].token_hash, auth.hashToken(result.token));
    assert.deepEqual(await service.authenticate(result.token), result.account);
});

test("wrong password and unknown user give the same message", async () => {
    const { service } = setup();
    await service.createAccount({ username: "admin", password: "Start-pass-1", role: "admin" });
    const wrong = await service.login("admin", "nope-nope-1").catch((error) => error);
    const unknown = await service.login("nobody", "nope-nope-1").catch((error) => error);
    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    assert.equal(wrong.message, unknown.message);
});

test("five wrong passwords lock the account, and it unlocks later", async () => {
    const { service, advanceMinutes } = setup();
    await service.createAccount({ username: "admin", password: "Start-pass-1", role: "admin" });
    for (let i = 0; i < 5; i += 1) {
        await assert.rejects(() => service.login("admin", "wrong-pass-1"), { status: 401 });
    }
    await assert.rejects(() => service.login("admin", "Start-pass-1"), { status: 429 });
    advanceMinutes(16);
    assert.equal((await service.login("admin", "Start-pass-1")).account.username, "admin");
});

test("sessions expire", async () => {
    const { service, advanceMinutes } = setup();
    await service.createAccount({ username: "admin", password: "Start-pass-1", role: "admin" });
    const { token } = await service.login("admin", "Start-pass-1");
    advanceMinutes(7 * 60);
    assert.ok(await service.authenticate(token));
    advanceMinutes(2 * 60);
    assert.equal(await service.authenticate(token), null);
});

test("logout ends the session", async () => {
    const { service } = setup();
    await service.createAccount({ username: "admin", password: "Start-pass-1", role: "admin" });
    const { token } = await service.login("admin", "Start-pass-1");
    await service.logout(token);
    assert.equal(await service.authenticate(token), null);
});

test("an inactive account cannot sign in or keep a session", async () => {
    const { service, fake } = setup();
    await service.createAccount({ username: "admin", password: "Start-pass-1", role: "admin" });
    const { token } = await service.login("admin", "Start-pass-1");
    fake.tables.accounts[0].active = false;
    assert.equal(await service.authenticate(token), null);
    await assert.rejects(() => service.login("admin", "Start-pass-1"), { status: 401 });
});

test("patient logins: created once, linked to one patient, temporary password", async () => {
    const { service, fake, addPatient } = setup();
    const patient = addPatient();
    const login = await service.createPatientLogin(patient.id);
    assert.match(login.username, /^pt-[a-z0-9]{6}$/);
    assert.ok(login.temporary_password.length >= 12);
    const stored = fake.tables.accounts[0];
    assert.equal(stored.role, "patient");
    assert.equal(stored.patient_id, patient.id);
    assert.equal(stored.must_change_password, true);
    assert.notEqual(stored.password_hash, login.temporary_password);
    await assert.rejects(() => service.createPatientLogin(patient.id), { status: 409 });
    await assert.rejects(() => service.createPatientLogin(randomUUID()), { status: 404 });
});

test("a chosen username that is taken is rejected", async () => {
    const { service, addPatient } = setup();
    await service.createPatientLogin(addPatient().id, "maria");
    await assert.rejects(() => service.createPatientLogin(addPatient().id, "maria"), { status: 409 });
    await assert.rejects(() => service.createPatientLogin(addPatient().id, "Bad Name!"), { status: 400 });
});

test("changing a password: needs the current one, ends other sessions, clears the forced change", async () => {
    const { service, fake, addPatient } = setup();
    const { username, temporary_password: temp } = await service.createPatientLogin(addPatient().id);
    const first = await service.login(username, temp);
    const second = await service.login(username, temp);
    assert.equal(first.account.must_change_password, true);

    await assert.rejects(() => service.changePassword(first.account, first.token, "wrong-current", "A-new-password-1"), { status: 403 });
    await assert.rejects(() => service.changePassword(first.account, first.token, temp, "short"), { status: 400 });
    await assert.rejects(() => service.changePassword(first.account, first.token, temp, temp), { status: 400 });

    await service.changePassword(first.account, first.token, temp, "A-new-password-1");
    assert.equal(fake.tables.accounts[0].must_change_password, false);
    assert.ok(await service.authenticate(first.token), "this browser stays signed in");
    assert.equal(await service.authenticate(second.token), null, "other sessions are ended");
    await assert.rejects(() => service.login(username, temp), { status: 401 });
    assert.ok(await service.login(username, "A-new-password-1"));
});

test("admin password reset signs the patient out and forces a new password", async () => {
    const { service, fake, addPatient } = setup();
    const patient = addPatient();
    const { username, temporary_password: temp } = await service.createPatientLogin(patient.id);
    const { token } = await service.login(username, temp);

    const reset = await service.resetPatientPassword(patient.id);
    assert.equal(reset.username, username);
    assert.notEqual(reset.temporary_password, temp);
    assert.equal(await service.authenticate(token), null);
    await assert.rejects(() => service.login(username, temp), { status: 401 });
    assert.equal((await service.login(username, reset.temporary_password)).account.must_change_password, true);
    assert.equal(fake.tables.accounts[0].failed_logins, 0);
    await assert.rejects(() => service.resetPatientPassword(randomUUID()), { status: 404 });
});
