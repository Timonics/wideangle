/**
 * URL construction.
 *
 * Every canonical URL, sitemap entry and feed item is derived from
 * trusted configuration (the canonical origin) plus validated route
 * segments. Nothing user-supplied is ever concatenated into an origin
 * or a host.
 */

import { getConfig } from './config';

/** Normalise a path segment for use in a URL. */
export function encodeSegment(segment: string): string {
  return encodeURIComponent(segment);
}

/**
 * A slug is safe in a URL path only if it looks like one. Upstream
 * slugs are editor-controlled; a slug containing a slash or a scheme
 * must never be able to escape its route.
 */
export function isSafeSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug);
}

/** Build an absolute URL on the canonical origin. */
export function absoluteUrl(path: string): string {
  const { canonicalOrigin } = getConfig().publication;
  const normalised = path.startsWith('/') ? path : `/${path}`;
  return `${canonicalOrigin}${normalised}`;
}

/** Build a site-relative URL. */
export function siteUrl(path: string): string {
  const normalised = path.startsWith('/') ? path : `/${path}`;
  return normalised;
}

export function articlePath(slug: string): string {
  return `/articles/${encodeSegment(slug)}`;
}

export function categoryPath(slug: string): string {
  return `/categories/${encodeSegment(slug)}`;
}

export function articlesPath(page?: number): string {
  if (page === undefined || page <= 1) {
    return '/articles';
  }
  return `/articles?page=${page}`;
}
