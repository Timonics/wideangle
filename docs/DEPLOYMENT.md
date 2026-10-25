# Deployment

## 1. Build

```bash
npm ci
npm run build
```

The build requires these to be set (it will fail fast otherwise):

| Variable | Notes |
|---|---|
| `WIDEANGLE_CANONICAL_ORIGIN` | The real public origin. **Not** a local origin in production. |
| `WIDEANGLE_CALLIOPE_BLOG_ID` | The blog to publish. |

Everything else has a default. See `.env.example`.

If you are building locally against a localhost origin, add
`WIDEANGLE_ALLOW_LOCAL_ORIGIN=true` — and never ship that variable.

### Build output

```
Route (app)             Revalidate  Expire
┌ ○ /                   5m          1y      (static, ISR)
├ ƒ /articles                            (dynamic — query params)
├ ƒ /articles/[slug]                     (dynamic — new slugs)
├ ƒ /categories/[slug]                   (dynamic)
├ ○ /sitemap.xml      5m          1y
├ ○ /feed.xml         5m          1y
└ ○ /robots.txt       1h          1y
```

The dynamic routes are intentional: an article published after the build
must be reachable without a redeploy.

---

## 2. Run

```bash
npm run start          # serves .next on $PORT (default 3000)
```

The app is a standard Node server. It needs:

- Node 22+
- network access to the Calliope service
- no database of its own
- no secret store — it holds no credential

### Health check

There is no dedicated health endpoint. The practical check is:

```bash
curl -fsS -o /dev/null -w '%{http_code}\n' https://<your-host>/
```

A `200` means the app is up *and* Calliope is reachable. A `500` means
the app is up but the upstream is not — which is the correct,
non-404 signal (AC-08).

---

## 3. Cache behaviour at the edge

Next's data cache handles the upstream read. The **CDN** in front of
WideAngle handles the public response. Configure it like this:

| Path | `Cache-Control` | Why |
|---|---|---|
| `/` , `/articles`, `/categories/*` | `public, s-maxage=300, stale-while-revalidate=600` | matches the 5-minute freshness window |
| `/articles/<slug>` | `public, s-maxage=300, stale-while-revalidate=600` | same window; a withdrawal must not linger |
| `/sitemap.xml` | `public, s-maxage=300, stale-while-revalidate=600` | must reflect withdrawals |
| `/feed.xml` | `public, s-maxage=300, stale-while-revalidate=600` | same |
| `/about`, `/contact`, `/privacy`, `/terms`, `/editorial-policy` | `public, s-maxage=3600, stale-while-revalidate=86400` | static content, changes rarely |
| `4xx` / `5xx` | `no-store` | never cache a missing or failed page |

Two rules that matter:

1. **Never cache a 404.** A 404 is what a draft slug looks like. If
   the edge caches it, a later publish stays invisible for the whole
   TTL.
2. **Never cache a 5xx.** A 5xx is an upstream outage, not a verdict
   about the article.

`stale-while-revalidate` lets a reader keep the last good copy during
an upstream outage — that is the "stale-content behaviour during
outages" the PRD asks to define, and it is why the window is
deliberate rather than zero.

---

## 4. Rollback

WideAngle is a stateless Next.js server. Rollback is a redeploy of a
previous build artefact.

```bash
# 1. Build the previous commit
git checkout <previous-sha>
npm ci
npm run build

# 2. Restart with the previous build
#    (systemd: systemctl restart wideangle
#     Docker:  docker compose up -d --build
#     Platform: promote the previous release)
```

There is no database migration to reverse and no cache to invalidate —
the Next data cache is local to the deployment and is rebuilt on
start.

### Cache invalidation after a deploy

The data cache is keyed by route + scope. A fresh deployment starts
with an empty cache, so the first request per route repopulates it.

For an **on-demand** refresh without a redeploy, call the platform's
revalidation hook (Vercel: `revalidatePath`; a self-hosted setup: a
route handler that calls `revalidateTag`). This is deliberately *not*
implemented in V1 — the PRD allows time-based refresh, and an
infrastructure-only signed endpoint is the natural place to add it
later.

---

## 5. Verifying a deployment

Run these against the live origin. Every one has a fixed expected
answer.

```bash
HOST=https://<your-host>

# 1. The homepage renders and contains article titles
curl -fsS $HOST/ | grep -q '<h1' && echo "homepage OK"

# 2. A published article's body is in the initial HTML (AC-01)
curl -fsS $HOST/articles/<a-published-slug> | grep -q '<article' \
  && echo "article body in HTML OK"

# 3. A draft slug is a genuine 404 (AC-04, AC-07)
curl -s -o /dev/null -w '%{http_code}\n' $HOST/articles/<a-draft-slug>
#   expect: 404

# 4. A nonsense slug is also 404 (AC-07)
curl -s -o /dev/null -w '%{http_code}\n' $HOST/articles/definitely-not-real
#   expect: 404

# 5. The sitemap contains no draft slugs (AC-06)
curl -fsS $HOST/sitemap.xml | grep -c '<loc>'          # expect: published count + 7 static
curl -fsS $HOST/sitemap.xml | grep -i draft            # expect: no output

# 6. The feed is valid RSS with the right content type
curl -fsSI $HOST/feed.xml | grep -i content-type
#   expect: application/rss+xml

# 7. Structured data is present and matches the visible title (AC-05)
curl -fsS $HOST/articles/<a-published-slug> \
  | grep -o '"@type":"BlogPosting"' | head -1
#   expect: "@type":"BlogPosting"

# 8. No staging or localhost origin in production metadata (AC-13)
curl -fsS $HOST/ | grep -o '<link rel="canonical" href="[^"]*"'
#   expect: your real origin, not localhost

# 9. Security headers are present
curl -fsSI $HOST/ | grep -iE 'x-content-type-options|x-frame-options'
```

### Withdrawing an article

Publish, then withdraw, in Calliope. The article must disappear from
the site within `WIDEANGLE_CONTENT_REVALIDATE_SECONDS` (default 5
minutes) — that is the AC-09 freshness window.

```bash
# after the window has passed
curl -s -o /dev/null -w '%{http_code}\n' $HOST/articles/<the-slug>
#   expect: 404
curl -fsS $HOST/sitemap.xml | grep -c '<the-slug>'
#   expect: 0
```

---

## 6. Staging

Protect staging with hosting-level access control (basic auth, SSO,
or an IP allowlist). Do **not** rely on `robots.txt` to keep staging
private — a robots rule hides a page from compliant crawlers and
nothing else.

If staging must be reachable by a search engine for verification, use a
`noindex` header rather than an auth challenge, and remember that the
production canonical origin must never point at the staging host.

---

## 7. Operational notes

### Upstream latency

WideAngle's own response time is dominated by the Calliope read on a
cold cache. The upstream timeout is `WIDEANGLE_CALLIOPE_TIMEOUT_MS`
(default 5000). A timeout renders the error boundary with a 5xx — it
is never converted into a 404.

### Monitoring

Track these separately:

- **Delivery errors**: 5xx rate, and the 404 rate (a sudden 404 spike
  means something upstream changed the slug space).
- **Upstream latency**: the duration of the Calliope call, which is
  visible in the server log.

Visitor analytics are a separate concern; no analytics provider is
wired up in V1 (see the privacy page for the honest description).

### Logs

Upstream URLs and error details appear in server logs. They do not
appear in public responses — the error boundary renders a generic
message and a Next error digest. Never put credentials in a log line;
WideAngle has none to put there.
