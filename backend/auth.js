"use strict";

/*
 * Accounts, sessions and roles for the MTG warehouse app. Built-in modules only.
 *
 *  - Passwords are hashed with scrypt (salted, slow on purpose).
 *  - A session token is 32 random bytes in an HttpOnly cookie. Only its SHA-256
 *    hash is stored in the database.
 *  - 5 wrong passwords lock an account for 15 minutes.
 *  - The server decides who a person is and what they may do. Nothing the
 *    browser sends is trusted for identity or role.
 *
 * createAuth() takes the database function and the server's HttpError class, so
 * this file has no database code of its own and can be tested with a fake.
 */

const crypto = require("node:crypto");
const { promisify } = require("node:util");

const scrypt = promisify(crypto.scrypt);

const SCRYPT = { N: 16384, r: 8, p: 1, keyLength: 64 };
const COOKIE_NAME = "mtg_session";
const usernamePattern = /^[a-z0-9._-]{3,32}$/;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 128;
const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
// No look-alike characters (0/O, 1/l/I) so temporary passwords are easy to read out and type.
const PASSWORD_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
const USERNAME_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

function randomString(alphabet, length) {
    let result = "";
    for (let i = 0; i < length; i += 1) {
        result += alphabet[crypto.randomInt(alphabet.length)];
    }
    return result;
}

function generateTemporaryPassword() {
    return [4, 4, 4].map((length) => randomString(PASSWORD_ALPHABET, length)).join("-");
}

function generateToken() {
    return crypto.randomBytes(32).toString("base64url");
}

function hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

