import { getConfig } from '@/lib/config';
import { getAllPublishedArticles } from '@/lib/data';
import { absoluteUrl, articlePath } from '@/lib/urls';
import { articleDescription, toRfc822 } from '@/lib/seo';

export const revalidate = 300;

/**
 * The RSS 2.0 feed.
 *
 * Contains published articles only — the upstream public list never
 * returns drafts or archived articles, so the feed cannot leak
 * unpublished content (AC-06).
 *
 * Served from a Route Handler rather than a metadata route because the
 * feed needs a precise `application/rss+xml` content type and an
 * explicit XML body.
 */
export async function GET(): Promise<Response> {
  const { publication } = getConfig();
  const articles = await getAllPublishedArticles();

  const items = articles
    .filter((article) => article.publishedAt !== '')
    .map((article) => {
      const url = absoluteUrl(articlePath(article.slug));
      const description = articleDescription(article);
      return `    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <pubDate>${toRfc822(article.publishedAt)}</pubDate>
      <description>${escapeXml(description)}</description>
${article.author.name !== '' ? `      <dc:creator>${escapeXml(article.author.name)}</dc:creator>\n` : ''}${article.categories
        .map(
          (category) =>
            `      <category>${escapeXml(category.name)}</category>`,
        )
        .join('\n')}${article.categories.length > 0 ? '\n' : ''}    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(publication.name)}</title>
    <link>${escapeXml(publication.canonicalOrigin)}</link>
    <description>${escapeXml(publication.description)}</description>
    <language>${escapeXml(publication.locale)}</language>
    <lastBuildDate>${toRfc822(articles[0]?.publishedAt ?? new Date(0).toISOString())}</lastBuildDate>
    <atom:link href="${escapeXml(absoluteUrl('/feed.xml'))}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600',
    },
  });
}

/**
 * Escape XML text content.
 *
 * XML entities must be escaped in a feed; an unescaped `&` in an
 * article title would produce an invalid feed that readers reject.
 */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
