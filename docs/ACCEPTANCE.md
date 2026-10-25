# Acceptance criteria — verification evidence

Every PRD §17 acceptance criterion, how it was verified, and what was
actually observed.

**Environment**: `wideangle` built with Next.js 16.4.3, running against a
live `calliope` instance (`c987724`) on `http://localhost:3002` with
`calliope-postgres` on `:5435`.

**Fixture**: five articles seeded directly into the Calliope database —
3 `PUBLISHED`, 1 `DRAFT`, 1 `ARCHIVED` — plus 1 author and 3 categories.
The draft and archived rows exist specifically so that leakage can be
tested rather than assumed.

---

## Summary

| ID | Criterion | Result | Verified by |
|---|---|---|---|
| AC-01 | Published content in HTML | **PASS** | live probe |
| AC-02 | No content-mutating requests | **PASS** | static scan + code review |
| AC-03 | No owner/editor/login/preview UI | **PASS** | route inventory |
| AC-04 | Unpublished slugs expose nothing | **PASS** | live probe, 6 surfaces |
| AC-05 | Metadata matches visible content | **PASS** | live probe + JSON-LD parse |
| AC-06 | Sitemap/RSS exclude drafts | **PASS** | live probe |
| AC-07 | Genuine missing → genuine missing | **PASS** | live probe |
| AC-08 | Timeouts do not become 404s | **PASS** | live probe, dead upstream |
| AC-09 | Withdrawals propagate in window | **PASS** | live withdrawal test |
| AC-10 | No secrets in bundles or logs | **PASS** | bundle scan |
| AC-11 | Unsafe content cannot execute | **PASS** | adversarial article |
| AC-12 | Keyboard + no-JS navigation | **PASS** | code review + markup check |
| AC-13 | No staging origins in prod metadata | **PASS** | boot-time guard + unit test |
| AC-14 | Publication scope via config+adapter | **PASS** | unit tests |
| AC-15 | Categories + pagination crawlable | **PASS** | live probe |
| AC-16 | Deployment and rollback documented | **PASS** | `docs/DEPLOYMENT.md` |

**Automated tests**: 54 passing across 4 files (`npm test`).

---

## AC-01 — Anonymous article requests return published main content in HTML

**PASS.** `GET /articles/why-we-rebuilt-the-content-api` → `200`,
27 791 bytes. The response contains, in the raw HTML:

```
Every content API eventually grows a second, unofficial API.
The leak
Public reads key by slug, never by id.
const article = await calliope.getBySlug(blogId, slug);
Michael Oderinde
On this page
```

The body is inside a real `<article>` element. There is no client-side
fetch and no loading spinner — the crawler sees the text.

## AC-02 — No action sends content-mutating requests to Calliope

**PASS.** Two independent checks:

1. Every `method:` literal in `src/lib/calliope/client.ts` (excluding
   comments) is `GET`. The client exposes no method that can issue a
   `POST`, `PATCH`, `PUT` or `DELETE`.
2. A scan of every `.ts`/`.tsx` file under `src/` finds **no**
   non-`GET` `fetch` anywhere.

Beyond that, WideAngle holds **no credential at all** — the public
routes need no token — so there is no code path that could mutate
content even by accident.

## AC-03 — No owner, editor, login, or preview UI is shipped

**PASS.** The complete route inventory is 17 files:

```
about/page.tsx                     articles/[slug]/error.tsx
articles/[slug]/page.tsx           articles/page.tsx
categories/[slug]/page.tsx         contact/page.tsx
editorial-policy/page.tsx          error.tsx
feed.xml/route.ts                  globals.css
layout.tsx                         not-found.tsx
page.tsx                           privacy/page.tsx
robots.ts                          sitemap.ts
terms/page.tsx
```

No path matches `admin`, `login`, `signin`, `signup`, `register`,
`dashboard`, `preview`, `settings`, `session`, or a create/edit
pattern. There is no `'use client'` component anywhere except the two
error boundaries (which need a "Try again" button).

## AC-04 — Unpublished identifiers/slugs do not expose content

**PASS.** Six surfaces checked for the draft slug, the archived slug,
and both bodies' secret markers:

| Surface | Result |
|---|---|
| `/` | clean |
| `/articles` | clean |
| `/sitemap.xml` | clean |
| `/feed.xml` | clean |
| `/categories/engineering` | clean |
| `/articles/<published-slug>` | clean |

Additionally, upstream behaviour was verified directly:

| Probe | Upstream response |
|---|---|
| draft slug | `404 article.not_found` |
| archived slug | `404 article.not_found` |
| published article's UUID | `404` (ids are not public identifiers) |
| `?status=DRAFT` | published articles only |
| `?include=related` | published related articles only |

A draft slug is indistinguishable from a slug that never existed.

## AC-05 — Metadata and structured data match visible content

**PASS.** Live `<title>`: `Why we rebuilt the content API — WideAngle`.
The visible `<h1>` is `Why we rebuilt the content API`. The
`meta description` is the article's own excerpt, which is also rendered
in the page body. The `BlogPosting` JSON-LD parses to:

