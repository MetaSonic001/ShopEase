# NEURATHON-PagePulse (Brained)

> MERN starter combining a Vite/React frontend and an Express/MongoDB backend built to ingest analytics (events + performance), summarize them, and export CSV/PDF reports.

This repository contains a small React app in `brained/` and a Node/Express backend in `brained/server/`. The backend includes endpoints to ingest analytics, aggregate summaries, export CSV/PDF, basic auth examples, and dev-only seed tooling to verify the data pipeline.

---

## Quick start (Windows cmd.exe)

Backend (server):

```cmd
cd C:\Users\shaun\projects\NEURATHON-PagePulse\brained\server
npm install
npm run dev
```

Frontend (client):

```cmd
cd C:\Users\shaun\projects\NEURATHON-PagePulse\brained
npm install
npm run dev
```

---

## How to run and verify (detailed, cmd.exe)

1) Install and start the backend

```cmd
cd C:\Users\shaun\projects\NEURATHON-PagePulse\brained\server
npm install
npm run dev
```

2) Health check

```cmd
curl http://localhost:5000/api/health
```

Expected response:

```json
{"status":"Server running"}
```

3) Seed sample data (development only)

```cmd
curl http://localhost:5000/api/analytics/seed
```

Expected: JSON showing counts and created documents. After seeding, verify ingestion/aggregation:

```cmd
curl http://localhost:5000/api/analytics/events
curl http://localhost:5000/api/analytics/performance
curl http://localhost:5000/api/analytics/events/summary
curl http://localhost:5000/api/analytics/performance/summary
```

4) Export (CSV / PDF)

```cmd
curl -v http://localhost:5000/api/analytics/export/csv --output analytics.csv
curl -v http://localhost:5000/api/analytics/export/pdf --output analytics.pdf
```

---

## What this project includes

- Frontend: `brained/` (Vite + React). Use it as the UI to capture interactions and show dashboards.
- Backend: `brained/server/` (Express) with:
  - `server.js` — entrypoint, DB connection, route mounting
  - `routes/analytics.js` — ingest endpoints, summaries, export CSV/PDF, integration stubs, seed
  - `routes/auth.js` — simple register/login example
  - `models/` — `EventAnalytics.js`, `PerformanceMetrics.js`, `User.js`
  - `middleware/` — `rateLimiter.js`, `deviceInfo.js`
  - `.env.example` / `.env` for configuration

---

## API reference (selected endpoints)

Ingest:

- POST /api/analytics/events
  - Body example:

```json
{
  "eventType": "click",
  "element": "#signup",
  "pageURL": "https://example.com/signup",
  "metadata": { "source": "banner" }
}
```

- POST /api/analytics/performance

```json
{
  "pageURL": "https://example.com",
  "TTFB": 120,
  "LCP": 1500,
  "FCP": 600,
  "CLS": 0.02
}
```

Summaries:

- GET /api/analytics/events/summary — counts by eventType and by (pageURL, eventType)
- GET /api/analytics/performance/summary — average metrics (TTFB/LCP/FCP/CLS) by pageURL

Exports:

- GET /api/analytics/export/csv — combined CSV (events + performance)
- GET /api/analytics/export/pdf — summary PDF (sampled)

Utilities (dev):

- GET /api/health — health check
- GET /api/analytics/seed — insert sample documents (dev only)

Integration stubs:

- POST /api/analytics/integrations/hotjar
- POST /api/analytics/integrations/mixpanel
- POST /api/analytics/integrations/custom

---

## Data models (high level)

- EventAnalytics:
  - eventType: String (click, scroll, hover)
  - element: String
  - pageURL: String
  - timestamp: Date
  - deviceInfo: { device, browser, os, raw }
  - metadata: Mixed

- PerformanceMetrics:
  - pageURL: String
  - TTFB, LCP, FCP, CLS: Number
  - jsErrors: Array
  - timestamp: Date
  - deviceInfo: { device, browser, os, raw }

---

## Architecture & flow (detailed)

