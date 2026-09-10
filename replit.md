# Mizan Personal Finance

Mizan is a bilingual personal finance workspace for organizing bills, debt, and savings goals.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — the managed PostgreSQL connection string
- Clerk secrets are provisioned for authentication; the browser uses Clerk session cookies for API access.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/mizan` — React/Vite web app with Clerk routes, dashboard, CRUD pages, and bilingual theme providers
- `artifacts/api-server` — Express API with Clerk middleware and user-scoped finance routes
- `lib/api-spec/openapi.yaml` — source of truth for generated API hooks and Zod schemas
- `lib/db/src/schema/finance.ts` — Drizzle schema for profiles, bills, debts, payments, goals, and contributions

## Architecture decisions

- Clerk owns sign-up, sign-in, and user identity; financial records store the Clerk user ID and are filtered server-side on every query.
- Mizan uses the Replit-managed PostgreSQL database for application persistence because no MongoDB integration is available in the workspace; dates are stored as calendar strings to avoid timezone drift.
- The generated OpenAPI client is the frontend contract; mutations invalidate the affected React Query caches so changes remain visible after navigation and refresh.
- Language and theme preferences are stored locally for immediate startup behavior and synchronized to the user profile when signed in.

## Product

Mizan includes a public landing page, branded Clerk auth screens, a dashboard summary, bill tracking with paid/overdue states, debt progress and payments, savings goals and contributions, responsive navigation, Arabic RTL support, and light/dark themes.

## User preferences

The interface should remain clear, spacious, trustworthy, and usable in both English/LTR and Arabic/RTL.

## Gotchas

- After changing `lib/api-spec/openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen`.
- Restart both managed services after API or frontend changes: `artifacts/api-server: API Server` and `artifacts/mizan: web`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
