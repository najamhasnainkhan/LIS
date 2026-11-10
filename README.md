# Pathology LIMS (Phase 1)

Next.js (App Router) + TypeScript + Tailwind + Postgres (`pg`).

Phase 1: login with roles, patient registration (auto ID `PAT-YYYY-000001`), search and edit. Core tables (tests, orders, samples, results) already exist in `db/migrations`.

## Run
1. `npm install`
2. Set `DATABASE_URL` and `SESSION_SECRET` (see `.env.example`; in the workspace use Secrets).
3. `npm run dev`

On first sign-in to an empty database, four starter users are created (password `BOOTSTRAP_PASSWORD`, default `ChangeMe123!`): admin@lab.local, reception@lab.local, tech@lab.local, pathologist@lab.local. Change these before real use.

Docker: `docker build -t lims .` then run with the two env vars.

Note: the original brief asked for Prisma/SQLite; this build uses the project's built-in Postgres via `pg`.
