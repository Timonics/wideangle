/**
 * The Calliope HTTP client.
 *
 * Responsibilities, and nothing else:
 *
 *   * build URLs against the configured base + blog scope;
 *   * apply a hard timeout so a hung upstream cannot hang the page;
 *   * classify failures into "not found", "upstream unavailable" and
 *     "upstream misbehaving" — the frontend MUST distinguish these
 *     (AC-07 vs AC-08: a timeout is never a permanent 404);
 *   * never send a mutating request (AC-02).
 *
 * The client is READ-ONLY by construction: there is no method on it
 * that can issue a POST/PATCH/DELETE.
 */

import { getConfig } from '../config';
import { upstreamEnvelopeSchema, upstreamErrorSchema } from './schema';

export class UpstreamNotFoundError extends Error {
  public readonly code: string;

  public constructor(code: string, message: string) {
    super(message);
    this.name = 'UpstreamNotFoundError';
    this.code = code;
  }
}

export class UpstreamUnavailableError extends Error {
  public readonly cause?: unknown;

  public constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'UpstreamUnavailableError';
    this.cause = cause;
  }
}

export class UpstreamContractError extends Error {
  public readonly cause?: unknown;

  public constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'UpstreamContractError';
    this.cause = cause;
  }
}

export interface UpstreamRequestOptions {
  /** Path relative to the blog scope, e.g. `articles`. */
  path: string;
  query?: Record<string, string | number | undefined>;
  signal?: AbortSignal;
}

/**
 * Build a scoped URL for a blog.
 *
 * When Calliope advertises publication-scoped reads, the publication id
 * is added as a query parameter. It is NOT added by default: the
 * current API ignores unknown query parameters, so sending one would
 * make scope look implemented when it is not (AC-14 requires the scope
 * to be *addable*, not to be assumed).
 */
export function buildScopedUrl(
  baseUrl: string,
  blogId: string,
  path: string,
  query: Record<string, string | number | undefined> = {},
  publicationId?: string,
  supportsPublicationScope = false,
): string {
  const url = new URL(`/v1/blogs/${encodeURIComponent(blogId)}/${path}`, baseUrl);

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) {
      continue;
    }
    url.searchParams.set(key, String(value));
  }

  if (supportsPublicationScope && publicationId !== undefined) {
    url.searchParams.set('publicationId', publicationId);
  }

  return url.toString();
}

/** Perform a GET against Calliope and return the raw response body. */
export async function calliopeGet(
  options: UpstreamRequestOptions,
): Promise<{ body: unknown; etag: string | null }> {
  const config = getConfig();
  const url = buildScopedUrl(
    config.calliope.baseUrl,
    config.calliope.blogId,
    options.path,
    options.query,
    config.publication.publicationId,
    config.calliope.supportsPublicationScope,
  );

  const timeout = AbortSignal.timeout(config.calliope.timeoutMs);
  const signal = options.signal
    ? AbortSignal.any([timeout, options.signal])
    : timeout;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      signal,
      headers: { Accept: 'application/json' },
      // The upstream sets its own ETag; Next's data cache handles
      // revalidation. A CDN in front of WideAngle owns the public
      // cache semantics.
      cache: 'no-store',
    });
  } catch (error) {
    throw new UpstreamUnavailableError(
      `Calliope request failed: ${String(error)}`,
      error,
    );
  }

  if (response.status === 404) {
    const parsed = upstreamErrorSchema.safeParse(await safeJson(response));
    throw new UpstreamNotFoundError(
      parsed.success && parsed.data.code !== undefined
        ? parsed.data.code
        : 'not_found',
      parsed.success && parsed.data.message !== undefined
        ? parsed.data.message
        : 'Upstream resource not found',
    );
  }

  if (response.status === 401 || response.status === 403) {
    throw new UpstreamContractError(
      `Calliope refused a public read with ${response.status}. The blog id ` +
        'or the service credential is wrong; public reads must not need a token.',
    );
  }

  if (!response.ok) {
    throw new UpstreamUnavailableError(
      `Calliope responded with ${response.status} ${response.statusText}`,
    );
  }

  const etag = response.headers.get('etag');
  const body = await safeJson(response);
  return { body, etag };
}

/** GET a list envelope. Malformed payloads yield an empty page. */
export async function calliopeGetEnvelope(
  options: UpstreamRequestOptions,
): Promise<{ data: unknown[]; total: number; page: number; pageSize: number }> {
  const { body } = await calliopeGet(options);
  const parsed = upstreamEnvelopeSchema.safeParse(body);
  if (!parsed.success) {
    return { data: [], total: 0, page: 1, pageSize: 20 };
  }
  return {
    data: parsed.data.data,
    total: parsed.data.meta.total,
    page: parsed.data.meta.page,
    pageSize: parsed.data.meta.pageSize,
  };
}

/** GET a single resource, parsed against a schema. */
export async function calliopeGetOne<T>(
  options: UpstreamRequestOptions,
  schema: { safeParse(value: unknown): { success: boolean; data?: T } },
): Promise<T> {
  const { body } = await calliopeGet(options);
  const parsed = schema.safeParse(body);
  if (!parsed.success || parsed.data === undefined) {
    throw new UpstreamContractError(
      'Calliope returned a payload that does not match the expected shape.',
    );
  }
  return parsed.data;
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
