# Known limitations

Everything here is a deliberate, documented gap — not an oversight. Each
entry says what it is, why it exists, and what would close it.

---

## 1. No modification date on articles

**What**: An article page never shows an "Updated" date, and the
`BlogPosting` JSON-LD never emits `dateModified`.

**Why**: Calliope's public projection strips `updatedAt` (and
`createdAt`). A public read physically cannot see the modification
timestamp — see [`CONTRACT.md` §4 G1](CONTRACT.md#4-capability-gaps-real-verified).

The alternative — emitting `dateModified: new Date().toISOString()` —
would make every article look freshly modified on every request. PRD §13
explicitly forbids "deployment-driven date inflation". A search engine
that sees a `dateModified` newer than the content would eventually
distrust the whole site's dates.

**To close it**: Calliope adds `updatedAt` to `toPublicArticle()`.
`ArticleView.modifiedAt` and the `dateModified` emission are already
wired; no template change is needed.

---

## 2. Changing a published slug breaks the old URL

**What**: If an editor changes a published article's slug in Calliope,
the old URL returns 404. There is no redirect.

**Why**: Calliope has no redirect map and does not report a previous
slug — see [`CONTRACT.md` §4 G6](CONTRACT.md#4-capability-gaps-real-verified).
PRD §12 permits "a deployment-managed redirect map or a documented
no-slug-change policy for V1". This is the documented no-slug-change
policy.

**Mitigation now**: treat a published slug as permanent. If a slug must
change, add a redirect to the edge (Cloudflare/Vercel/nginx) at the
same time as the upstream edit.

**To close it**: Calliope exposes a redirect list, or WideAngle gains a
deployment-managed `redirects.json` read by the middleware. The
middleware hook is a small, isolated change.

---

## 3. One category per article

**What**: An article belongs to at most one category. The article page
shows at most one category in its breadcrumb.

**Why**: `Article.categoryId` is a nullable single FK upstream — see
[`CONTRACT.md` §4 G3](CONTRACT.md#4-capability-gaps-real-verified).

**Not a problem for the code**: the frontend contract uses
`categories: Array<...>` exactly as the PRD specifies. The adapter maps
the single upstream category into a one-element array, so a future
many-to-many upstream needs no template change.

---

## 4. No on-demand revalidation

**What**: A change in Calliope appears on the site within
`WIDEANGLE_CONTENT_REVALIDATE_SECONDS` (default 5 minutes). There is no
"publish now" button and no signed cache-refresh endpoint.

**Why**: Calliope has no publication event feed — see
[`CONTRACT.md` §4 G4](CONTRACT.md#4-capability-gaps-real-verified). PRD §12
allows time-based refresh as the fallback.

**To close it**: add a signed `POST /api/revalidate` route handler that
calls `revalidateTag(scopeTag(...))`. PRD §5 permits this explicitly:
"An optional signed cache-refresh endpoint is infrastructure-only and
cannot write content to Calliope."

---

## 5. Image optimisation is limited

**What**: Article images are rendered with a plain `<img>` tag, not
`next/image`. They are not resized, re-encoded, or served in modern
formats by this app.

**Why**: the image host is chosen by the editor and is not known at
build time, so `next/image`'s `remotePatterns` would need a static
allowlist that can drift. Block-level `width`/`height` are used when
the upstream supplies them, which keeps CLS at zero — the metric that
actually matters for Core Web Vitals.

**Consequence**: images are served at their original size. On a slow
connection a large image is the first thing to hurt LCP.

**To close it**: set `WIDEANGLE_IMAGE_HOSTS` to the CDN(s) you actually
use and generate `remotePatterns` from them in `next.config.ts`.

---

## 6. No reader-facing search

**What**: there is no `/search` route.

**Why**: PRD §3 lists "internal search" as a non-goal, and PRD §13
forbids "automatic indexable filter/search/tag combinations" — a
search results page is a thin, indexable duplicate of the archive.

Calliope *does* support `?q=` (case-insensitive contains over
title/excerpt). The capability is preserved in the adapter for a future
server-side, `noindex` use.

---

## 7. No tag archive

**What**: tags are shown on article pages, but there is no `/tags/[slug]`
route.

**Why**: PRD §9 — "Display tags when useful; defer separate tag
archives to avoid redundant or thin pages."

---

## 8. No analytics or advertising

**What**: no analytics script, no ads, no ad slots, no newsletter.

**Why**: PRD §3 and §16. Advertising is feature-flagged and off by
default; no analytics provider is configured, so the privacy page
describes what actually happens rather than what a template says.

**To add analytics**: wire it deliberately and then update
`/privacy` so the page stays truthful — PRD §16 requires the privacy
description to match actual practice.

---

## 9. A single publication per deployment

**What**: one deployment serves one blog.

**Why**: PRD §8 — V1 is one deployment, one blog. The adapter *is*
prepared for the future contract, but no multi-blog routing, selection
or administration is implemented.

**To close it**: set `WIDEANGLE_PUBLICATION_ID` and
`WIDEANGLE_CALLIOPE_SUPPORTS_PUBLICATION_SCOPE=true` once Calliope
supports publication-scoped reads, and include the publication id in
the cache key (`scopeTag()` already does). Do **not** flip that flag
before the upstream supports it — the current API would silently ignore
the parameter and the site would appear to support a contract it does
not.

---

## 10. Content is rendered from a block vocabulary, not HTML

**What**: an upstream block type that WideAngle does not know renders as
a visible placeholder, not as content.

**Why**: Calliope's `content` format is deliberately editor-agnostic —
the API validates the *shape* of a block (`{type, data}`) but not its
meaning. WideAngle owns the render contract.

**To extend**: add the type to `KNOWN_BLOCK_TYPES` in
`src/lib/render/safe.ts` and write a renderer for it in
`src/components/ArticleBody.tsx`. Both are additive.

---

## 11. The feed uses `dc:creator`, not RSS `<author>`

**What**: a feed item's author is emitted as `<dc:creator>` (Dublin
Core), not as the RSS 2.0 `<author>` element.

**Why**: the RSS 2.0 `<author>` element is specified to contain an
**email address** — a reader that follows it expects to be able to
compose mail to that address. Putting a bare display name there
produces a feed that some readers reject or mis-render. Worse, it
would normalise "publish the author's email into a public feed",
which is a privacy leak.

`dc:creator` is the standard extension for a display name, and it is
declared on the `<rss>` element with the Dublin Core namespace.

**To close it**: nothing to do. If the upstream ever publishes an
author email that is intended to be public, RSS `<author>` becomes
correct — and that is an editorial decision, not a technical one.
