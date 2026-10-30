'use client';

import Link from 'next/link';

/**
 * The root error boundary.
 *
 * Covers upstream failures on the homepage, the archive, the category
 * pages and the discovery files. Renders with a 5xx status.
 */
export default function RootErrorBoundary({
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
        We could not reach the content service. Please try again in a moment.
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
          href="/"
          className="rounded-lg border border-line px-4 py-2 font-medium transition-colors hover:border-accent hover:text-accent"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
