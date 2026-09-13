# SCCS Backend - Smart Cycle Count Scoring

NestJS + Prisma 8 (`@prisma/orm-postgres`, PSL contract) + PostgreSQL API for the Smart Cycle
Count Scoring MVP: warehouse bins get a 0–100 risk score, riskiest bins get pulled into audit
plans, and count results feed back into the score.

## Tech stack

- **NestJS 12** (Express adapter), ESM, TypeScript.
- **Prisma 8** (`@prisma/orm-postgres`, currently pre-release) - a contract-first data layer.
  The schema lives in [`src/prisma/contract.prisma`](src/prisma/contract.prisma); `contract.json` /
  `contract.d.ts` are generated artefacts, never hand-edited.
- **PostgreSQL 15+.**
- **class-validator** / **class-transformer** for request DTO validation.
- **`@nestjs/swagger`** for OpenAPI docs, gated by **HTTP Basic Auth** (`express-basic-auth`).
- Structured request/error **logging** via a global interceptor + exception filter (NestJS `Logger`).
- **Vitest** for unit + e2e tests (**90%+ coverage enforced**), **oxlint** for linting.

## Prerequisites

- Node.js 22+ (project developed and tested on Node 24).
- A reachable PostgreSQL 15+ database (Supabase works - see the pooler note below).

## Install, configure, seed, run

```bash
npm install

# 1. Point at your database and set the Swagger docs credentials
cp .env.example .env
# edit .env - set DATABASE_URL="postgresql://janedoe:mypassword@localhost:5432/mydb?schema=sample"
# also set SWAGGER_USER / SWAGGER_PASSWORD (see "API documentation" below)

# 2. Create the schema (tables, indexes, FKs) from the contract
npx prisma db init

# 3. Seed a demo warehouse: 30 bins, products, pallets, ~30 days of
#    simulated activity, and a slice of audit history - then computes
#    the initial risk scores.
npm run seed

# 4. Run the API
npm run start:dev
```

The API listens on `http://localhost:3000/api` (prefix `/api`, CORS enabled for the Next.js
front-end).

**Supabase note:** the direct connection host (`db.<ref>.supabase.co:5432`) can reject
connections from some networks/IPv6-only egress. If `db init` / the app can't connect, use the
connection pooler URL from the Supabase dashboard instead (`...pooler.supabase.com:6543` with
`?pgbouncer=true`), which is what this project was verified against.

### Re-running the seed

The seed script always inserts a fresh warehouse, so re-running it against a non-empty database
will violate the `Warehouse.code` unique constraint unless you clear the seed-owned tables first:

```bash
npm run seed -- --reset
```

`--reset` deletes every row from the tables this script populates (in dependency order) before
reseeding. It's scoped to those tables, not a full database wipe.

## Scripts

| Command                 | What it does                                                                  |
| ----------------------- | ----------------------------------------------------------------------------- |
| `npm run start:dev`     | Run the API with file-watch reload.                                           |
| `npm run seed`          | Seed the demo warehouse (see above).                                          |
| `npm run contract:emit` | Regenerate `contract.json` / `contract.d.ts` after editing `contract.prisma`. |
| `npm test`              | Unit tests (Vitest).                                                          |
| `npm run test:e2e`      | End-to-end tests (boots the Nest app in-process, hits a real database).       |
| `npm run test:cov`      | Unit + e2e tests together with coverage, thresholds enforced at 90%.          |
| `npm run lint`          | oxlint over `src/` and `test/`.                                               |
| `npm run build`         | Compile to `dist/`.                                                           |

## Data model

```text
Warehouse ─< Aisle ─< Rack ─< Bin ─< Pallet ─< PalletItem >─ Product
                                │
                                ├─< StockMovement   (putaway / pick / move / adjustment log)
                                └─< AuditTask >─ AuditPlan
```

- **Bin** is the audit unit. It carries the current `riskScore`, the `scoreFactors` JSON
  breakdown (so the UI can answer "why" without recomputing), and `lastAuditedAt` /
  `lastScoredAt`.
- **StockMovement** is the activity log scoring reads from. A `MOVE` writes **two** rows - one at
  the origin bin, one at the destination - so per-bin aggregation stays a simple `WHERE binId = X`
  instead of an `OR` across two columns.
- **AuditTask** is 1:1 with a count result (no separate "audit record" table): it starts
  `PENDING` with an `expectedQuantity` snapshot, and the count flow fills in `countedQuantity` /
  `result` / `completedAt` and flips it to `DONE`. `planId` is nullable - a task either belongs to
  a generated `AuditPlan` (Top-N flow) or stands alone (ad-hoc "scan a bin and count it" flow).

Full field list: [`src/prisma/contract.prisma`](src/prisma/contract.prisma).

## Scoring model

Every bin gets a 0–100 **risk score** = a weighted sum of five 0–100 factors. Weights and the
30-day activity window live in [`src/scoring/scoring.constants.ts`](src/scoring/scoring.constants.ts):

