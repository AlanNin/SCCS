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

## Gotcha: `NEXT_PUBLIC_*` env vars break the app on any device but the dev machine

The client bundle bakes in whatever `NEXT_PUBLIC_*` values it was built with. Early on this app
had `NEXT_PUBLIC_API_URL=http://localhost:8080/api` - worked fine from the dev machine's own
browser, and **silently failed every client-side fetch when the app was opened from a phone** on
the same network (Next's own printed "Network" URL, e.g. `http://10.0.0.15:3000`). "localhost" on
the phone means the phone, not the dev machine - there's no backend there.

**Fix in place:** `API_URL` is server-only now (no `NEXT_PUBLIC_` prefix, see `src/env.ts`).
`apiFetch` (`src/lib/api/client.ts`) picks the base URL by execution context:

```ts
function resolveBaseUrl(): string {
  return typeof window === "undefined" ? env.API_URL : "/api";
}
```

Server Components fetch `API_URL` directly. The browser always fetches this Next server's own
origin at `/api`, which `next.config.ts`'s `rewrites()` proxies server-side to `API_URL` - so the
browser only ever needs an address it's already proven reachable (the one serving the page),
regardless of which device it's on. **Any new env var that a Client Component reads directly
(not just this one) has the same failure mode** - before adding a `NEXT_PUBLIC_` var, ask whether
it actually needs to reach the browser, or whether it should stay server-only and go through a
route/rewrite like this one instead.

## Gotcha: Radix `ScrollArea` can silently clip content with no way to scroll to it

Don't use `@/components/ui/scroll-area`'s `ScrollArea` for a scrollable region inside a `Sheet` (or
anything else `position: fixed` + animated). Its viewport (`@radix-ui/react-scroll-area`) sets:

```js
overflowY: context.scrollbarYEnabled ? "scroll" : "hidden";
```

`scrollbarYEnabled` comes from Radix's own resize-observer measuring whether a scrollbar is
needed - a JS step with no guarantee it resolves correctly inside a `fixed`-positioned, animating
panel. When it doesn't, `overflow-y` sits at `hidden` forever: content taller than the panel is
just clipped, with nothing wrong visible in markup or a quick "is the container sized right?"
check. This took two rounds to actually find (the first-round fix - correct `flex-1 min-h-0`
sizing on the `ScrollArea` - was real but insufficient, because the container was sized right and
it was still clipping; the actual cause was this conditional `overflow-y`, one level deeper, inside
Radix's own Viewport implementation).

**Fix in place:** `bin-detail-sheet.tsx` uses a plain `<div className="min-h-0 flex-1
overflow-y-auto overscroll-contain">` instead of `ScrollArea`. Native overflow has no JS
measurement step - content taller than the container scrolls, unconditionally. Reach for this
first for any new scrollable region; only reach for Radix `ScrollArea` (custom scrollbar styling)
somewhere that isn't `fixed`-positioned and animated, and verify it against a real narrow/mobile
viewport before trusting it.

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
`next.config.ts` imports `env` from it at the top (both for the validation side-effect and to read
`env.API_URL` for the rewrite target) - so a missing/invalid env var fails `next build` /
`next dev` immediately with a readable message, before anything tries to fetch with a broken URL.
Add new env vars to the `server` or `client` block and to `runtimeEnv` - `createEnv` will refuse to
read `process.env` directly for anything not listed there. Default to `server` unless a Client
Component genuinely needs the value directly (see the `NEXT_PUBLIC_*` gotcha above) - `client` vars
need the `NEXT_PUBLIC_` prefix and end up in the browser bundle.

## Risk-band colors

`src/lib/risk-band.ts` maps `low`/`medium`/`high` to a validated colorblind-safe status palette
(good/warning/critical hexes), always paired with a lucide icon and a text label - never color
alone. If you add a new risk-adjacent color (e.g. a 4th band, a trend indicator), pull the value
from the same status-palette source rather than picking a new hex by eye - load the `dataviz`
skill first if one is available in your environment.

## Connecting to the backend

- `API_URL` (see `.env.example`) must include the `/api` prefix the backend uses. Server-only -
  see the `NEXT_PUBLIC_*` gotcha above for why, and `resolveBaseUrl()` in
  `src/lib/api/client.ts` / `rewrites()` in `next.config.ts` for the two call sites that use it.
- Because the browser goes through Next's own rewrite proxy (same-origin), backend CORS
  configuration doesn't matter for browser calls anymore - only for anything hitting the backend
  directly (curl, the CLI, another service).
- Backend error responses are `{ statusCode, message, path, timestamp }`; `ApiError` (`src/lib/api/client.ts`)
  parses that shape. `ApiError.isNotFound` / `.isUnreachable` are what `notFound()` calls and the
  error UI branch on - don't re-parse the body ad hoc elsewhere.
