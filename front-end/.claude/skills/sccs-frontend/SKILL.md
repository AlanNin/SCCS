---
name: sccs-frontend
description: >-
  Use when working in the SCCS front-end (Next.js 16 App Router + TypeScript,
  in `front-end/`): adding or editing a page/route, fetching data from the
  back-end API, adding a shadcn component, working with TanStack Query,
  touching `loading.tsx` / `not-found.tsx` / `error.tsx`, editing
  `src/env.ts` or environment variables, or anything about the heatmap's
  risk-band colors. Also use when a route that should 404 is returning 200,
  or when Next.js version-specific behavior (params/searchParams as
  Promises, `force-dynamic`, Turbopack) is in question - this skill records
  what was actually verified against Next.js 16.3.5, not general Next.js
  knowledge, which may be stale for this major version.
metadata:
  project: "SCCS front-end"
  framework: "next@16.3.5"
  version: "2026-09-13"
---

# SCCS Frontend

> This project is on Next.js 16 (App Router, Turbopack, React 19). Several
> App Router conventions changed in this major version - `params` and
> `searchParams` are Promises now, `next lint` is gone, Turbopack is the
> default bundler. If something here conflicts with what you remember about
> Next.js, trust this file and `node_modules/next/dist/docs/` over training
> data.

## Stack at a glance

- **Next.js 16** App Router, TypeScript, Turbopack (default for both `dev` and `build`).
- **Tailwind CSS v4** - no `tailwind.config.js`; theme lives in `styles/globals.css` via `@theme inline`.
- **shadcn/ui** (Radix base, "nova" preset) - components in `src/components/ui/`.
- **TanStack Query v5** for client-side cache; server-rendered initial data hydrates into it.
- **`@t3-oss/env-nextjs` + Zod** for env validation - `src/env.ts`.
- **Recharts** (via shadcn's `chart` component) for the one chart in the app (bin score breakdown).

## Where things live

```
front-end/
├── public/               ← static assets, including favicon.ico
├── styles/globals.css    ← Tailwind + shadcn theme (NOT under src/ - moved deliberately)
├── src/
│   ├── app/               ← routes (App Router)
│   ├── components/
│   │   ├── ui/            ← shadcn-generated, don't hand-edit - re-run `npx shadcn add <name>`
│   │   ├── bins/, audit-plans/, audit-tasks/, layout/
│   │   └── providers.tsx  ← TanStack QueryClientProvider
│   ├── lib/
│   │   ├── api/           ← one module per backend resource: fetch fn + `queryOptions()` factory
│   │   ├── hydration.tsx  ← <Hydrate> - seeds QueryClient server-side, dehydrates for the client
│   │   ├── risk-band.ts   ← color/icon/label per risk band (low/medium/high)
│   │   └── format.ts      ← date formatting (see gotcha below)
│   ├── types/api.ts       ← hand-written types mirroring the backend's response shapes
│   └── env.ts             ← T3-style env schema
└── components.json        ← shadcn config; `css` points at `styles/globals.css`
```

`globals.css` and `favicon.ico` are **not** in their create-next-app defaults (`src/app/`) - they
were moved to `styles/` and `public/` respectively. If you regenerate either file (e.g. via a
shadcn command that rewrites `globals.css`), it may land back at the default path - check
`components.json`'s `css` field still points at `styles/globals.css` afterward, and that
`src/app/layout.tsx` still imports `../../styles/globals.css`.

## The SSR + TanStack Query pattern

Every route that reads live backend data follows this shape (see `src/app/page.tsx` for the
canonical example):

```tsx
// app/some-route/page.tsx - Server Component
export const dynamic = "force-dynamic"; // required - see below

export default async function Page() {
  const data = await getSomething(); // plain fetch, awaited - real SSR, not a spinner
  return (
    <Hydrate queryKey={somethingKeys.list()} data={data}>
      <SomeClientView />{" "}
      {/* reads the same key via useQuery(somethingOptions()) */}
    </Hydrate>
  );
}
```

- **`export const dynamic = "force-dynamic"` is required on every page that fetches backend data.**
  Without it, `next build` tries to statically prerender the page at build time, which means it
  calls the backend API _during the build_ - if the backend isn't reachable at build time (e.g. a
  clean CI build), the build fails hard. This bit us during initial development.