| Factor                  | Weight | What it measures                                                                                                               | Normalization                                                             |
| ----------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Days since last audit   | 30%    | Staleness - a bin nobody has checked in a while is a blind spot. Never-audited bins fall back to days-since-created.           | Capped linear: `min(100, days / 60 * 100)` - 60+ days is maximally stale. |
| Movement frequency      | 25%    | Putaways + picks + moves in the last 30 days. More handling = more chances for a miscount.                                     | Min-max across the current bin set.                                       |
| Adjustment frequency    | 25%    | Manual inventory adjustments in the last 30 days - a direct signal that counts have been wrong before.                         | Min-max across the current bin set.                                       |
| Audit fail rate         | 15%    | % of this bin's past completed audits that were marked FAIL. 0 when the bin has no audit history yet (no evidence either way). | Already a 0–100 percentage.                                               |
| Product (SKU) diversity | 5%     | Distinct products currently stored in the bin. More SKUs sharing a slot raises mispick/miscount risk.                          | Min-max across the current bin set.                                       |

`score = round(Σ normalized[factor] × weight[factor])`, clamped to `[0, 100]`.

**Why min-max instead of a fixed scale for activity/diversity:** absolute movement counts don't
mean anything on their own (a 50-bin warehouse and a 500-bin warehouse have very different
"busy"), so those three factors are scaled relative to _this_ bin set's own current min/max. Days-
since-audit and audit-fail-rate are naturally bounded (a calendar day count and a percentage), so
they use a fixed cap / no scaling. If every bin ties on a min-max factor, it contributes 0 for
everyone - there's no signal to rank on.

**Recompute is always whole-warehouse.** Because three of the five factors are normalized
relative to the batch, recomputing a single bin in isolation would make it read against a stale
min/max. `POST /api/scoring/recompute` and the count flow's auto-recompute both
recompute every bin; at MVP scale (tens of bins) this is cheap. The breakdown persisted on each
bin (`scoreFactors`) records each factor's raw value, normalized value, weight, and contribution,
plus `computedAt` - that's the "why" the bin detail view renders.

Heatmap color bands (`src/common/risk-band.ts`): **< 34 green (low)**, **34–66 yellow (medium)**,
**≥ 67 red (high)**.

## API

All routes are prefixed `/api`.

