# Calliope → WideAngle delivery contract

Phase 1 of the PRD: what the real Calliope service actually serves, and
what it does not.

- **Discovered against**: `calliope` @ `c987724`, running locally on
  `http://localhost:3002` with `calliope-postgres` on `:5435`.
- **Method**: seeded realistic content (published / draft / archived),
  then probed the anonymous public routes directly.
- **Adapter**: [`src/lib/calliope/`](../src/lib/calliope/) — the only
  module that knows the upstream wire format.

---

## 1. Read endpoints used by WideAngle

All of these are `@Public()` in Calliope and require **no token**.

| Method & path | Auth | WideAngle uses it for |
|---|---|---|
| `GET /v1/blogs/:blogId/articles` | none | Homepage, archive, category listings, sitemap, feed |
| `GET /v1/blogs/:blogId/articles/:slug` | none | Article detail |
| `GET /v1/blogs/:blogId/articles/:slug?include=related` | none | Article detail (curated related set) |
| `GET /v1/blogs/:blogId/categories` | none | Category pages, homepage nav |
| `GET /v1/blogs/:blogId/authors` | none | Byline, /about |

### Query parameters actually honoured

| Param | Behaviour | Notes |
|---|---|---|
| `page` | 1-based, **max 10 000** | `page=99999` → `400 http.validation.failed` |
| `pageSize` | default 20, **max 100** | `pageSize=500` → `400 http.validation.failed` |
| `categoryId` | filters by category UUID | Used by `/categories/[slug]` |
| `tagId` | filters by tag UUID | Available, not used in V1 |
| `q` | case-insensitive contains on title/excerpt | Available, **not** exposed as a public route (see §5) |
| `status` | **ignored on the public route** | The public handler forces `status: PUBLISHED`. Verified: `?status=DRAFT` returns only published articles. |

### Pagination

Offset pagination, not cursors:

```json
{ "data": [ ... ], "meta": { "total": 42, "page": 1, "pageSize": 20 } }
```

`meta.total` is the real filtered row count. There is no `nextCursor`.
WideAngle's `PageResult` therefore carries `page` / `pageSize` / `total`
rather than the PRD's cursor shape — the PRD's `PageResult` is a
*frontend contract*, and mirroring the real service is more honest than
inventing a cursor the upstream does not have.

---

## 2. Response shapes (sanitised, real)

### Article list item (public projection)

```json
{
  "id": "11111111-1111-4111-8111-111111111111",
  "slug": "why-we-rebuilt-the-content-api",
  "title": "Why we rebuilt the content API",
  "excerpt": "The old API leaked draft slugs to anyone who knew where to look.",
  "content": [
    { "type": "paragraph", "data": { "text": "Every content API eventually grows..." } },
    { "type": "heading",   "data": { "text": "The leak", "level": 2 } },
    { "type": "quote",     "data": { "text": "If a URL resolves...", "attribution": "..." } },
    { "type": "list",      "data": { "style": "unordered", "items": ["...", "..."] } },
    { "type": "code",      "data": { "language": "ts", "code": "const article = ..." } },
    { "type": "image",     "data": { "url": "https://...", "alt": "...", "width": 1600, "height": 900 } },
    { "type": "table",     "data": { "header": ["A", "B"], "rows": [["1", "2"]] } },
    { "type": "callout",   "data": { "tone": "note", "text": "..." } }
  ],
  "coverImageUrl": "https://...",
  "publishedAt": "2026-10-12T18:07:04.557Z",
  "author":  { "id": "...", "name": "...", "bio": "...", "avatarUrl": null },
  "category":{ "id": "...", "name": "Engineering", "slug": "engineering" },
  "tags":    [ { "id": "...", "name": "TypeScript", "slug": "typescript" } ]
}
```

### Single article

Same shape, bare object (no envelope). `?include=related` adds a
`related` array of the same shape, published-only, in the editor's
curated order.

### Categories

```json
{ "data": [ { "id": "...", "name": "Engineering", "slug": "engineering",
              "description": "..." } ],
  "meta": { "total": 3, "page": 1, "pageSize": 20 } }
```

### Authors

```json
{ "data": [ { "id": "...", "name": "...", "bio": "...", "avatarUrl": null } ],
  "meta": { "total": 1, "page": 1, "pageSize": 20 } }
```

### Errors

Always `{ "code", "message" }`, plus an optional `meta` with
client-safe context. Status is derived from the code.

---

## 3. Content format — the key discovery

