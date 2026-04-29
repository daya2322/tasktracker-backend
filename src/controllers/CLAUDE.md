# src/controllers

All business logic. One file per resource, paired 1:1 with a router in `../routes/`. Handlers are exported as `exports.<handlerName>` and consumed by the matching router.

## Purpose

Each controller validates input, runs SQL through `db.query`, and returns a JSON envelope `{ status, message?, data? }`. There is no service layer — controllers talk directly to the database.

## Key files

- `authController.js` — `loginUser` (UNION ALL across `admin`/`company`/`users`), `getMe`, `logoutUser`. Issues JWTs.
- `auditController.js` — exports `log(action, target, type)` used by other controllers; `getLogs` returns the last 50 entries.
- `attendanceController.js` — `punchIn`, `punchOut`, `getTodayAttendance`, `getDashboardSummary`, `getAttendanceHistory`, `getRecentActivity`, `getMonthlyOverview`. Defines local helpers `getTodayDate`, `calcDuration`, `currentMonthRange`, `currentWeekStart` at the top.
- `companyController.js` — `getCompanies`, `createCompany`, `toggleSuspend`, `deleteCompany` (cascades to `users`).
- `adminController.js` — `createCompany`. Note: line 88 references undefined `company` after a successful INSERT; throws ReferenceError, masking 200s as 500s.
- `employeeController.js` — `getMyProfile`, `employeeDashboard`. Both gated by `allowRoles("employee")` (lowercase, see Conventions).
- `dashboardController.js` — `getStats`, `getRevenue`, `getPlanDistribution` for the admin dashboards.
- `settingsController.js` — large surface for `/api/admin/settings/*` (general, security, notifications, billing, integrations, appearance, api-keys, backup). Defines local `ok` / `err` response wrappers at lines 12-13.
- `locationController.js` — `reverseGeocode`, calls Nominatim with axios.
- `userController.js` — `getUsers`.

## Data flow

Router → `auth.protect` populates `req.user` → handler reads `req.body`, `req.params`, `req.query`, and `req.user` → builds SQL string + params → `await db.query(sql, params)` → response JSON. On exception, controller logs `console.error("<Name> Error:", error)` and returns `{ status: false, message: "..." }` with HTTP 500.

## Dependencies

- **Inbound:** routers in `../routes/` (1:1 by name).
- **Outbound:** `../config/db.js` for SQL; `bcryptjs` (auth/admin/company controllers); `jsonwebtoken` (`authController` only); `axios` (`locationController` only).
- **Cross-controller:** every write-side controller imports `{ log }` from `auditController.js`.

## Conventions

- Handlers are `exports.<verbNoun> = async (req, res) => { try { ... } catch { ... } }`.
- Validation is inline `if (!field) return res.status(400).json({...})`. There is no Joi/Zod/express-validator.
- Helpers used by only one controller live at the top of that controller file (see `attendanceController.js:3-33`).
- Audit log calls are fire-and-forget: `await log(action, target, type)` and the helper swallows errors.
- Role strings used in DB and JWT are TitleCase (`Admin`, `Company`, `Employee`). The lowercase `"employee"` literal in `employeeController` flow only matches when paired with the same lowercase in the route file — and it is (see `routes/employeeRoute.js`), but it does not match the DB-issued role string. **Latent bug.**

## Common commands

None — use repo-level commands. To trace one handler end-to-end: grep the handler name in `../routes/` to find its route line.
