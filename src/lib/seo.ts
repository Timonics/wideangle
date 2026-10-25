/**
 * Metadata + structured data helpers.
 *
 * Two rules drive everything here:
 *
 *   1. Metadata must MATCH what is visible on the page. A description
 *      that is not on the page is a lie to the search engine (AC-05).
 *   2. Modification dates must be genuine. A deployment timestamp is
 *      not a modification date and must never be used as one
 *      (AC-05 / PRD §13 "no deployment-driven date inflation").
 */

import { getConfig } from './config';
import { safeUrl } from './render/safe';
import type { ArticleView } from './types';
import { absoluteUrl, articlePath } from './urls';

/**
 * Build the title for an article.
 *
 * Returns the article title ONLY. The publication name is appended by
 * the root layout's title template (`%s — <publication name>`), so
 * appending it here as well would render the name twice.
 */
export function articleTitle(article: ArticleView): string {
  return article.title;
}

/**
 * Build the description for an article.
 *
 * Uses the excerpt when present. Falls back to the first paragraph of
 * the body, because a description is required and an empty one is
 * worse than a real sentence from the article.
 */
export function articleDescription(article: ArticleView): string {
  if (article.excerpt !== undefined && article.excerpt.trim() !== '') {
    return truncate(article.excerpt.trim(), 300);
  }
  const firstParagraph = article.body.find(
    (block) => block.type === 'paragraph' && typeof block.data.text === 'string',
  );
  if (firstParagraph !== undefined) {
    const text = String(firstParagraph.data.text).replace(/\s+/g, ' ').trim();
    if (text !== '') {
      return truncate(text, 300);
    }
  }
  return getConfig().publication.description;
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }
  const clipped = text.slice(0, max);
  const lastSpace = clipped.lastIndexOf(' ');
  const base = lastSpace > max * 0.6 ? clipped.slice(0, lastSpace) : clipped;
  return `${base.replace(/[\s.,;:]+$/, '')}…`;
}

/** The article's canonical URL. */
export function articleCanonical(article: ArticleView): string {
  return absoluteUrl(articlePath(article.slug));
}

/**
 * Build the BlogPosting structured data for an article.
 *
 * The payload only contains fields that are genuinely visible on the
 * page. In particular there is no `aggregateRating` and no invented
 * `description` — a fabricated rating is a manual-action risk and
 * PRD §13 forbids it explicitly.
 */
export function articleJsonLd(article: ArticleView): Record<string, unknown> {
  const config = getConfig();
  const canonical = articleCanonical(article);

  const payload: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    url: canonical,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonical,
    },
    datePublished: article.publishedAt,
    author: {
      '@type': 'Person',
      name: article.author.name,
      ...(article.author.imageUrl === undefined
        ? {}
        : { image: article.author.imageUrl }),
    },
    publisher: {
      '@type': 'Organization',
      name: config.publication.name,
      ...(config.publication.canonicalOrigin === ''
        ? {}
        : { url: config.publication.canonicalOrigin }),
    },
  };

  // A genuine modification date only. When the upstream does not
  // publish one, the field is OMITTED — never filled with the
  // current time.
  if (article.modifiedAt !== undefined) {
    payload.dateModified = article.modifiedAt;
  }

  const description = articleDescription(article);
  if (description !== '') {
    payload.description = description;
  }

  const image = safeUrl(
    article.seo?.socialImageUrl ?? article.heroImage?.url,
  );
  if (image !== null) {
    payload.image = image;
  }

  if (article.categories.length > 0) {
    payload.articleSection = article.categories.map((category) => category.name);
  }

  if (article.tags.length > 0) {
    payload.keywords = article.tags.map((tag) => tag.name).join(', ');
  }

  return payload;
}

/** Build the JSON-LD for a non-article page (WebPage + breadcrumb). */
export function pageJsonLd(options: {
  name: string;
  description: string;
  canonicalPath: string;
  breadcrumb: Array<{ name: string; path: string }>;
}): Record<string, unknown> {
  const canonical = absoluteUrl(options.canonicalPath);
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: options.name,
    description: options.description,
    url: canonical,
    isPartOf: {
      '@type': 'WebSite',
      name: getConfig().publication.name,
      url: getConfig().publication.canonicalOrigin,
    },
    breadcrumb: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: options.breadcrumb.map((entry, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: entry.name,
        item: absoluteUrl(entry.path),
      })),
    },
  };
}

/** Format an ISO timestamp as a human-readable date. */
export function formatDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}

/** Format an ISO timestamp as an RFC-822 date (RSS). */
export function toRfc822(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(0).toUTCString();
  }
  return parsed.toUTCString();
}
