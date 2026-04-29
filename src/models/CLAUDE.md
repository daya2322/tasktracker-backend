# src/models

⚠ **DEAD CODE.** All three files in this folder are orphaned Mongoose schemas that no other file imports. The live application is MySQL-only.

## Purpose

Was apparently an aborted attempt to use Mongoose / MongoDB. Nothing in `src/app.js`, `src/routes/*`, or `src/controllers/*` requires anything from this folder. The actual schema is implicit in raw SQL across the controllers — see `../../docs/ARCHITECTURE.md §4`.

## Key files

- `User.js` — Mongoose schema `{ name, email (unique), password }` with bcrypt pre-save hook. **Two bugs:** uses `mongoose.Schema` without importing `mongoose` (line 3); exports the undefined name `User` via `module.exports = User` (line 21). Would crash on `require`.
- `Company.js` — same shape and same missing-import bug as `User.js`. Exports `mongoose.model("Company", ...)`.
- `Attendance.js` — `{ user (ObjectId ref User), date, punchIn, punchOut, punchInAddress, punchOutAddress, status }` with unique index on `{ user, date }`. Imports mongoose correctly but is never required anywhere.

## Data flow

None. No data flows through this folder.

## Dependencies

- **Inbound:** none (verified by grep across the repo).
- **Outbound:** `mongoose` and `bcryptjs` are imported by these files but the imports never run because nothing loads the files.

## Conventions

- **Do not require any file in this folder.** `User.js` and `Company.js` will throw `ReferenceError: mongoose is not defined` on load.
- **Do not extend the Mongoose surface here.** The live data model is MySQL via `../config/db.js`.
- If the intent is to delete this folder, also remove `mongoose ^8.20.1` from `package.json` — it is the only consumer of that dependency.
- If the intent is to migrate to Mongoose, do not start by fixing these files — design the migration as a whole-system change and track it in `docs/`.

## Common commands

None.