```json
{
  "@type": "BlogPosting",
  "headline": "Why we rebuilt the content API",
  "datePublished": "2026-10-12T18:07:04.557Z",
  "author": { "@type": "Person", "name": "Michael Oderinde" },
  "publisher": { "@type": "Organization", "name": "WideAngle" },
  "articleSection": ["Engineering"],
  "keywords": "Postgres, TypeScript"
}
```

- `dateModified` is **absent** — the upstream publishes no
  modification timestamp, so none is invented
  ([`CONTRACT.md` §4 G1](CONTRACT.md#4-capability-gaps-real-verified)).
- `aggregateRating` / `rating` are **absent** — no fabricated ratings.
- The `WebPage` JSON-LD carries a 3-item `BreadcrumbList` that matches
  the visible breadcrumb.

## AC-06 — Sitemap/RSS exclude drafts, redirects, and inappropriate URLs

**PASS.** `sitemap.xml` contains 13 URLs: 7 static pages
(`/`, `/articles`, `/about`, `/editorial-policy`, `/privacy`, `/terms`,
`/contact`), 3 published articles, and 3 categories that actually
contain articles. No draft slug, no archived slug, no paginated
duplicate, no non-canonical variant.

`feed.xml` contains 3 items — exactly the 3 published articles — served
as `application/rss+xml; charset=utf-8`.

## AC-07 — Genuine missing articles return genuine missing responses

**PASS**, against a healthy upstream:

| Request | Status |
|---|---|
| `/articles/why-we-rebuilt-the-content-api` (published) | 200 |
| `/articles/caching-is-a-product-decision` (published) | 200 |
| `/articles/shipping-a-read-only-frontend` (published) | 200 |
| `/articles/definitely-not-a-real-slug` (unknown) | **404** |
| `/articles/unfinished-thoughts-on-cache-invalidation` (draft) | **404** |
| `/articles/deprecated-guide-to-webhook-retries` (archived) | **404** |
| `/categories/engineering` | 200 |
| `/categories/does-not-exist` | **404** |
| `/articles?page=999` (out of range) | 200 with an empty-state message |

## AC-08 — Calliope timeouts do not falsely become permanent 404s

**PASS.** Verified with the upstream pointed at a dead port
(`http://localhost:39999`, nothing listening), a fresh build and a
cold cache:

| Request | Status | Visible text |
|---|---|---|
| `/articles/why-we-rebuilt-the-content-api` | **500** | "Temporarily unavailable" |
| `/articles/shipping-a-read-only-frontend` | **500** | "Temporarily unavailable" |
| `/articles/definitely-not-real` | **500** | "Temporarily unavailable" |
| `/articles` | **500** | — |
| `/categories/engineering` | **500** | "Temporarily unavailable" |

**No 404 anywhere.** The error page renders `noindex, nofollow`, and
the public response contains **none** of: `localhost:39999`,
`ECONNREFUSED`, `UpstreamUnavailableError`, `node_modules`, or any
stack frame. Those appear in the server log only.

The build itself also fails loudly when the upstream is down, rather
than shipping a site with empty content:

```
⨯ Next.js build worker exited with code: 1
Error [UpstreamUnavailableError]: Calliope request failed: TypeError: fetch failed
```

## AC-09 — Changes and withdrawals propagate within the freshness window

**PASS — after fixing a real bug this test uncovered.**

**The bug**: Next's data cache serves the STALE value when a background
revalidation *throws*. Representing "article withdrawn" by throwing
therefore kept the stale, still-published copy live indefinitely — the
withdrawn article stayed on the site while the archive and sitemap
(which succeed, merely returning fewer rows) had already dropped it.
The site contradicted itself, forever.

**The fix**: `getArticle()` caches the negative result as a **value**
(`null`), not as a thrown error. A successful revalidation writes "not
found" into the cache; the next request reads it and renders a genuine
404. Transport failures are still thrown, so a timeout can never become
a 404.

**Re-test**, with `WIDEANGLE_CONTENT_REVALIDATE_SECONDS=5`:

```
 elapsed   article   archive   sitemap    feed
     4s       200      True     False   False
     8s       404     False     False   False

PASS — withdrawal propagated everywhere within 8s.
```

The withdrawn article is 404 and is gone from the archive, the sitemap
and the feed. With the production default of 300 s, the same behaviour
applies within 5 minutes.

## AC-10 — No service secrets appear in browser bundles or public logs

**PASS.** All 9 client JS chunks referenced by an article page were
fetched and scanned for `WIDEANGLE_CALLIOPE`, `calliope-postgres`,
`postgres://`, `Bearer `, `CERBERUS` and `secret`. **Zero hits.**

There is also no `NEXT_PUBLIC_` variable anywhere in the project, so
there is no mechanism by which a server-side value could reach the
browser.

## AC-11 — Unsafe article content cannot execute scripts

**PASS.** A deliberately adversarial article was published upstream
containing:

- `<script>window.__PWNED__=1;document.title="HACKED"</script>`
- `<img src=x onerror="window.__PWNED__=1">`
- `<a href="javascript:window.__PWNED__=1">click</a>`
- `<iframe src="https://evil.example.com"></iframe>`
- `<svg onload=alert(1)>`
- an `image` block with `url: "javascript:alert(1)"`
- a `coverImageUrl` of `javascript:alert(1)`

**Result — the body:**

| Pattern | Count in an attribute position |
|---|---|
| `content="javascript:` | **0** |
| `src="javascript:` | **0** |
| `href="javascript:` | **0** |
| `content="data:` / `src="data:` | **0** |
| `<iframe` | **0** |
| `<svg` | **0** |

The payloads appear only as inert escaped text (`&lt;script&gt;`),
because the renderer emits React elements and never interprets an
upstream string as markup.

**A real bug this test caught**: the `coverImageUrl` was reaching the
`og:image` and `twitter:image` meta tags unvalidated, so a
`javascript:` URL was emitted into a `<meta content="...">` attribute —
where some crawlers and scrapers will execute it. Fixed by routing the
hero image and the social image through the same `safeUrl()` allowlist
the body renderer uses. After the fix:

```
og:image     = (ABSENT - unsafe URL dropped)
twitter:image= (ABSENT - unsafe URL dropped)
JSON-LD image = (ABSENT - unsafe URL dropped)
```

## AC-12 — Navigation works by keyboard and without client scripting

**PASS.** The primary navigation is plain `<a href>` anchors inside
`<nav aria-label="Primary">`. There is no client component, no
hamburger toggle, no JS-gated menu. A "Skip to content" link is the
first focusable element, targeting `<main id="main">`.

`:focus-visible` is styled globally in `globals.css` (2px outline, 2px
offset), so keyboard focus is always visible.

## AC-13 — Production metadata contains no staging/localhost origins

**PASS.** `getConfig()` throws a `ConfigError` at boot when
`WIDEANGLE_CANONICAL_ORIGIN` is a local origin and `NODE_ENV=production`.
It is a hard failure, not a warning, because a localhost canonical URL
in production silently breaks every canonical, sitemap entry and feed
item.

Unit test: *"refuses a localhost origin in production (AC-13)"*.

The guard has one explicit, documented escape hatch —
`WIDEANGLE_ALLOW_LOCAL_ORIGIN=true` — needed because `next build`
always runs with `NODE_ENV=production`, which would otherwise make a
local production build impossible. It must never be set in a
deployment.

## AC-14 — Publication scope can be added through configuration and adapter

**PASS.** `buildScopedUrl()` adds `?publicationId=…` **only** when
`WIDEANGLE_CALLIOPE_SUPPORTS_PUBLICATION_SCOPE=true`. The default is
`false`, because the current Calliope API ignores unknown query
parameters — sending the scope unconditionally would make the site
*appear* to support a contract it does not.

Two unit tests cover both branches, and cache keys are namespaced by
the publication scope via `scopeTag()`.

## AC-15 — Categories and pagination provide crawlable article links

**PASS.** The archive renders 3 `<a href="/articles/<slug>">` links;
the category page renders its own article links; pagination uses
`<nav aria-label="Pagination">` with `rel="prev"` / `rel="next"` links.
Every page is a real URL with its own canonical and its own
`meta robots`.

Out-of-range pagination (`?page=999`) returns a 200 with an explicit
empty-state message, not a 404 and not an infinite scroll.

## AC-16 — Deployment and rollback are documented and tested

**PASS.** [`docs/DEPLOYMENT.md`](DEPLOYMENT.md) covers: build, run,
health check, per-path CDN cache headers (including the two rules that
matter — never cache a 404, never cache a 5xx), rollback, on-demand
revalidation, a 9-step deployment verification checklist with expected
outputs, staging protection, and operational notes.

Rollback is a redeploy of a previous build artefact: there is no
database to migrate and no persistent state.

---

## Bugs found and fixed during verification

Recorded here because they are the reason the verification was worth
running.

| # | Bug | Symptom | Fix |
|---|---|---|---|
| 1 | Withdrawal did not propagate | A withdrawn article stayed live indefinitely while the archive and sitemap had dropped it | Cache the 404 as a value (`null`), not as a thrown error — `src/lib/data.ts` |
| 2 | `javascript:` URL in social meta tags | `coverImageUrl` reached `og:image` / `twitter:image` unvalidated | Route the hero and social image through `safeUrl()` — `src/lib/calliope/adapter.ts`, `src/lib/seo.ts` |
| 3 | Doubled title suffix | `<title>` rendered `… — WideAngle — WideAngle` | `articleTitle()` returns the title only; the layout template adds the suffix |
| 4 | Local production build impossible | The AC-13 guard blocked `next build` against a localhost origin | Added the explicit `WIDEANGLE_ALLOW_LOCAL_ORIGIN` escape hatch |
| 5 | Invalid RSS `<author>` | The RSS 2.0 `<author>` element held a display name, but that element is specified to hold an email | Emit `<dc:creator>` with the Dublin Core namespace |