1. Frontend collects events & performance metrics. It should post to `/api/analytics/events` and `/api/analytics/performance`.
2. Requests hit the Express server. Middleware:
   - `deviceInfo` parses the `User-Agent` header and attaches `req.deviceInfo` (server-side device/browser/os).
   - `rateLimiter` rejects requests that exceed configured thresholds.
3. Server persists raw documents to MongoDB using Mongoose.
4. Aggregation endpoints run efficient MongoDB aggregation pipelines to compute counts and averages for dashboards.
5. Export endpoints generate CSV (via `json2csv`) or PDF (via `pdfkit`) — suitable for small/medium datasets in current implementation.

Storage:

- Events are stored in `event_analytics` collection.
- Performance metrics are stored in `performance_metrics` collection.

---

## Environment variables

Place these in `brained/server/.env` (or root `.env`) — never commit secrets.

- MONGO_URI — Atlas connection string (include DB name if you want): `mongodb+srv://USER:PASS@host/<dbname>?retryWrites=true&w=majority`
- JWT_SECRET — JWT signing secret
- PORT — default `5000`
- CLIENT_URL — frontend origin (CORS)

Example:

```properties
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/<dbname>?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_here
PORT=5000
CLIENT_URL=http://localhost:3000
```

---

## Security and production notes

- Protect ingestion and export endpoints with authentication (JWT/api-key).
- Remove or protect `/api/analytics/seed` in production.
- Limit export sizes; implement background export jobs and store results in object storage for large datasets.
- Use HTTPS and secure secrets with a vault or environment configuration in production.

---

## Testing & validation

- Manual:
  - Start server, hit `/api/health`, run `/api/analytics/seed`, then call summary and export endpoints to verify.

- Automated (recommended):
  - Add `supertest` + `jest` and write integration tests that seed and assert aggregation outputs.

---

## Recommended next steps (pick any)

1. Add authentication for ingestion/export endpoints (API key / JWT).
2. Implement pagination and time-range filters for summary endpoints (query params).
3. Move exports to background jobs (e.g., BullMQ + Redis) and store results in S3.
4. Add Docker + docker-compose for local development (backend + local MongoDB).
5. Add CI (GitHub Actions) with tests and linting.

---

If you want, I can implement any of the recommended next steps. Tell me which one and I'll add it (Docker compose, tests, auth, etc.).

---

License: MIT
# NEURATHON-PagePulse (Brained)

Comprehensive MERN (MongoDB, Express, React, Node.js) starter for the Brained frontend and analytics backend. This repository contains a React frontend (in `brained/`) and a Node/Express backend (in `brained/server`) with analytics ingestion, exports, and basic auth examples.

This README documents everything you need to run, test, and extend the project: architecture, data flow, environment variables, endpoints (health and seed), development commands, deployment notes and recommended next steps.

---

## Table of Contents

- Project overview
- What is included
- Architecture & flow (diagram)
- Key files and folders
- Environment variables
- Backend: run & test (health, seed, analytics)
- Frontend: run & connect
- Exports (CSV / PDF)
- Integrations and stubs (Hotjar, Mixpanel, custom)
- Security & notes
- Testing & quality gates
- Next steps and recommended improvements
- License

---

## Project overview

This repository is a MERN template tailored for collecting page performance and user event analytics for a React frontend. The backend exposes a small REST API for ingesting events and performance metrics, provides aggregation endpoints for dashboards, and supports exports (CSV and PDF).

The backend is intentionally minimal and easy to extend. It includes:
- Express server with Mongoose for MongoDB access
- CORS enabled for the frontend
- Device/browser metadata captured from User-Agent (server-side)
- Rate limiting to protect ingestion endpoints
- CSV export via `json2csv` and PDF export via `pdfkit`

The frontend directory (`brained/`) contains an example React app (Vite + TypeScript setup) which you can connect to the backend. The repository was scaffolded so you can run both frontend and backend locally.

---

## What is included

