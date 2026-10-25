import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UpstreamNotFoundError, UpstreamUnavailableError } from '@/lib/calliope/client';

/**
 * Regression tests for the cache-negatives behaviour.
 *
 * The bug this guards against: Next's data cache serves a STALE value
 * when a background revalidation throws. If "article withdrawn" is
 * represented by a THROWN error, the stale (still-published) copy
 * stays live forever and the site contradicts its own archive.
 *
 * The rule: a 404 must be cached as a VALUE (`null`), never thrown.
 * A transport failure must be thrown, so it can never become a 404.
 *
 * `next/cache` is mocked so `unstable_cache` simply calls through.
 * That isolates the caching POLICY under test — the real cache's
 * stale-serving behaviour is verified end-to-end against a live
 * upstream (see docs/ACCEPTANCE.md, AC-09).
 */

const fetchArticleBySlug = vi.fn();

vi.mock('next/cache', () => ({
  unstable_cache:
    <T>(fn: () => Promise<T>) =>
    async (): Promise<T> =>
      fn(),
}));

vi.mock('@/lib/calliope/adapter', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/calliope/adapter')>(
      '@/lib/calliope/adapter',
    );
  return {
    ...actual,
    fetchArticleBySlug: (...args: unknown[]) => fetchArticleBySlug(...args),
  };
});

const ORIGINAL_ENV = { ...process.env };

describe('getArticle cache semantics', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    process.env.WIDEANGLE_CANONICAL_ORIGIN = 'https://wideangle.example.com';
    process.env.WIDEANGLE_CALLIOPE_BLOG_ID =
      '7604f178-68f6-4e65-9d79-de091b1ead15';
    fetchArticleBySlug.mockReset();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('returns the article when the upstream has it', async () => {
    const { getArticle } = await import('@/lib/data');
    const article = {
      id: 'a',
      slug: 'live',
      title: 'Live',
      body: [],
      publishedAt: '2026-01-01T00:00:00.000Z',
      author: { id: 'x', name: 'A' },
      categories: [],
      tags: [],
    };
    fetchArticleBySlug.mockResolvedValue(article);

    await expect(getArticle('live')).resolves.toEqual(article);
  });

  it('turns an upstream 404 into a not-found error', async () => {
    const { getArticle } = await import('@/lib/data');
    fetchArticleBySlug.mockRejectedValue(
      new UpstreamNotFoundError('article.not_found', 'gone'),
    );

    await expect(getArticle('missing')).rejects.toBeInstanceOf(
      UpstreamNotFoundError,
    );
  });

  it('propagates an upstream outage instead of turning it into a 404', async () => {
    const { getArticle } = await import('@/lib/data');
    fetchArticleBySlug.mockRejectedValue(
      new UpstreamUnavailableError('connection refused'),
    );

    await expect(getArticle('whatever')).rejects.toBeInstanceOf(
      UpstreamUnavailableError,
    );
    await expect(getArticle('whatever')).rejects.not.toBeInstanceOf(
      UpstreamNotFoundError,
    );
  });
});
