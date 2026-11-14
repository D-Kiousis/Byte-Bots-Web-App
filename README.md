# Byte-Bots-Web-App

A web app built for the 2026 UNF NestforAwhile AI-led coding competition.

## Frontend demo

The React UI is served directly from `frontend/` and loads React 18 from CDN scripts; no install or build step is needed. Open `frontend/index.html` to preview it, or have the project's Node HTTP server serve `frontend/` as static files.

The current checkout does not include `backend/server.js` or another server entry point, so `http://localhost:3000` is not available until the backend server is added or restored. The frontend demo uses fictional in-memory data only; refreshing clears changes.
