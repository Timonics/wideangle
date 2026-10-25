import type { MetadataRoute } from 'next';
import { getConfig } from '@/lib/config';
import { getAllPublishedArticles, getCategories } from '@/lib/data';
import { absoluteUrl, articlePath, categoryPath } from '@/lib/urls';

export const revalidate = 300;

/**
 * The sitemap.
 *
 * Contains ONLY canonical, indexable, published URLs:
 *
 *   * the homepage;
 *   * the archive (first page only — the paginated pages are
 *     discoverable through the pagination links, and listing every
 *     page invites thin-content duplication);
 *   * every published article;
 *   * every category that actually has articles.
 *
 * Drafts, archived articles and unpublished slugs are excluded by
 * construction: the upstream public list only ever returns published
 * articles (AC-06).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { publication } = getConfig();

  const [articles, categories] = await Promise.all([
    getAllPublishedArticles(),
    getCategories(),
  ]);

  const entries: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl('/'),
      lastModified: articles[0]?.publishedAt ?? new Date(0),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: absoluteUrl('/articles'),
      lastModified: articles[0]?.publishedAt ?? new Date(0),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: absoluteUrl('/about'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: absoluteUrl('/editorial-policy'),
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: absoluteUrl('/privacy'),
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: absoluteUrl('/terms'),
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: absoluteUrl('/contact'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  for (const article of articles) {
    entries.push({
      url: absoluteUrl(articlePath(article.slug)),
      lastModified: article.modifiedAt ?? article.publishedAt,
      changeFrequency: 'monthly',
      priority: 0.7,
    });
  }

  // Only categories that actually contain published articles. A
  // category page with no articles is a thin page and must not be
  // advertised for indexing.
  const categoryIds = new Set(
    articles.flatMap((article) => article.categories.map((c) => c.id)),
  );
  for (const category of categories) {
    if (categoryIds.has(category.id)) {
      entries.push({
        url: absoluteUrl(categoryPath(category.slug)),
        lastModified: articles[0]?.publishedAt ?? new Date(0),
        changeFrequency: 'weekly',
        priority: 0.5,
      });
    }
  }

  void publication;
  return entries;
}
