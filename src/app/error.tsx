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
    <div className="relative overflow-hidden py-12">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">
        Something went wrong
      </p>
      <h1 className="mt-2 font-serif text-4xl font-black tracking-tight sm:text-5xl">
        Temporarily unavailable
      </h1>
      <p className="mt-3 max-w-xl text-muted">
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
          className="rounded-full bg-accent px-5 py-2 font-semibold text-white transition-colors hover:bg-accent-deep"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-full border border-line px-5 py-2 font-semibold transition-colors hover:border-gold hover:text-gold"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