- `brained/` — React frontend (existing app)
- `brained/server/` — Express backend (server.js, routes, models, middleware)
  - `models/` — Mongoose models (User, EventAnalytics, PerformanceMetrics)
  - `routes/` — auth, analytics (ingest/export/summary), analytics seed endpoint
  - `middleware/` — rate limiter, deviceInfo (UA parser)
  - `.env.example` and `.env` (fill with your values; do NOT commit secrets)
- Root `README.md` (this file)

---

## Architecture & flow

High level architecture:

Client (React) --> Backend (Express) --> MongoDB Atlas

Key responsibilities:
- Frontend (React): UI, capturing events/perf metrics, calling ingestion endpoints
- Backend (Express): receive data, enrich (device info), persist to MongoDB, provide summarization APIs & exports
- MongoDB Atlas: store events and performance metrics

ASCII flow diagram

```
[Browser / Client] --(POST events/perf)--> [Express API: /api/analytics]
     |                                         |---> Persist -> MongoDB (event_analytics)
     |                                         |---> Persist -> MongoDB (performance_metrics)
     |                                         |---> /export/csv (json2csv)
     |                                         |---> /export/pdf (pdfkit)
     |                                         |---> /events/summary (aggregation)
     v
  User Interactions (click, scroll, hover) and Performance Observations (TTFB, LCP, FCP, CLS)
```

Sequence (simplified):
1. Frontend records an event/perf metric.
2. Frontend sends POST /api/analytics/events or /api/analytics/performance.
3. Server middleware parses User-Agent into `deviceInfo` and rate-limits requests.
4. Server saves documents in MongoDB collections.
5. Dashboard / Admin can query summary endpoints or export CSV/PDF.

---

## Key files and folders (server)

- `brained/server/server.js` — Entry point. Connects to MongoDB, mounts routes and middleware.
- `brained/server/models/EventAnalytics.js` — Schema for event data (eventType, element, pageURL, timestamp, deviceInfo, metadata).
- `brained/server/models/PerformanceMetrics.js` — Schema for performance metrics (TTFB, LCP, FCP, CLS, jsErrors, deviceInfo).
- `brained/server/routes/analytics.js` — API endpoints for ingesting data, summaries, and exports.
- `brained/server/routes/auth.js` — Example auth endpoints (register/login) with JWT.
- `brained/server/middleware/deviceInfo.js` — Parses user-agent into device/browser/os using `ua-parser-js`.
- `brained/server/middleware/rateLimiter.js` — Express rate limiter to prevent abuse.

---

## Environment variables

Copy the example and fill values. Do not commit secrets.

File: `brained/server/.env` (or root `.env`)

Required:
- `MONGO_URI` — MongoDB Atlas connection string. Prefer including the database name: `mongodb+srv://USER:PASS@host/<dbname>?retryWrites=true&w=majority`
- `JWT_SECRET` — secret for signing JWTs (if you use the auth endpoints)
- `PORT` — backend port (default `5000`)
- `CLIENT_URL` — frontend URL allowed by CORS (e.g., `http://localhost:3000`)

Example (do NOT paste credentials here):
```properties
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/<dbname>?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_here
PORT=5000
CLIENT_URL=http://localhost:3000
```

Security note: rotate DB credentials if they were committed accidentally. Keep `.env` in `.gitignore`.

---

## Backend: run & test

From the server folder:

```cmd
cd C:\Users\shaun\projects\NEURATHON-PagePulse\brained\server
npm install
npm run dev
```

Available useful endpoints (server must be running on port 5000):

- Health check
  - GET /api/health
  - Response: `{ "status": "Server running" }`

- Seed sample data (development only)
  - GET /api/analytics/seed
  - Inserts example EventAnalytics and PerformanceMetrics documents for testing and returns the created documents.

- Ingest endpoints
  - POST /api/analytics/events
    - Body example:
      ```json
      {
        "eventType": "click",
        "element": "#signup",
        "pageURL": "https://example.com/signup",
        "metadata": { "source": "banner" }
      }
      ```

  - POST /api/analytics/performance
    - Body example:
      ```json
      {
        "pageURL": "https://example.com",
        "TTFB": 120,
        "LCP": 1500,
        "FCP": 600,
        "CLS": 0.02
      }
      ```

