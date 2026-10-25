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
      <h1 className="text-3xl font-bold tracking-tight">
        Temporarily unavailable
      </h1>
      <p className="mt-3 text-neutral-600 dark:text-neutral-400">
        We could not reach the content service. Please try again in a moment.
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
          href="/"
          className="rounded border border-neutral-300 px-4 py-2 font-medium hover:border-neutral-500 dark:border-neutral-700"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