Calliope's `content` column is **a JSON block list, not HTML, not
Markdown**:

```
content: [ { type: string(1–200), data: object(≤100 keys) } ]   // 1–200 blocks
```

The upstream **deliberately does not constrain `type`**. Unknown block
types are accepted at the API boundary — the shape is validated, the
vocabulary is not. From the source:

> `content` is a JSON block list (structured-editor output),
> deliberately CMS-agnostic … Unknown block types are ALLOWED — any
> editor can plug in its own block vocabulary; only the shape is
> enforced here. Richer per-type schemas belong to the clients that
> render the blocks.

**Consequence for WideAngle:** the render contract is *ours*. WideAngle
defines the vocabulary it renders (`paragraph`, `heading`, `quote`,
`list`, `code`, `image`, `table`, `callout`, `divider`) and renders an
explicit, inert placeholder for anything else — it never guesses, and
it never silently drops content.

This is also why the frontend has no HTML sanitiser: **there is no HTML
in the payload to sanitise.** The renderer emits React elements, so no
upstream string is ever interpreted as markup.

### Block vocabulary WideAngle renders

| `type` | `data` fields read | Rendered as |
|---|---|---|
| `paragraph` | `text` | `<p>` |
| `heading` | `text`, `level` (2–6) | `<h2>`/`<h3>`/`<h4>` with a generated id |
| `quote` | `text`, `attribution` | `<figure><blockquote>` + `<figcaption>` |
| `list` | `style` (`ordered`/`unordered`), `items[]` | `<ul>`/`<ol>`, nested via `children` |
| `code` | `code`, `language` | `<pre><code>` with a language label |
| `image` | `url`, `alt`, `caption`, `width`, `height` | `<figure><img>` + optional caption |
| `table` | `header[]`, `rows[][]` | `<table>` with `<thead>`/`<tbody>` |
| `callout` | `text`, `tone` (`note`/`warning`/`danger`) | `<aside role="note">` |
| `divider` | — | `<hr>` |
| *anything else* | — | inert dashed-border placeholder naming the type |

---

## 4. Capability gaps (real, verified)

### G1 — No modification date in the public projection. **Material.**

The public projection strips `createdAt` and `updatedAt`. The article
schema has `updatedAt`, but it is **not** in the public whitelist, so a
public read cannot see it.

- **PRD says**: "Significant modification date when available and meaningful."
- **Reality**: `modifiedAt` is never available on a public read.
- **WideAngle's handling**: `ArticleView.modifiedAt` exists and is
  carried through the adapter, but is `undefined` in practice. The
  article page and the `BlogPosting` JSON-LD **omit `dateModified`
  entirely** rather than substituting the current time.
- **Why it matters**: PRD §13 forbids "deployment-driven date
  inflation". Emitting `dateModified = now` on every request would
  make every article look freshly modified to a crawler.
- **To close the gap**: Calliope would need to add `updatedAt` to
  `toPublicArticle()` — a one-line change plus a projection test.

### G2 — No publication/blog metadata endpoint is public. **Material.**

`GET /v1/blogs/:blogId` requires a token (401 for anonymous callers).
The `Blog` model has only `id`, `tenantId`, `name`, `slug` — no
description, logo, locale, or social links.

- **PRD says**: "Keep publication title, description, logo, author
  identity, canonical origin, locale, and social links configurable or
  consume them from Calliope where supported."
- **Reality**: there is no public source for any of it, and the model
  does not carry most of it.
- **WideAngle's handling**: publication identity comes entirely from
  WideAngle's own configuration (`src/lib/config.ts`). This satisfies
  the "or configurable" branch of the PRD.
- **To close the gap**: Calliope would need a public blog-profile
  endpoint and a richer `Blog` model.

### G3 — Single category per article.

`Article.categoryId` is a nullable **single** FK; the public projection
returns `category` (singular) or `null`. There is no article-to-
category many-to-many.

- **PRD's `ArticleView`** declares `categories: Array<...>`.
- **WideAngle's handling**: the array shape is preserved (the adapter
  maps `category` → a one-element array), so the frontend contract
  still matches the PRD and a future many-to-many upstream needs no
  template change.
- **Consequence**: the article page shows at most one category.

### G4 — No explicit modified/withdrawn event feed.

No webhook, no event stream, no change cursor. There is a `?include=related`
read and nothing else.

- **WideAngle's handling**: time-based revalidation only. The
  freshness window is `WIDEANGLE_CONTENT_REVALIDATE_SECONDS`
  (default 300s). A withdrawal propagates within that window (AC-09).