- Aggregations / Summaries
  - GET /api/analytics/events/summary — counts by eventType and by (pageURL, eventType)
  - GET /api/analytics/performance/summary — average LCP, FCP, CLS, TTFB grouped by pageURL

- Exports
  - GET /api/analytics/export/csv — returns `analytics.csv` combining events and performance rows (json2csv)
  - GET /api/analytics/export/pdf — returns `analytics.pdf` summary (pdfkit)

- Integration stubs
  - POST /api/analytics/integrations/hotjar
  - POST /api/analytics/integrations/mixpanel
  - POST /api/analytics/integrations/custom

Notes:
- Device/browser metadata is captured server-side from the `User-Agent` header and attached as `deviceInfo`. The server prefers that over client-supplied `deviceInfo` but will accept client values.
- Rate limiting (100 requests per 15 minutes per IP) is enabled globally; adjust in `middleware/rateLimiter.js`.

---

## Frontend: run & connect

The frontend app is in `brained/` (Vite + React). To start it:

```cmd
cd C:\Users\shaun\projects\NEURATHON-PagePulse\brained
npm install
npm run dev
```

Make sure `CLIENT_URL` in server `.env` matches the address used by the frontend (usually `http://localhost:5173` or `http://localhost:3000` depending on your config). The server uses this for CORS.

If you want the frontend to proxy API requests during development, add a `proxy` to the frontend dev server config or use fetch with the full URL to `http://localhost:5000`.

---

## Exports (CSV / PDF)

- CSV: `GET /api/analytics/export/csv` returns a CSV file named `analytics.csv`. It combines both event and performance records with a `type` column.
- PDF: `GET /api/analytics/export/pdf` streams a simple PDF report limited to a sample of records. For large datasets consider background/export jobs or streaming.

Example download (cmd):
```cmd
curl -v http://localhost:5000/api/analytics/export/csv --output analytics.csv
curl -v http://localhost:5000/api/analytics/export/pdf --output analytics.pdf
```

---

## Integrations

The server includes simple stubs for third-party integrations so you can implement forwarding or webhook logic later:

- `POST /api/analytics/integrations/hotjar` — Hotjar stub
- `POST /api/analytics/integrations/mixpanel` — Mixpanel stub
- `POST /api/analytics/integrations/custom` — Custom event listener stub

Recommended approach:
- For Mixpanel, prefer client-side SDK for performance events and server-side batching for sensitive/frequent events.
- For Hotjar, use the client script for session replay and heatmaps; server-side forwarding can be used for aggregated insights.

---

## Security & operational notes

- Do NOT commit `.env` or secrets. Use `.env.example` for documentation.
- Rotate DB credentials if they have been exposed.
- Protect export and seed endpoints in production. Seed is intended for local/dev only.
- Add authentication (JWT or API key) for ingestion and export endpoints if the application will be public.
- Consider storing large exports in object storage (S3) and provide a signed download link instead of streaming for huge datasets.

---

## Testing & validation

- Health endpoint: `GET /api/health`
- Seed endpoint: `GET /api/analytics/seed` (dev only) — creates sample documents so you can verify flows with minimal setup
- After seeding, call the summary endpoints and verify aggregation results.

Automated tests (suggestions):
- Add `supertest` + `jest` or `mocha` to run integration tests against the Express app.
- Create tests: seed -> fetch summaries -> assert counts/averages.

---

## Next steps / recommended improvements

- Add authentication/authorization for critical endpoints
- Implement pagination, time-range filters and rate limits per-route
- Move exports to background jobs for large datasets (queue + worker + S3)
- Add monitoring and structured logs (e.g., Winston + Logstash)
- Add unit/integration tests and CI workflow
- Add Dockerfile and `docker-compose.yml` for local development with a local MongoDB (optional)

---

## License

MIT

---

If you'd like, I can now:
- Add a `docker-compose.yml` to run backend + a local MongoDB for development;
- Add tests that run seed + aggregation and assert results;
- Protect seed/export endpoints with a simple API key or JWT.

Tell me which of the above you'd like next and I will implement it.
