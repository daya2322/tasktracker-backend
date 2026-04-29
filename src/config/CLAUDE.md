# src/config

Database connection layer. Owns the single `mysql2` promise pool used by every controller.

## Purpose

Creates and exports the MySQL connection pool. There is no other configuration here — env vars are read directly at the call site elsewhere.

## Key files

- `db.js` — creates `mysql.createPool({ host, user, password, database, port, waitForConnections: true, connectionLimit: 10 })` from `process.env.DB_*`. Exports the pool as `module.exports = pool`.

## Data flow

Controllers `require("../config/db")` and call `db.query(sql, params)` → mysql2 sends to remote MySQL at `161.35.143.76:3306` → returns `[rows, fields]`, destructured as `const [rows] = await db.query(...)`.

## Dependencies

- **Inbound:** every controller in `../controllers/`.
- **Outbound:** the `mysql2/promise` package; the remote MySQL server.
- **Env vars consumed:** `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT` (all required, no defaults).

## Conventions

- Always use parameterised SQL with `?` placeholders. Never string-concatenate user input.
- Destructure as `const [rows] = await db.query(...)` — mysql2 returns `[rows, fields]`.
- The pool is a singleton; never call `mysql.createPool` again elsewhere.
- `db.js:30-33` monkey-patches `pool.query` to `console.log` every SQL string in production. Don't extend that wrapper further; if logging is changed, do it here.
- The first 13 lines are a commented-out earlier definition of the pool — ignore them, the live definition starts at line 15.

## Common commands

None — no folder-specific commands. Use repo-level `npm run dev` / `npm start`.