- **To close the gap**: Calliope would need a publication event
  endpoint or a `changedSince` filter.

### G5 — No image metadata beyond a URL.

`coverImageUrl` is a bare string. No width, height, alt text, or
caption at the article level.

- **WideAngle's handling**: block-level `image` blocks *can* carry
  `alt`/`width`/`height`/`caption` (the renderer reads them), but the
  article-level `coverImageUrl` cannot. The hero's `alt` falls back to
  the article title.
- **Note**: the upstream `coverImageUrl` is validated against the URL
  protocol allowlist before it reaches `og:image` / `twitter:image`.
  A `javascript:` cover URL is dropped, not forwarded.

### G6 — No redirect information.

Calliope has no redirect map and does not report a previous slug.

- **PRD says**: "Use upstream redirect information where available.
  Otherwise use a deployment-managed redirect map or a documented
  no-slug-change policy for V1."
- **WideAngle's handling**: the **documented no-slug-change policy**
  for V1. Changing a published slug in Calliope produces a 404 on the
  old URL. This is stated in `docs/KNOWN_LIMITATIONS.md`.

### G7 — No image CDN durability guarantee.

`coverImageUrl` may point at any host the editor chose; nothing in
Calliope manages image hosting.

- **WideAngle's handling**: images are rendered with a plain `<img>`,
  not `next/image`, because the host is not known at build time and
  `remotePatterns` would have to be a static allowlist. Block-level
  dimensions are used when present to keep CLS low.

### G8 — `q` search exists but is not exposed.

`?q=` works and is case-insensitive over title/excerpt (verified:
`q=Cach` matches "Caching is a product decision"; `q=cache` does not,
correctly, because it is a substring match). WideAngle does not expose
a search route — PRD §3 lists "internal search" as a non-goal, and
PRD §13 forbids "automatic indexable filter/search/tag combinations".
The capability remains available in the adapter for a future
non-indexable, server-side use.

---

## 5. What WideAngle verified about the upstream's public/private boundary

| Probe | Result |
|---|---|
| `GET .../articles/<draft-slug>` (anonymous) | `404 article.not_found` — identical to an unknown slug |
| `GET .../articles/<archived-slug>` (anonymous) | `404 article.not_found` |
| `GET .../articles/<published-id-uuid>` (anonymous) | `404` — ids are not public identifiers |
| `GET .../articles?status=DRAFT` (anonymous) | Only published articles returned |
| `GET .../articles?include=related` (anonymous) | Related set is published-only |
| Draft body text in any public response | Not present (verified across HTML, sitemap, feed) |

**Conclusion**: Calliope's public-only read contract is sound. The
delivery-contract gap the PRD §6 warns about ("If Calliope cannot
reliably distinguish public from private content") does **not** exist —
the distinction is enforced server-side and leaks no existence signal.

---

## 6. Cache validators

| Header | Present? |
|---|---|
| `ETag` | **Yes** — weak ETag, and `If-None-Match` returns `304` |
| `Cache-Control` | **No** — Calliope sends none |
| `Last-Modified` | No |
| `Vary` | No |

WideAngle does not forward the upstream ETag. Next's data cache owns
the revalidation window, and the public cache headers belong to the CDN
in front of WideAngle. See `docs/DEPLOYMENT.md`.

---

## 7. Authentication

**None needed.** Every route WideAngle uses is `@Public()`.

The optional-auth upgrade — presenting a Bearer token on a read route
to get the management view — is deliberately **not used**. WideAngle
holds no credential, so:

- there is no secret to leak into a bundle or a log (AC-10);
- there is no code path that can mutate Calliope content (AC-02);
- the adapter has no method capable of issuing a non-GET request.

---

## 8. Summary of what the adapter must change for a future upstream

The adapter is isolated in `src/lib/calliope/`. A future upstream
change touches:

| Change | Where |
|---|---|
| Publication-scoped reads | `buildScopedUrl()` + `WIDEANGLE_CALLIOPE_SUPPORTS_PUBLICATION_SCOPE` |
| `updatedAt` in the public projection | `upstreamArticleSchema` + `toArticleView()` — no template change |
| Multi-category articles | `toArticleView()` — the `categories` array shape is already correct |
| New block types | `src/lib/render/safe.ts` (`KNOWN_BLOCK_TYPES`) + `ArticleBody.tsx` |
| Renamed/moved fields | `src/lib/calliope/schema.ts` only |

No page template needs to change for any of these. That is the point of
the adapter boundary.
