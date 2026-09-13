# SCCS Frontend - Smart Cycle Count Scoring

Next.js (App Router) dashboard for the SCCS backend: a warehouse bin risk heatmap, audit plan
creation, a task table, and a mobile-friendly bin count flow.

## Tech stack

- **Next.js 16** (App Router, Turbopack, React 19), TypeScript.
- **Tailwind CSS v4** + **shadcn/ui** (Radix primitives) for components.
- **TanStack Query v5** for client-side data/cache management, with server-rendered initial data
  hydrated into the client cache (see _SSR_ below).
- **lucide-react** for icons.
- **Recharts** (via shadcn's `chart` component) for the bin score factor breakdown.
- **`@t3-oss/env-nextjs` + Zod** for typed, validated environment variables (T3-style) - see
  [`src/env.ts`](src/env.ts).

## Setup

```bash
npm install
cp .env.example .env.local
# edit .env.local - set NEXT_PUBLIC_API_URL to your running backend, e.g.:
# NEXT_PUBLIC_API_URL="http://localhost:8080/api"

npm run dev
```

Requires the [`back-end`](../back-end) API running and reachable at `NEXT_PUBLIC_API_URL` (seed it
first - see `back-end/README.md` - so the heatmap has data to show).

### Environment validation

`src/env.ts` defines the env schema with Zod and validates it via `createEnv` at both build time
(imported at the top of `next.config.ts`, so a missing/invalid `NEXT_PUBLIC_API_URL` fails the
build immediately with a clear message) and import time in the app. There's no fallback URL -
if it's unset, you find out before the app silently fails to fetch anything.

## Pages

| Route               | Purpose                                                                                                                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                 | Heatmap dashboard: every bin colored by risk band, grouped by aisle/rack. Click a bin for its score breakdown, last audit date, and current pallets. "Recompute scores" and "Generate audit plan" actions. |
| `/audit-plans`      | List of generated audit plans with pending/done counts.                                                                                                                                                    |
| `/audit-plans/[id]` | Plan detail: every task in the plan, with a shortcut into the count flow for pending ones.                                                                                                                 |
| `/audit-tasks`      | All audit tasks, filterable by status (`?status=PENDING\|DONE`, URL-synced).                                                                                                                               |
| `/audit-tasks/[id]` | Task detail - the canonical count UI: expected pallets, and either the count form (pending) or the recorded result (done).                                                                                 |
| `/count`            | Mobile-first search/scan entry point: search bins by code, tap one to start auditing it.                                                                                                                   |
| `/count/[binId]`    | Resolver-only route - opens (or reuses) the bin's pending task via the backend's `by-bin` endpoint, then redirects to `/audit-tasks/[id]`. Keeps one count form instead of two.                            |

## Connecting to the backend

All requests go through [`src/lib/api/client.ts`](src/lib/api/client.ts)'s `apiFetch`, which:

- Builds the full URL from `env.NEXT_PUBLIC_API_URL` - works identically from Server Components
  (SSR) and the browser, since `NEXT_PUBLIC_*` vars are available in both.
- Throws a typed `ApiError` (with `.status`, `.isNotFound`, `.isUnreachable`) for any non-2xx
  response or network failure, parsed from the backend's `{ statusCode, message, path, timestamp }`
  error body.
- Always sends `cache: "no-store"` - Next's fetch cache would only add a second, competing cache on
  top of TanStack Query's; the backend is the source of truth and mutations (recompute, count
  submit) must be reflected immediately.

Per-resource modules ([`src/lib/api/bins.ts`](src/lib/api/bins.ts), `audit-plans.ts`,
`audit-tasks.ts`, `scoring.ts`) export plain fetch functions plus `queryOptions()` factories
(query key + query function bundled together), so a Server Component and a Client Component
reading the same resource always use the same TanStack Query cache identity.

## SSR