- Query key + query function live together in `src/lib/api/<resource>.ts` as a `queryOptions()`
  export, so the server prefetch and the client `useQuery` can never drift apart on the key.
- `apiFetch` (`src/lib/api/client.ts`) always sends `cache: "no-store"` - Next's own fetch cache
  would just be a second, competing cache on top of TanStack Query's, with no benefit.

## Gotcha: `loading.tsx` breaks real 404 status codes

**If a route calls `notFound()`, no ancestor route segment may have a `loading.tsx`.** This is not
specific to our code - it's documented Next.js behavior
(`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/not-found.md`, "Calling
notFound() after streaming has started") but easy to trip over because the breakage is silent: no
error, no warning, the not-found UI renders correctly, and only the HTTP status is wrong (200
instead of 404).

**Why:** `loading.tsx` on a segment auto-wraps that segment's `page.tsx` _and every route nested
under it_ in a `<Suspense>` boundary (confirmed both by the doc and by testing: removing a
`loading.tsx` two folders above the actual `[id]/page.tsx` fixed the status code). Once a
Suspense-wrapped response starts streaming, the status header is already committed as 200 - a
`notFound()` thrown later can still swap in the not-found UI, but can't change the status anymore.

**Current state in this repo:** `/audit-tasks/[id]`, `/audit-plans/[id]`, and `/count/[binId]` all
call `notFound()`, so **none of their ancestor segments (including the app root) has a
`loading.tsx`.** If you add a `loading.tsx` anywhere above one of these routes, or add a new route
with a real not-found case, verify the status code against a **production build** (`npm run build
&& npm run start`, not `next dev`) with something like:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/audit-tasks/999999999   # must print 404
```

If you want loading skeletons back on a route with a notFound() path, the fix is scoping the
Suspense boundary away from the `[id]` child - e.g. a route group with its own `layout.tsx` for
the list page, not a shared ancestor segment - not just "add loading.tsx and hope."

## Gotcha: backend timestamp strings need normalizing before `new Date()`

The backend returns Postgres `timestamptz` columns as strings like
`"2026-09-12 17:21:38.981173+00"` - space-separated, **microsecond** precision (6 fractional
digits, not JS's 3), and a bare two-digit UTC offset. None of that parses with a plain `new
Date(value)` (silently gives `Invalid Date`, which then throws inside
`Intl.DateTimeFormat.format()`). Always go through `toDate()` in `src/lib/format.ts`, which
normalizes to strict ISO 8601 first. If you add a new date-formatting helper, reuse `toDate()`
rather than calling `new Date()` on a raw backend string directly.

## Env validation

`src/env.ts` defines the schema with Zod and validates via `@t3-oss/env-nextjs`'s `createEnv`.
`next.config.ts` imports `./src/env` at the top purely for its validation side-effect - so a
missing/invalid env var fails `next build` / `next dev` immediately with a readable message,
before anything tries to fetch with a broken URL. Add new env vars to the `server` or `client`
block (client vars need the `NEXT_PUBLIC_` prefix) and to `runtimeEnv` - `createEnv` will refuse
to read `process.env` directly for anything not listed there.

## Risk-band colors

`src/lib/risk-band.ts` maps `low`/`medium`/`high` to a validated colorblind-safe status palette
(good/warning/critical hexes), always paired with a lucide icon and a text label - never color
alone. If you add a new risk-adjacent color (e.g. a 4th band, a trend indicator), pull the value
from the same status-palette source rather than picking a new hex by eye - load the `dataviz`
skill first if one is available in your environment.

## Connecting to the backend

- `NEXT_PUBLIC_API_URL` (see `.env.example`) must include the `/api` prefix the backend uses.
- The backend has CORS enabled globally (`app.enableCors()`) and no auth on its API routes (only
  its Swagger UI is credentialed) - `apiFetch` calls it directly from both the server and the
  browser with no extra headers.
- Backend error responses are `{ statusCode, message, path, timestamp }`; `ApiError` (`src/lib/api/client.ts`)
  parses that shape. `ApiError.isNotFound` / `.isUnreachable` are what `notFound()` calls and the
  error UI branch on - don't re-parse the body ad hoc elsewhere.
