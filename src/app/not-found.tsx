import Link from 'next/link';

/**
 * The not-found page.
 *
 * Reached for a genuinely missing or unpublished article (AC-04,
 * AC-07). It is deliberately NOT used for upstream failures — those
 * go to `error.tsx` and render with a 5xx status (AC-08).
 */
export default function NotFound() {
  return (
    <div className="py-12">
      <h1 className="font-serif text-4xl font-semibold tracking-tight">
        Page not found
      </h1>
      <p className="mt-3 text-muted">
        This page does not exist, or the article it referred to is no longer
        published.
      </p>
      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <Link
          href="/articles"
          className="rounded-lg bg-accent px-4 py-2 font-medium text-paper transition-colors hover:bg-accent-deep"
        >
          Browse the archive
        </Link>
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
