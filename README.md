# WideAngle

A **read-only, public blog frontend** for content managed in
[Calliope](https://github.com/Timonics/calliope).

Calliope owns content and publication. WideAngle owns presentation:
it reads published articles over an unauthenticated API and renders
them as fast, crawlable, accessible HTML.

There is no dashboard here. No editor, no login, no preview, no
publishing controls, and no second content database. The whole
application is public pages.

---

## What it does

| Route | Purpose |
|---|---|
| `/` | Publication intro + latest articles |
| `/articles` | Paginated archive |
| `/articles/[slug]` | Article detail (server-rendered) |
| `/categories/[slug]` | Category listing, paginated |
| `/about` | Publication purpose + sole author |
| `/contact` | Contact address |
| `/editorial-policy` | Sourcing, corrections, AI-assistance policy |
| `/privacy` | Actual data practices |
| `/terms` | Terms of use |
| `/sitemap.xml` | Canonical, indexable URL inventory |
| `/robots.txt` | Crawl rules + sitemap pointer |
| `/feed.xml` | RSS 2.0 feed of published articles |

Every page is server-rendered. Article text is in the initial HTML —
no client-side fetching, no loading spinner for a crawler to see.

---

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19**
- **TypeScript** strict
- **Tailwind CSS 4** (no UI framework, no component library)
- **Zod 4** for upstream response validation
- **Vitest** for unit tests

No database, no ORM, no auth library, no CMS client SDK.

---

## Quick start

```bash
npm install
cp .env.example .env.local      # then edit the values
npm run dev                      # http://localhost:3000
```

The upstream Calliope service must be reachable and the blog id in
`WIDEANGLE_CALLIOPE_BLOG_ID` must be a blog with published articles.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tests (Vitest) |
| `npm run test:coverage` | Unit tests + coverage over `src/lib/**` |

---

## Configuration

Every variable is server-side. **None of them are exposed to the
browser** — there is no `NEXT_PUBLIC_` prefix anywhere in this project,
and the adapter is imported only from Server Components.

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `WIDEANGLE_CANONICAL_ORIGIN` | **yes** | — | Public origin. No trailing slash, no path. |
| `WIDEANGLE_CALLIOPE_BLOG_ID` | **yes** | — | Blog UUID to read. |
| `WIDEANGLE_CALLIOPE_BASE_URL` | no | `http://localhost:3002` | Calliope base URL. |
| `WIDEANGLE_PUBLICATION_NAME` | no | `WideAngle` | Site name. |
| `WIDEANGLE_PUBLICATION_DESCRIPTION` | no | *(see below)* | Site description. |
| `WIDEANGLE_LOCALE` | no | `en` | `<html lang>` + feed language. |
| `WIDEANGLE_CONTENT_REVALIDATE_SECONDS` | no | `300` | Freshness / withdrawal window. |
| `WIDEANGLE_CALLIOPE_TIMEOUT_MS` | no | `5000` | Per-request upstream timeout. |
| `WIDEANGLE_CONTACT_EMAIL` | no | `hello@example.com` | Contact address. |
| `WIDEANGLE_PUBLICATION_ID` | no | — | Future publication UUID. |
| `WIDEANGLE_CALLIOPE_SUPPORTS_PUBLICATION_SCOPE` | no | `false` | Send the scope parameter. |
| `WIDEANGLE_IMAGE_HOSTS` | no | *(empty)* | Reserved for image-host allowlisting. |
| `WIDEANGLE_ALLOW_LOCAL_ORIGIN` | no | `false` | **Local builds only.** Allows a localhost canonical origin. Never set in a deployment. |

### The production-origin guard

`getConfig()` **refuses to boot** when `WIDEANGLE_CANONICAL_ORIGIN` is
a local origin and `NODE_ENV=production`. A `localhost` canonical URL
in production silently breaks indexing — every canonical, every
sitemap entry and every feed item would point at a development host.
This is a boot error, not a warning.

`next build` always runs with `NODE_ENV=production`, so a local
production build needs `WIDEANGLE_ALLOW_LOCAL_ORIGIN=true`. That
variable is deliberately explicit: disabling the guard is a deliberate
act, not an accident.

---

## Architecture

```
Reader
  -> CDN / hosting
  -> Next.js server (WideAngle)
  -> Read-only Calliope adapter
  -> Calliope
```

```
src/
├── app/                     routes + discovery files
│   ├── page.tsx             homepage
│   ├── articles/            archive + [slug]
│   ├── categories/[slug]/   category listings
│   ├── about|contact|privacy|terms|editorial-policy/
│   ├── sitemap.ts robots.ts feed.xml/route.ts
│   ├── layout.tsx           shell, nav, footer, root metadata
│   ├── error.tsx            5xx boundary (upstream failures)
│   └── not-found.tsx        genuine 404 boundary
├── components/
│   ├── ArticleBody.tsx      block renderer (no client JS)
│   └── ArticleCard.tsx      archive/homepage card
└── lib/
    ├── config.ts            validated env config
    ├── types.ts             frontend contracts
    ├── urls.ts              canonical URL construction
    ├── seo.ts               metadata + JSON-LD
    ├── errors.ts            failure classification
    ├── data.ts              cached data access
    ├── calliope/
    │   ├── client.ts        read-only HTTP client
    │   ├── schema.ts        zod validation of upstream payloads
    │   └── adapter.ts       upstream → frontend models
    └── render/
        └── safe.ts          URL allowlist + block field readers
```

### The adapter boundary

`src/lib/calliope/` is the only place that knows the upstream wire
format. Page components depend on `ArticleView` / `PageResult` and
never on Calliope's shape.

That is what makes the PRD's "migration should primarily change the
adapter and configuration, not templates" achievable — see
[`docs/CONTRACT.md`](docs/CONTRACT.md) §8 for the exact list.

### Read-only by construction

The Calliope client exposes **only** `GET`. There is no method on it
that can issue a `POST`, `PATCH` or `DELETE`, and WideAngle holds no
credential — so there is no code path that could mutate content even by
accident.

---

## Caching and freshness

| Layer | Behaviour |
|---|---|
| Next data cache | `unstable_cache` per read, `revalidate` = `WIDEANGLE_CONTENT_REVALIDATE_SECONDS` |
| Cache keys | Namespaced by publication scope + route identity (`scopeTag()`) |
| Negatives | A 404 is **not** cached — a later publish is visible immediately |
| Failures | An upstream error is **not** cached — it propagates to the error boundary |
| CDN | Owned by the hosting platform, not this app. See `docs/DEPLOYMENT.md`. |

Default freshness window: **5 minutes**. That is also the maximum
delay before a withdrawal disappears from the site.

---

## Security

- Upstream payloads are validated with Zod before they reach a page.
- Article bodies are rendered as **React elements**, never as HTML.
  There is no `dangerouslySetInnerHTML` in the content path, so no
  upstream string can become markup.
- URLs are checked against a protocol allowlist (`http:`, `https:`,
  `mailto:`) before they reach an `href`/`src`/`og:image`. A
  `javascript:` or `data:` URL is dropped, including from the social
  card meta tags.
- Unknown block types render as an inert, visible placeholder — never
  guessed at, never silently dropped.
- No secrets in the app: there are none to have.
- Security headers (`X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, `Permissions-Policy`) are set in `next.config.ts`.

---

## Documentation

| Document | Contents |
|---|---|
| [`docs/CONTRACT.md`](docs/CONTRACT.md) | The real Calliope contract, verified responses, capability gaps |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Deploy, rollback, cache headers, verification checklist |
| [`docs/KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md) | What this build does not do, and why |
| [`docs/ACCEPTANCE.md`](docs/ACCEPTANCE.md) | Every PRD acceptance criterion, with the evidence for each |

---

## Workspace context

| Service | Role |
|---|---|
| [calliope](https://github.com/Timonics/calliope) | Content API — owns articles, taxonomy, publication |
| **wideangle** (this repo) | Public read-only frontend |
| cerberus | Identity — *not used*, public reads need no token |
| charon | Payments — *not used* |
