'use client';

import Link from 'next/link';

/**
 * The route-level error boundary.
 *
 * This is what an upstream outage lands on. It is NOT a 404: Next
 * renders the error boundary with a 500 status, so a crawler sees a
 * server error rather than "this article does not exist" (AC-08).
 *
 * The message is deliberately generic. Upstream hostnames, tokens and
 * stack traces must never reach a public response (AC-10).
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="py-12">
      <h1 className="font-serif text-4xl font-semibold tracking-tight">
        Temporarily unavailable
      </h1>
      <p className="mt-3 text-muted">
        We could not reach the content service. The article may still exist —
        this is a temporary failure, not a missing page.
      </p>

      {error.digest !== undefined ? (
        <p className="mt-2 text-sm text-muted">
          Reference: <code className="font-mono">{error.digest}</code>
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-accent px-4 py-2 font-medium text-paper transition-colors hover:bg-accent-deep"
        >
          Try again
        </button>
        <Link
          href="/articles"
          className="rounded-lg border border-line px-4 py-2 font-medium transition-colors hover:border-accent hover:text-accent"
        >
          Browse the archive
        </Link>
      </div>
    </div>
  );
}
