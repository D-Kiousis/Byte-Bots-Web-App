# Byte-Bots-Web-App

A web app built for the 2026 UNF NestforAwhile AI-led coding competition.

## Run locally

1. In Supabase, open **SQL Editor** and run `database/schema.sql`.
2. From this folder, run `Copy-Item .env.example .env` in PowerShell. Set `SUPABASE_URL` and a rotated server-side `SUPABASE_SECRET_KEY` in `.env`.
3. Start the app with `node --env-file=.env backend\server.js`.
4. Open <http://localhost:3000>.

The Node server uses only built-in modules and serves the React 18 frontend from `frontend/`. React and ReactDOM load from a CDN, so the browser needs internet access. No npm install or build step is required.

## Database-backed features

- Patient UUIDs can be created and listed. No patient health or personal information is collected.
- Products can be created and listed, including category, unit, calories, and sodium.
- Product creation automatically creates an inventory row. Quantities and reorder thresholds can be updated from the inventory page.

The secret key is read only by the Node server and must never be placed in frontend code or committed. `SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_JWKS_URL` are included for a future authenticated browser flow but are not used by the current server. This prototype has no user authentication or authorization, so run it locally only; add access controls before deploying it to a public network. Do not enter real patient information.
