# MtaaReach CRM

Multi-tenant SaaS CRM for political outreach in Uasin Gishu & Nandi Counties, Kenya. Features contact management, bulk SMS campaigns, geographic hierarchy targeting, wallet/credit system, and role-based access control.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/mtaareach run dev` — run the React frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run typecheck:libs` — rebuild lib declarations (run before API server typecheck after schema changes)
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed` — seed demo data
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, shadcn/ui, Recharts, Zustand, wouter
- API: Express 5, Bearer token auth (bcryptjs)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth for all endpoints)
- `lib/api-zod/src/` — generated Zod schemas from OpenAPI
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `lib/db/src/schema/` — Drizzle schema files (geography, tenants, users, contacts, campaigns, sms)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/lib/auth.ts` — Bearer token auth middleware
- `artifacts/mtaareach/src/` — React frontend (pages, components, auth store)

## Architecture decisions

- Contract-first: OpenAPI spec defines all endpoints; routes must match the contract
- Multi-tenancy: `tenant_id` on all tables; routes scope by the authenticated user's tenantId
- Auth: Session-based Bearer tokens in `sessions` table; `requireAuth` middleware on all routes
- Geography: County → Constituency → Ward → Village → Polling Station hierarchy, pre-seeded for Uasin Gishu & Nandi
- Wallet: Per-tenant balance; deducted on campaign execution; topped up by Super Admin
- Frontend auth: Zustand store with localStorage persistence; `setAuthTokenGetter` wires token to all API calls

## Product

- **Super Admin**: System-wide view of tenants, wallets, SMS gateways, sender ID approvals, audit logs
- **Tenant Admin**: Full access to contacts, groups, campaigns, templates, users, reports, wallet, settings
- **Coordinators** (County/Constituency/Ward/Village): Scoped to their geographic area
- **Field Agent**: Contact and village management within their ward

## Demo credentials

- Tenant Admin: `admin@demo-outreach.com` / `admin123`
- Super Admin: `superadmin@mtaareach.com` / `admin123`
- Field Agent: `agent@demo-outreach.com` / `agent123`

Demo session tokens are pre-seeded in the database:
- `demo-tenant-admin-token` — John Kariuki (Tenant Admin, Demo Outreach)
- `demo-super-admin-token` — Super Admin

## Gotchas

- After adding new tables to `lib/db/src/schema/`, run `pnpm run typecheck:libs` before typechecking `api-server` — stale declarations cause TS2305 errors on `@workspace/db` imports
- The OpenAPI spec uses `operationId` names that must not produce colliding `<OperationIdPascal>Params` schemas in components — use inline query params for simple scalars
- `setAuthTokenGetter` must be called in `main.tsx` BEFORE `createRoot` to wire auth tokens to all API calls
- Geography seed data is in `scripts/src/seed.ts`; run it once per new DB environment

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._
