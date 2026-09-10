# Mizan Personal Finance

Mizan is a bilingual personal finance workspace for organizing bills, debt, and savings goals.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `MONGODB_URI` — the Atlas Drivers connection URI
- Required secrets: `MONGODB_USERNAME` and `MONGODB_PASSWORD` — Atlas database-user credentials applied safely to the configured URI
- Required secret: `GEMINI_API_KEY` — server-only Gemini access for the financial assistant
- `SESSION_SECRET` signs Mizan's server-only authentication cookie.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/mizan` — React/Vite web app with custom auth routes, dashboard, CRUD pages, and bilingual theme providers
- `artifacts/api-server` — Express API with signed-cookie authentication and user-scoped finance routes
- `lib/api-spec/openapi.yaml` — source of truth for generated API hooks and Zod schemas
- MongoDB database `mizan` — profiles, bills, debts, payments, savings goals, contributions, and counters

## Architecture decisions

- Mizan owns email/password sign-up and sign-in. Passwords are hashed with scrypt, must contain at least 6 characters, and do not require an email verification code.
- Sessions use signed, HTTP-only, same-site cookies. Financial records store the authenticated Mizan user ID and are filtered server-side on every query.
- Mizan uses the user's MongoDB Atlas cluster for application persistence; dates are stored as calendar strings to avoid timezone drift.
- Debt payments and savings contributions update balances and append history inside MongoDB transactions to prevent concurrent requests from creating inconsistent totals.
- The generated OpenAPI client is the frontend contract; mutations invalidate the affected React Query caches so changes remain visible after navigation and refresh.
- Language and theme preferences are stored locally for immediate startup behavior and synchronized to the user profile when signed in.
- The Gemini assistant runs server-side, receives only the authenticated user's finance snapshot, and is limited to organizing bills, debts, savings, income, and cash flow.

## Product

Mizan includes a public landing page, immediate email/password account creation, a dashboard summary, bill tracking with paid/overdue states, debt progress and payments, savings goals and contributions, a Gemini financial assistant, responsive navigation, Arabic RTL support, and light/dark themes.

## User preferences

The interface should remain clear, spacious, trustworthy, and usable in both English/LTR and Arabic/RTL.

## Gotchas

- After changing `lib/api-spec/openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen`.
- Restart both managed services after API or frontend changes: `artifacts/api-server: API Server` and `artifacts/mizan: web`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
