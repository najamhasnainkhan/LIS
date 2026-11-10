# AGENTS.md

## Stack
- Next.js 14 App Router, TypeScript, Tailwind CSS
- Postgres via `pg` (no ORM); schema changes only through migrations in `db/migrations`
- bcryptjs + jsonwebtoken for auth (httpOnly signed cookie `lims_session`)

## Conventions
- `app/api/**/route.ts`: JSON route handlers; each starts with `requirePerm("<permission>")`.
- `app/(app)/`: signed-in pages inside the sidebar layout; unbuilt sections are served by `[section]/page.tsx` placeholder.
- `lib/permissions.ts`: single source of role -> permission map and sidebar NAV. Add new sections there.
- `lib/db.ts`: shared pool and `query()` helper (parameterised, one retry).
- `components/`: client components. Styling with Tailwind; `.input`, `.btn` classes in `app/globals.css`.

## Run
- `npm install`, `npm run dev`, `npm run build`
- Env: DATABASE_URL, SESSION_SECRET, optional BOOTSTRAP_PASSWORD

## Decisions
- Postgres + pg instead of Prisma/SQLite: the platform provides Postgres.
- Starter users (one per role) are created on first login against an empty users table.
- Patient ID from a DB sequence: `PAT-YYYY-000001`, unique constraint.
- Phase 2 done: catalog (`/catalog`, `/api/catalog`, categories/tests/panels), billing (`/billing`, `/api/billing`: order+invoice in one step, discount, payments). Money is integer cents, parsed with `lib/money.ts`. Permissions `catalog.read/write` added.
- Phase 3 done: `/samples` page, `/api/samples` (list, record collection), `/api/samples/[id]` (receive/process), `/api/results/[id]` (tech save/submit), `/api/results/[id]/review` (pathologist approve/reject; all approved -> sample + order completed). Sample codes `SMP-YYYY-<id>` via `lib/samples.ts`; Code128 SVG in `lib/code128.ts`/`components/Barcode.tsx`. Billing creates a sample automatically. Migration `samples_workflow` (extra columns, backfill) was held for approval; code does not depend on it.
- Phase 4 done: `/reports` (list), `/reports/[id]` (id = sample id; print view), `/api/reports/[id]/pdf` (download). `lib/report.ts` loads approved results; `lib/pdf.ts` is a dependency-free PDF writer. Permission `reports`.
- Phase 5 done: `/dashboard` (`/api/dashboard`, Recharts in `components/DashboardClient.tsx`), `/inventory` (`/api/inventory`, `[id]`; table `inventory_items`; alerts = qty <= min or expiry within 30 days). Shared parsing in `lib/inventory.ts` (route files must not export helpers).
- Phase 6 done: `/staff` (`/api/staff`, `[id]`: create, role, activate, reset password) and `/audit-logs` (`/api/audit-logs`). Table `audit_logs`; write entries with `audit()` from `lib/audit.ts` (patient view/create/update, result save/submit/approve/reject, payments, staff changes). Add `audit()` to any new data-changing route.
- Roadmap (all phases done): tests/billing, samples, reports/PDF, dashboard/inventory, staff/audit logs (audit_logs table not yet created).
