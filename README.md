# Byte-Bots-Web-App

A web app built for the 2026 UNF NestforAwhile AI-led coding competition.

## Run locally

1. In Supabase, open **SQL Editor** and run `database/schema.sql` (run it again after schema updates).
2. From the project root, create `.env` and set `SUPABASE_URL` and a server-side `SUPABASE_SECRET_KEY`.
3. Start the app with `node backend/server.js`. Node 20.12 or newer automatically loads the root `.env`; on older Node versions, export the variables in your shell first.
4. Open <http://localhost:3000>.

The Node server uses only built-in modules and serves the React 18 frontend from `frontend/`. React and ReactDOM load from a CDN, so the browser needs internet access. No npm install or build step is required.

## Database-backed features

- Patient UUIDs can be created and listed. Patient profile details are only returned to the account that owns them.
- Products can be created and listed, including category, unit, calories, and sodium.
- Product creation automatically creates an inventory row. Quantities and reorder thresholds can be updated from the inventory page.
- Patients can update their own health-condition and allergen selections. Administrators do not receive those fields in the patient directory.
- Administrators can maintain product allergen tags and mark package-label data as reviewed.
- Health conditions are stored for the patient's care context only; the prototype does not apply condition-specific clinical diet rules.

## Recipe recommendations

- Signed-in patients can request up to five recipe ideas from `POST /api/ai/recipes`.
- Gemini receives only in-stock products that pass the server-side allergen checks. Patient IDs, health conditions, and allergen selections are not sent to Gemini.
- If a patient has selected allergens, products with unreviewed labels or matching allergens are excluded before generation. At least two eligible in-stock products are needed to build recipe ideas.
- Existing products are unverified until an administrator reviews their labels in Grocery Inventory. If too few products qualify, the patient is told to ask staff to review labels or update stock.
- Gemini uses model knowledge, not live web search. Recommendations are general ideas, not medical advice; patients should verify package labels and consult their care team.
- Configure `GEMINI_API_KEY` in the project-root `.env`. If Gemini is unavailable, the server returns clearly labeled general fallback ideas.

The Supabase secret key and Gemini API key are read only by the Node server and must never be placed in frontend code or committed. This is a competition prototype, not a clinical decision-support system. Use fictional demonstration data only; do not enter real patient information.
