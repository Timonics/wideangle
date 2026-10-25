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
      <h1 className="text-3xl font-bold tracking-tight">
        Temporarily unavailable
      </h1>
      <p className="mt-3 text-neutral-600 dark:text-neutral-400">
        We could not reach the content service. The article may still exist —
        this is a temporary failure, not a missing page.
      </p>

      {error.digest !== undefined ? (
        <p className="mt-2 text-sm text-neutral-500">
          Reference: <code className="font-mono">{error.digest}</code>
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <button
          type="button"
          onClick={reset}
          className="rounded border border-neutral-900 bg-neutral-900 px-4 py-2 font-medium text-white hover:bg-neutral-700 dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          Try again
        </button>
        <Link
          href="/articles"
          className="rounded border border-neutral-300 px-4 py-2 font-medium hover:border-neutral-500 dark:border-neutral-700"
        >
          Browse the archive
        </Link>
      </div>
    </div>
  );
}