Every route that reads live backend data does so with a blocking `await` in a Server Component -
real HTML on the first response, not a client-side spinner. That data seeds a `QueryClient` via
[`src/lib/hydration.tsx`](src/lib/hydration.tsx)'s `<Hydrate>` helper (`setQueryData` +
`dehydrate()` + `<HydrationBoundary>`), so the Client Component that renders the interactive view
picks it up instantly via `useQuery` with the same query key - no loading flash on first paint,
and normal client-side refetching/mutation afterward. This follows the pattern in Next.js's own
[TanStack Query guide](https://nextjs.org/docs/app/guides/client-side-data-fetching/tanstack-query).

Every data-fetching page sets `export const dynamic = "force-dynamic"` - this data is live and
mutated by explicit user actions (recompute, count submit), so it's never statically prerendered
or cached at the Next.js layer.

**Not using Suspense-based streaming.** The blocking-await + `<Hydrate>` pattern above was chosen
over the alternative "prefetch without awaiting + stream under `<Suspense>`" pattern for one
concrete reason: a route wrapped in `loading.js` (which Suspense-streaming requires) starts
streaming its response as `200` before a `notFound()` call inside it can run, so the real HTTP
status can never become `404` - [Next.js's own docs say so explicitly](https://nextjs.org/docs/app/api-reference/functions/not-found#calling-notfound-after-streaming-has-started).
Since `/audit-tasks/[id]`, `/audit-plans/[id]`, and `/count/[binId]` all have a genuine not-found
case, none of their ancestor segments has a `loading.js` - confirmed by curl against a production
build that all three actually return `404`, not a `200` with a not-found-shaped body. The tradeoff
is no instant loading skeleton on those routes; against a local backend that's a non-issue.

## Error handling

- **`error.tsx`** (root) + [`src/components/api-error-state.tsx`](src/components/api-error-state.tsx)
  catch anything an `await` in a Server Component throws, and render a distinct message for
  "backend unreachable" (`ApiError.isUnreachable`) vs. any other failure, with a retry button.
- **`not-found.tsx`** (root) renders for `notFound()` calls (bin/plan/task that doesn't exist) -
  triggered explicitly in each `[id]` page when the backend returns 404, converting the backend's
  JSON 404 into a real Next.js 404 page and status code (see _SSR_ above for why that requires
  those routes to skip Suspense streaming).
- **Client-side mutations** (recompute, create plan, submit count) surface failures as toasts
  (`sonner`) rather than crashing the page - the form/button stays usable and the user can retry.
- **Client-side reads that aren't SSR-seeded** (bin detail sheet, bin search) render an inline
  `Alert` on error instead of throwing into the nearest error boundary, since a failed drawer
  fetch shouldn't take down the page behind it.

## Mobile responsiveness

Every page is built mobile-first with Tailwind's responsive utilities: the heatmap grid reflows
via `auto-fill` instead of a fixed column count, the site nav collapses into a `Sheet` menu below
the `md` breakpoint, tables that need a header row (audit plan tasks) switch to a stacked-card
layout below `sm`, and the count form uses large touch targets (14-unit-tall quantity input,
two-button PASS/FAIL toggle) since it's the flow most likely to be used on a phone in a warehouse
aisle.

## Design notes

- **Risk color coding** uses a validated status palette (good/warning/critical), always paired
  with an icon and a text label - colorblind-safe and never relies on hue alone. See
  [`src/lib/risk-band.ts`](src/lib/risk-band.ts).
- **The score factor chart** (bin detail) is a single-hue horizontal bar chart, not a multi-color
  one - the five factors are components of one score, not distinct series, so color doesn't carry
  identity there; the axis labels do.

## Scripts

| Command         | What it does                |
| --------------- | --------------------------- |
| `npm run dev`   | Dev server (Turbopack).     |
| `npm run build` | Production build.           |
| `npm run start` | Serve the production build. |
| `npm run lint`  | ESLint.                     |
