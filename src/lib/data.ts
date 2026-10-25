/**
 * Cached data access.
 *
 * This is the layer the pages talk to. It wraps the adapter with
 * Next's data cache so a published page is not re-fetched from
 * Calliope on every request.
 *
 * Cache policy (PRD §12):
 *
 *   * `revalidate` is the freshness window, driven by
 *     WIDEANGLE_CONTENT_REVALIDATE_SECONDS (default 300s = 5 min).
 *     That is the maximum staleness a reader can observe after an
 *     editor publishes or withdraws an article.
 *   * Cache keys include the content scope and the route identity —
 *     the tag is namespaced by publication so two publications can
 *     never share a cache entry.
 *   * Drafts are never fetched, so they can never be cached.
 *   * A failed fetch is NOT cached: the upstream call is wrapped so a
 *     timeout propagates as an error instead of being memoised as an
 *     empty result.
 */

import { unstable_cache } from 'next/cache';
import { getConfig } from './config';
import {
  fetchAllPublishedArticles,
  fetchArticleBySlug,
  fetchArticlePage,
  fetchAuthors,
  fetchCategories,
  findCategoryBySlug,
} from './calliope/adapter';
import { UpstreamNotFoundError } from './calliope/client';
import type { ArticleView } from './types';
import type { PageResult } from './types';

/**
 * A cache tag namespace for this publication.
 *
 * Scope + route identity live in the tag, so invalidating one
 * article never touches another publication's cache.
 */
export function scopeTag(...parts: string[]): string {
  const { publication } = getConfig();
  const scope = publication.publicationId ?? publication.canonicalOrigin;
  return ['wideangle', scope, ...parts].join(':');
}

/**
 * Fetch a page of articles with caching.
 *
 * `unstable_cache` keys on the function identity plus its argument
 * list, so the page number and category id are part of the key.
 */
export function getArticlePage(options: {
  page?: number;
  pageSize?: number;
  categoryId?: string;
}): Promise<PageResult<ArticleView>> {
  const { revalidateSeconds } = getConfig().calliope;
  const { page, pageSize, categoryId } = options;

  return unstable_cache(
    async () => fetchArticlePage({ page, pageSize, categoryId }),
    [
      'wideangle',
      'articles',
      `page-${page ?? 1}`,
      `size-${pageSize ?? 'default'}`,
      `category-${categoryId ?? 'all'}`,
    ],
    {
      revalidate: revalidateSeconds,
      tags: [scopeTag('articles', categoryId ?? 'all')],
    },
  )();
}

/**
 * Fetch a single article by slug.
 *
 * The caching strategy is deliberately NOT a plain `unstable_cache`
 * wrapper, because of how Next's data cache treats a failed
 * background revalidation.
 *
 * The problem: when a cached entry's TTL expires, Next serves the
 * STALE value and revalidates in the background. If that revalidation
 * THROWS — which is exactly what happens when an article is
 * withdrawn and the upstream starts answering 404 — the stale entry
 * is kept and the error is only logged. The withdrawn article then
 * stays live on the site indefinitely, while the archive and sitemap
 * (whose list fetches succeed, merely returning fewer rows) have
 * already dropped it. The site would contradict itself.
 *
 * This was a real bug, caught by the AC-09 withdrawal test.
 *
 * The fix: cache the negative result as a VALUE (`null`), not as a
 * thrown error. A successful revalidation writes "not found" into the
 * cache, and the next request reads it and renders a genuine 404.
 *
 * The distinction that matters is preserved:
 *
 *   * upstream says 404 → cached as `null` → a genuine 404 page;
 *   * upstream is unreachable → the error is re-thrown → a 5xx.
 *
 * A timeout can therefore never become a 404 (AC-08), and a
 * withdrawal always takes effect within the freshness window (AC-09).
 */
export async function getArticle(slug: string): Promise<ArticleView> {
  const { revalidateSeconds } = getConfig().calliope;

  const cached = unstable_cache(
    async (): Promise<ArticleView | null> => {
      try {
        return await fetchArticleBySlug(slug);
      } catch (error) {
        if (error instanceof UpstreamNotFoundError) {
          // Cache the "not published" answer as a value. Throwing here
          // would leave a stale copy live forever.
          return null;
        }
        // Transport / contract failures must NOT become a 404.
        throw error;
      }
    },
    ['wideangle', 'article', slug],
    {
      revalidate: revalidateSeconds,
      tags: [scopeTag('article', slug)],
    },
  );

  const article = await cached();
  if (article === null) {
    throw new UpstreamNotFoundError(
      'article.not_found',
      `No published article with slug "${slug}"`,
    );
  }
  return article;
}

/** Fetch every published article (sitemap + feed). */
export function getAllPublishedArticles(): Promise<ArticleView[]> {
  const { revalidateSeconds } = getConfig().calliope;

  return unstable_cache(
    async () => fetchAllPublishedArticles(),
    ['wideangle', 'articles', 'all'],
    {
      revalidate: revalidateSeconds,
      tags: [scopeTag('articles', 'all')],
    },
  )();
}

/** Fetch the category list. */
export function getCategories(): Promise<
  Array<{ id: string; name: string; slug: string; description?: string }>
> {
  const { revalidateSeconds } = getConfig().calliope;

  return unstable_cache(
    async () => fetchCategories(),
    ['wideangle', 'categories'],
    {
      revalidate: revalidateSeconds,
      tags: [scopeTag('categories')],
    },
  )();
}

/** Look up a category by slug. */
export function getCategoryBySlug(
  slug: string,
): Promise<{ id: string; name: string; slug: string; description?: string } | null> {
  const { revalidateSeconds } = getConfig().calliope;

  return unstable_cache(
    async () => findCategoryBySlug(slug),
    ['wideangle', 'category', slug],
    {
      revalidate: revalidateSeconds,
      tags: [scopeTag('category', slug)],
    },
  )();
}

/** Fetch the publication's authors. */
export function getAuthors(): Promise<
  Array<{ id: string; name: string; bio?: string; imageUrl?: string }>
> {
  const { revalidateSeconds } = getConfig().calliope;

  return unstable_cache(
    async () => fetchAuthors(),
    ['wideangle', 'authors'],
    {
      revalidate: revalidateSeconds,
      tags: [scopeTag('authors')],
    },
  )();
}