async function hashPassword(password) {
    const salt = crypto.randomBytes(16);
    const key = await scrypt(password, salt, SCRYPT.keyLength, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
    return ["scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString("base64"), key.toString("base64")].join("$");
}

async function verifyPassword(password, stored) {
    const parts = String(stored).split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt") {
        return false;
    }
    const [, N, r, p, saltB64, keyB64] = parts;
    const expected = Buffer.from(keyB64, "base64");
    const actual = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length, {
        N: Number(N),
        r: Number(r),
        p: Number(p)
    });
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function parseCookies(header) {
    const cookies = {};
    for (const part of String(header || "").split(";")) {
        const index = part.indexOf("=");
        if (index === -1) continue;
        const name = part.slice(0, index).trim();
        if (!name) continue;
        try {
            cookies[name] = decodeURIComponent(part.slice(index + 1).trim());
        } catch {
            // ignore malformed cookie values
        }
    }
    return cookies;
}

function sessionCookie(token, maxAgeSeconds, secure) {
    return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}${secure ? "; Secure" : ""}`;
}

function clearedSessionCookie(secure) {
    return `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure ? "; Secure" : ""}`;
}

function normalizeUsername(value) {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function publicAccount(row) {
    return {
        id: row.id,
        username: row.username,
        role: row.role,
        patient_id: row.patient_id || null,
        must_change_password: Boolean(row.must_change_password)
    };
}

function createAuth({ db, HttpError, sessionHours = 8, now = () => new Date() }) {
    let dummyHash = null;

    // Spend the same time on unknown usernames as on real ones, so response
    // timing does not reveal which usernames exist.
    async function burnTime(password) {
        if (!dummyHash) {
            dummyHash = await hashPassword("not-a-real-password");
        }
        await verifyPassword(typeof password === "string" ? password.slice(0, MAX_PASSWORD) : "", dummyHash);
    }

    function validatePassword(password) {
        if (typeof password !== "string" || password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) {
            throw new HttpError(400, `Passwords must be ${MIN_PASSWORD} to ${MAX_PASSWORD} characters.`);
        }
    }

    async function login(rawUsername, password) {
        const invalid = () => new HttpError(401, "Invalid username or password.");
        const username = normalizeUsername(rawUsername);
        if (!usernamePattern.test(username) || typeof password !== "string"
            || password.length === 0 || password.length > MAX_PASSWORD) {
            await burnTime(password);
            throw invalid();
        }

        const rows = await db(
            `accounts?username=eq.${encodeURIComponent(username)}&select=id,username,password_hash,role,patient_id,active,must_change_password,failed_logins,locked_until`
        );
        const account = rows && rows[0];
        if (!account) {
            await burnTime(password);
            throw invalid();
        }
        if (account.locked_until && new Date(account.locked_until) > now()) {
            throw new HttpError(429, "Too many failed attempts. Try again in a few minutes.");
        }

        const passwordOk = await verifyPassword(password, account.password_hash);
        if (!passwordOk) {
            const failures = Number(account.failed_logins || 0) + 1;
            const lock = failures >= MAX_FAILED_LOGINS;
            await db(`accounts?id=eq.${encodeURIComponent(account.id)}`, {
                method: "PATCH",
                body: {
                    failed_logins: lock ? 0 : failures,
                    locked_until: lock ? new Date(now().getTime() + LOCK_MINUTES * 60000).toISOString() : null
                }
            });
            throw invalid();
        }
        if (!account.active) {
            throw invalid();
        }

        const token = generateToken();
        const expiresAt = new Date(now().getTime() + sessionHours * 3600 * 1000);
        await db("sessions", {
            method: "POST",
            body: { token_hash: hashToken(token), account_id: account.id, expires_at: expiresAt.toISOString() }
        });
        await db(`accounts?id=eq.${encodeURIComponent(account.id)}`, {
            method: "PATCH",
            body: { failed_logins: 0, locked_until: null, last_login_at: now().toISOString() }
        });
        // Housekeeping: remove sessions that have already expired. Never block a sign-in on it.
        try {
            await db(`sessions?expires_at=lt.${encodeURIComponent(now().toISOString())}`, { method: "DELETE" });
        } catch {
            // ignore
        }
        return { token, expiresAt, maxAgeSeconds: sessionHours * 3600, account: publicAccount(account) };
    }

    async function authenticate(token) {
        if (!token || typeof token !== "string" || token.length > 200) {
            return null;
        }
        const rows = await db(
            `sessions?token_hash=eq.${hashToken(token)}&expires_at=gt.${encodeURIComponent(now().toISOString())}&select=account_id,expires_at,accounts(id,username,role,patient_id,active,must_change_password)`
        );
        const row = rows && rows[0];
        const account = row && (Array.isArray(row.accounts) ? row.accounts[0] : row.accounts);
        if (!account || !account.active) {
            return null;
        }
        return publicAccount(account);
    }

    async function logout(token) {
        if (!token || typeof token !== "string" || token.length > 200) {
            return;
        }
        await db(`sessions?token_hash=eq.${hashToken(token)}`, { method: "DELETE" });
    }

    async function createAccount({ username, password, role, patientId = null, mustChange = false }) {
        const name = normalizeUsername(username);
        if (!usernamePattern.test(name)) {
            throw new HttpError(400, "Usernames are 3 to 32 characters: lowercase letters, numbers, dot, dash or underscore.");
        }
        validatePassword(password);
        const passwordHash = await hashPassword(password);
        try {
            const rows = await db("accounts?select=id,username,role,patient_id,must_change_password", {
                method: "POST",
                prefer: "return=representation",
                body: {
                    username: name,
                    password_hash: passwordHash,
                    role,
                    patient_id: patientId,
                    must_change_password: Boolean(mustChange)
                }
            });
            return rows[0];
        } catch (error) {
            if (error && error.status === 409) {
                throw new HttpError(409, "That username is already taken, or this patient already has a login.");
            }
            throw error;
        }
    }

    async function createPatientLogin(patientId, requestedUsername) {
        const patients = await db(`patients?id=eq.${encodeURIComponent(patientId)}&select=id`);
        if (!patients || patients.length === 0) {
            throw new HttpError(404, "Patient not found.");
        }
        const existing = await db(`accounts?patient_id=eq.${encodeURIComponent(patientId)}&select=id`);
        if (existing && existing.length > 0) {
            throw new HttpError(409, "This patient already has a login. Reset the password instead.");
        }

        const requested = normalizeUsername(requestedUsername);
        const generate = !requested;
        const password = generateTemporaryPassword();
        for (let attempt = 0; attempt < 5; attempt += 1) {
            const username = generate ? `pt-${randomString(USERNAME_ALPHABET, 6)}` : requested;
            try {
                const account = await createAccount({
                    username,
                    password,
                    role: "patient",
                    patientId,
                    mustChange: true
                });
                return { username: account.username, temporary_password: password };
            } catch (error) {
                if (!(generate && error.status === 409)) {
                    throw error;
                }
            }
        }
        throw new HttpError(500, "Could not generate a unique username. Try again.");
    }

    async function resetPatientPassword(patientId) {
        const rows = await db(`accounts?patient_id=eq.${encodeURIComponent(patientId)}&select=id,username`);
        if (!rows || rows.length === 0) {
            throw new HttpError(404, "This patient does not have a login yet.");
        }
        const account = rows[0];
        const password = generateTemporaryPassword();
        await db(`accounts?id=eq.${encodeURIComponent(account.id)}`, {
            method: "PATCH",
            body: {
                password_hash: await hashPassword(password),
                must_change_password: true,
                failed_logins: 0,
                locked_until: null
            }
        });
        // Sign the patient out everywhere; the old password must stop working immediately.
        await db(`sessions?account_id=eq.${encodeURIComponent(account.id)}`, { method: "DELETE" });
        return { username: account.username, temporary_password: password };
    }

    async function changePassword(account, token, currentPassword, newPassword) {
        if (typeof currentPassword !== "string" || currentPassword.length === 0 || currentPassword.length > MAX_PASSWORD) {
            throw new HttpError(400, "Enter your current password.");
        }
        validatePassword(newPassword);
        const rows = await db(`accounts?id=eq.${encodeURIComponent(account.id)}&select=password_hash`);
        // 403, not 401: the person is signed in, they just typed the wrong password.
        if (!rows || rows.length === 0 || !(await verifyPassword(currentPassword, rows[0].password_hash))) {
            throw new HttpError(403, "Your current password is not correct.");
        }
        if (newPassword === currentPassword) {
            throw new HttpError(400, "Choose a password that is different from your current one.");
        }
        if (newPassword.toLowerCase() === account.username) {
            throw new HttpError(400, "Your password cannot be the same as your username.");
        }
        await db(`accounts?id=eq.${encodeURIComponent(account.id)}`, {
            method: "PATCH",
            body: { password_hash: await hashPassword(newPassword), must_change_password: false }
        });
        // Keep this browser signed in, end every other session.
        await db(
            `sessions?account_id=eq.${encodeURIComponent(account.id)}&token_hash=neq.${hashToken(token)}`,
            { method: "DELETE" }
        );
    }

    async function ensureBootstrapAdmin({ username, password }) {
        if (!username || !password) {
            return { created: false, reason: "not configured" };
        }
        const admins = await db("accounts?role=eq.admin&select=id&limit=1");
        if (admins && admins.length > 0) {
            return { created: false, reason: "an administrator already exists" };
        }
        await createAccount({ username, password, role: "admin", mustChange: true });
        return { created: true };
    }

    return {
        login,
        authenticate,
        logout,
        createAccount,
        createPatientLogin,
        resetPatientPassword,
        changePassword,
        ensureBootstrapAdmin
    };
}

module.exports = {
    COOKIE_NAME,
    usernamePattern,
    createAuth,
    hashPassword,
    verifyPassword,
    generateTemporaryPassword,
    generateToken,
    hashToken,
    parseCookies,
    sessionCookie,
    clearedSessionCookie
};
