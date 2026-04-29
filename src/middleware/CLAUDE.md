# src/middleware

JWT auth and role gating. Both files retain large blocks of commented-out earlier versions; the live exports are at the bottom of each file.

## Purpose

`auth.js` verifies bearer JWTs and attaches `req.user`. `role.js` gates a route to a list of allowed role names.

## Key files

- `auth.js` — exports `{ protect }`. Reads `Authorization: Bearer <token>` header, verifies with `JWT_SECRET`, attaches `req.user = { id, role, company_id ?? null }`. Lines 1-67 are commented-out prior versions; live `protect` starts at line 69.
- `role.js` — exports `allowRoles(...roles)` factory. Returns middleware that 403s if `req.user.role` is not in the list. Live impl at line 12.

## Data flow

Request hits a route → `auth.protect` runs first → reads header → `jwt.verify(token, process.env.JWT_SECRET)` → on success, `req.user` is set and `next()` → on failure, returns 401 immediately. If the route also has `allowRoles(...)`, that runs next, returning 403 if the role doesn't match.

## Dependencies

- **Inbound:** `../routes/*` files. Almost every router imports `auth` and most import `{ allowRoles }` from `role.js`.
- **Outbound:** `jsonwebtoken` (`auth.js` only); reads `process.env.JWT_SECRET`.

## Conventions

- Import `auth` as a namespace object, not destructured: `const auth = require("../middleware/auth")` then `auth.protect`. (`role.js` is destructured: `const { allowRoles } = require("../middleware/role")`.)
- The JWT payload is exactly `{ id, role }`. `company_id` is read defensively as `decoded.company_id ?? null`.
- Role names compared by `allowRoles` are case-sensitive — must be `"Admin"` / `"Company"` / `"Employee"` (TitleCase). Lowercase strings will not match the DB-issued role.
- Error responses follow the project envelope: `{ status: false, message: "..." }`. 401 for missing/invalid tokens, 403 for role mismatch.
- Do not delete the commented-out prior versions without confirming nothing references them — they're cruft, but they're load-bearing cruft for someone's git history bisect.

## Common commands

None — no folder-specific commands.
