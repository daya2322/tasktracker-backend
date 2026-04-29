# src/routes

Express router files, one per resource. Each file imports a controller and one or both middlewares, then declares routes one-per-line.

## Purpose

Wires HTTP method + path to a controller handler, attaching auth/role middleware as needed. Routers are mounted in `../app.js` under a base path like `/api/<resource>`.

## Key files

- `authRoutes.js` — `POST /login` (public), `GET /me`, `POST /logout` (J).
- `attendanceRoute.js` — 7 endpoints under `/api/attendance` (all J), grouped by Write/Read with comment banners.
- `companyRoute.js` — companies CRUD (J).
- `adminRoute.js` — `POST /create-company`. Line 12 has `allowRoles("Admin")` **commented out** — any authenticated user can hit this.
- `employeeRoute.js` — `GET /me`, `GET /dashboard`. Uses `allowRoles("employee")` (lowercase) — does not match DB-issued TitleCase roles, so endpoints likely 403 in practice.
- `attendanceRoute.js`, `locationRoute.js`, `dashboardRoutes.js`, `auditRoutes.js`, `userRoutes.js` — each mirrors a single controller file.
- `settingsRoute.js` — large file mounted at `/api/admin/settings`. Uses `router.use(auth.protect, allowRoles("Admin"))` once at line 64 to gate every route. Has a long header comment listing the full endpoint map.

## Data flow

`app.js` mounts each router under `/api/<resource>` → router matches method+path → middleware chain (`auth.protect`, optionally `allowRoles(...)`) → controller handler.

## Dependencies

- **Inbound:** `../app.js` requires each router by name and mounts it.
- **Outbound:** matching `../controllers/<resource>Controller.js`; `../middleware/auth.js`; sometimes `../middleware/role.js`.

## Conventions

- Each route is one line: `router.<method>("<path>", auth.protect, controller.<handler>);`.
- Group related routes with `/* ── Write ── */` / `/* ── Read ── */` banners (see `attendanceRoute.js`).
- For whole-router gating, prefer `router.use(auth.protect, allowRoles("..."))` once near the top (see `settingsRoute.js:64`) over per-route attachment.
- **Filename inconsistency:** plural (`authRoutes.js`, `dashboardRoutes.js`, `auditRoutes.js`, `userRoutes.js`) and singular (`adminRoute.js`, `companyRoute.js`, `employeeRoute.js`, `attendanceRoute.js`, `locationRoute.js`, `settingsRoute.js`) coexist. Singular is marginally more common — use it for new files.
- Do not destructure the auth middleware: use `const auth = require("../middleware/auth")` then `auth.protect`. (Existing destructured `// const { protect }` lines are commented-out predecessors.)

## Common commands

None — no folder-specific commands. Use repo-level `npm run dev` and curl/Postman to test individual endpoints.