| Method | Path                                | Purpose                                                                                                                                  |
| ------ | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/bins`                             | Heatmap data: every bin with its score, color band, and aisle/rack/warehouse grouping.                                                   |
| `GET`  | `/bins/:id`                         | Bin detail: score, factor breakdown, last audit date, pallets/products currently stored.                                                 |
| `GET`  | `/bins/search?q=`                   | Search bins by code (mobile count flow's "search or scan").                                                                              |
| `POST` | `/scoring/recompute`                | Recompute every bin's risk score.                                                                                                        |
| `POST` | `/audit-plans`                      | `{ topN, name? }` → creates a plan and one `PENDING` task per top-N riskiest bin.                                                        |
| `GET`  | `/audit-plans`                      | List plans with pending/done task counts.                                                                                                |
| `GET`  | `/audit-plans/:id`                  | Plan detail with its tasks.                                                                                                              |
| `GET`  | `/audit-tasks?status=PENDING\|DONE` | Table view of tasks.                                                                                                                     |
| `GET`  | `/audit-tasks/:id`                  | Task detail for the count page (bin, expected pallets/products).                                                                         |
| `GET`  | `/audit-tasks/by-bin/:binId`        | Entry point for search-and-count: returns the bin's pending task, or creates an ad-hoc one.                                              |
| `POST` | `/audit-tasks/:id/count`            | `{ countedQuantity, result: 'PASS'\|'FAIL', notes? }` → completes the task, stamps `Bin.lastAuditedAt`, triggers a full score recompute. |

## API documentation

Interactive OpenAPI docs are served at **`/docs`** (not under the `/api` prefix), protected by
HTTP Basic Auth - the browser's native username/password prompt (`challenge: true`), not a query
param or header trick. Credentials come from `.env`:

```bash
SWAGGER_USER=admin
SWAGGER_PASSWORD=sccs-dev-2026
```

- Both must be set to access `/docs` at all outside local development.
- If either is missing and `NODE_ENV` is **not** `production`, the app falls back to
  `admin` / `admin` and logs a warning on startup - convenient for a fresh clone, not something to
  rely on beyond local dev.
- If either is missing and `NODE_ENV` **is** `production`, the app refuses to start
  (`SWAGGER_USER and SWAGGER_PASSWORD must be set to expose API docs outside development.`) rather
  than silently exposing the docs with default credentials.
- The raw OpenAPI document (same auth) is at `/docs-json`.

## Logging

- **`LoggingInterceptor`** (global) logs every completed request: method, path, status code, and
  latency in ms.
- **`HttpExceptionFilter`** (global) catches every thrown error - Nest `HttpException`s and
  anything unexpected - normalizes it into one JSON error body (`statusCode`, `message`, `path`,
  `timestamp`), and logs it: **5xx at `error` level with a stack trace**, **4xx at `warn` level**.
  This is also what turns an unhandled bug into a 500 instead of crashing the process or leaking a
  stack trace to the client.
- Services log the business events that matter for support/debugging - audit plan creation, a
  completed count (with its result), an ad-hoc audit being opened, and every score recompute
  (bin count) - via NestJS's `Logger`, scoped per class.

## Testing

Two suites, both real (no mocked database - Prisma 8's fluent query builder is not something worth
hand-mocking; these hit the actual configured Postgres database):

- **Unit tests** (`*.spec.ts`, `npm test`): pure logic with no I/O - the scoring algorithm
  (`scoreBins`), risk-band thresholds, the Swagger credential resolution, and the exception
  filter / logging interceptor exercised against hand-built mock requests.
- **E2E tests** (`*.e2e-spec.ts`, `npm run test:e2e`): boot the full Nest app (same pipes, filters,
  interceptors, and Swagger setup as production - see `src/setup-app.ts`) and hit every endpoint
  through `supertest`, including validation failures, 404s, the full count-flow lifecycle, and the
  `/docs` auth gate.
  - Each e2e file creates its **own uniquely-coded warehouse** (`test/utils/fixtures.ts`) so tests
    never collide with each other or with the seeded demo data, and tears it down in `afterAll`.
  - E2E files run **sequentially, not in parallel** (`fileParallelism: false` in
    `vitest.config.e2e.ts`): scoring recompute touches every bin row in the database, so two
    suites racing in parallel could deadlock against each other.

Run `npm run test:cov` for combined coverage (`vitest.config.coverage.ts`) - thresholds are set to
**90% lines/statements/functions/branches** and the command fails the build if any drop below
that. `main.ts` (bootstrap entry) and `src/scripts/**` (the seed script) are excluded from the
coverage target - one is a thin `app.listen()` call, the other is a data-generation CLI tool, not
API surface.

## Deploying to Vercel

`src/main.ts` supports two run modes from the same file:

- **Local dev / a traditional host (Railway, a VM, etc.):** the module-level `bootstrap().then(app
  => app.listen(...))` call runs as normal, binding a real port.
- **Vercel:** the same file's `export default async function handler(req, res)` reuses a
  module-scoped cached Nest app (`let app`, built once, reused on every warm invocation) and
  forwards the request straight to Express via `app.getHttpAdapter().getInstance()` - no
  `app.listen()` involved, since Vercel owns the actual HTTP server.

[`api/index.ts`](api/index.ts) just re-exports that handler, and [`vercel.json`](vercel.json)
rewrites every path to it, so `/api/*` and `/docs` both reach the one function and Nest's own
routing takes it from there. Prisma 8's `@prisma/orm-postgres` has no native binary/WASM engine -
it talks to Postgres over the plain `pg` driver - so there's nothing bundler-unfriendly to work
around.

1. **Import the repo, set the Root Directory to `back-end`.** This is a two-app monorepo; the
   front-end needs its own separate Vercel project with its Root Directory set to `front-end`.
2. **Set environment variables** in the Vercel project (Settings → Environment Variables):
   - `DATABASE_URL` - **use a pooled connection string**, not a direct one. A serverless function
     can scale to many concurrent instances, each opening its own connection; an unpooled URL
     exhausts Postgres's connection limit fast. For Supabase, that's the
     `...pooler.supabase.com:6543` URL with `?pgbouncer=true` (see the Supabase note above).
   - `SWAGGER_USER`, `SWAGGER_PASSWORD` - **required**, not optional, on Vercel. Vercel builds set
     `NODE_ENV=production`, and `resolveSwaggerCredentials` (see _API documentation_ above)
     deliberately refuses to start the app at all if these are missing in production - so a
     deploy without them fails on every request, not just `/docs`.
   - Don't set `PORT` - it's only used by the local-dev/traditional-host branch above.
3. **Point the front-end at it.** Once deployed, set the front-end's `API_URL` (its own Vercel
   project's env vars) to `https://<this-project>.vercel.app/api` - the same `/api` prefix used
   locally, nothing else changes on the front-end side.

`.vercelignore` excludes dev-only tooling (agent skill folders, `test/`, `coverage/`) from the
deployed function so it stays well under Vercel's 250 MB function size limit.

## Notable implementation choices / possible next steps

- **Ad-hoc audits.** `AuditTask.planId` is nullable so the mobile count flow works for _any_
  scanned bin, not just ones already on a generated plan - `GET /audit-tasks/by-bin/:binId`
  reuses an existing pending task or opens a new standalone one.
- **`scoreFactors` as JSON**, not a normalized factors table - it's write-once-per-recompute,
  read-only for display, and never queried by individual factor value, so a flexible JSON blob
  avoided a five-column table with no query benefit.
- **Not implemented (flagged, not silently skipped):** auth/authz on the API itself - every
  `/api/*` endpoint is open (only the `/docs` UI is credentialed); fine for a take-home, not for
  production. Also: pagination on `/bins` and `/audit-tasks` (fine at MVP scale, would matter past
  a few hundred bins), and WebSocket/polling for live heatmap updates after another user's
  recompute (the front-end currently has to re-fetch).
