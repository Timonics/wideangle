import type { MetadataRoute } from 'next';
import { getConfig } from '@/lib/config';

export const revalidate = 3600;

/**
 * robots.txt.
 *
 * The crawl rules are permissive on purpose: every public page is
 * meant to be indexed. robots.txt is NOT used to protect private
 * content — unpublished content is simply not served at all, and
 * blocking it here would only hide it from crawlers that could never
 * reach it anyway (PRD §13).
 */
export default function robots(): MetadataRoute.Robots {
  const { canonicalOrigin } = getConfig().publication;

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
    sitemap: `${canonicalOrigin}/sitemap.xml`,
    host: canonicalOrigin,
  };
}
