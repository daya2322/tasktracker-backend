# tasktracker-backend

Express 5 backend for the TaskTracker (UI brand: **WorkSphere**) attendance and task-tracking app. Single Node process behind PM2, raw `mysql2` queries (no ORM), JWT-only auth, no queues or tests. Deployed to AWS EC2 at `/home/ec2-user/tasktracker-backend`.

## Purpose

Serves the JSON API consumed by `tasktracker-frontend`. Owns all business logic: authentication, attendance punch in/out, company management, dashboards, audit logs, and a large platform-settings surface for Admin users.

## Key files

- `src/server.js` — entry point, loads dotenv, calls `app.listen(PORT || 5000)`.
- `src/app.js` — Express app, mounts all routers under `/api/*`, applies `cors()` + `express.json()`.
- `src/config/db.js` — mysql2 promise pool (10 connections), wraps `pool.query` to log every SQL.
- `src/middleware/auth.js` — `protect` JWT verifier, attaches `req.user = { id, role, company_id }`.
- `src/middleware/role.js` — `allowRoles(...roles)` factory; matches against TitleCase role names.
- `src/controllers/authController.js` — login/logout/getMe; `loginUser` runs a UNION ALL across `admin`, `company`, `users`.
- `src/controllers/auditController.js` — exports `log(action, target, type)` used by other controllers; swallows errors.
- `src/controllers/attendanceController.js` — punch in/out, dashboard summary, history, monthly overview.
- `src/controllers/settingsController.js` — large multi-section settings surface (Admin-only).
- `ecosystem.config.js` — PM2 config: single fork-mode instance, `watch: true`, EC2 working dir.
- `.env` — **committed** with real DB creds and JWT secret. See WARNING below.

## Data flow

HTTP request → `app.js` (cors → json parser) → router under `/api/<module>` → optional `auth.protect` → optional `allowRoles(...)` → controller handler → `db.query(...)` against MySQL → JSON response `{ status, message?, data? }`.

## Dependencies

- **Inbound:** `tasktracker-frontend` calls every endpoint via axios at `NEXT_PUBLIC_API_URL`.
- **Outbound:** MySQL at `161.35.143.76:3306` (`task_db`); OpenStreetMap Nominatim (reverse geocoding only, no API key).
- **Internal flow:** `server.js → app.js → routes/* → controllers/* → config/db.js + middleware/*`.

## Conventions

- **CommonJS only** — `require` / `module.exports`. No `import`, no `.mjs`.
- Every controller handler wraps its body in `try / catch`; **no global error middleware** exists.
- Roles in JWT and DB are TitleCase: `"Admin"`, `"Company"`, `"Employee"`. Lowercase variants silently fail role checks.
- `auth.protect` is imported as the namespace object: `const auth = require("../middleware/auth")` then `auth.protect`.
- Inline `process.env.X` access — there is no central config module.
- See [`../docs/PATTERNS.md`](../docs/PATTERNS.md) for the full style guide and [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) for system context.

## Common commands

```
npm install
npm run dev      # nodemon src/server.js
npm start        # node src/server.js (used by PM2)
npm audit        # 7 known vulns as of 2026-04-29
pm2 start ecosystem.config.js
pm2 reload tasktracker-backend
```

## ⚠ WARNING

`.env` is committed to the repo and contains the **live** MySQL password and JWT signing secret. Rotate both, then force-remove from git history before any further push. Anyone with repo read can connect to the DB and forge JWTs.
