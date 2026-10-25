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
      <h1 className="text-3xl font-bold tracking-tight">Page not found</h1>
      <p className="mt-3 text-neutral-600 dark:text-neutral-400">
        This page does not exist, or the article it referred to is no longer
        published.
      </p>
      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <Link
          href="/articles"
          className="rounded border border-neutral-900 bg-neutral-900 px-4 py-2 font-medium text-white hover:bg-neutral-700 dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          Browse the archive
        </Link>
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
