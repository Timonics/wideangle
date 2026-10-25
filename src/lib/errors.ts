/**
 * Upstream failure classification for pages.
 *
 * The distinction that matters (AC-07 / AC-08):
 *
 *   * "This article does not exist" → a genuine 404. The upstream
 *     answered 404, so the article genuinely is not published.
 *   * "I could not reach the upstream" → NOT a 404. The article may
 *     well exist; we simply do not know right now. A timeout must
 *     never become a permanent missing-article response.
 *
 * Everything that is not a genuine upstream 404 is surfaced as a
 * service error so the reader sees "temporarily unavailable" and the
 * crawler sees a non-404 status.
 */

import { UpstreamContractError, UpstreamNotFoundError, UpstreamUnavailableError } from './calliope/client';

export { UpstreamContractError, UpstreamNotFoundError, UpstreamUnavailableError };

/** True when the failure means "this article genuinely does not exist". */
export function isGenuineMissing(error: unknown): boolean {
  return error instanceof UpstreamNotFoundError;
}

/** True when the failure is a transient upstream/transport problem. */
export function isUpstreamUnavailable(error: unknown): boolean {
  return (
    error instanceof UpstreamUnavailableError ||
    error instanceof UpstreamContractError
  );
}

/**
 * A short, non-technical message for the reader.
 *
 * It must not leak upstream internals (hostnames, tokens, stack
 * traces) into a public response (AC-10).
 */
export function publicErrorMessage(error: unknown): string {
  if (isUpstreamUnavailable(error)) {
    return 'The content service is temporarily unavailable. Please try again shortly.';
  }
  return 'Something went wrong while loading this page.';
}
