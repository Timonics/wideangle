import Link from 'next/link';
import { BrandMark } from '@/components/Logo';

/**
 * The not-found page.
 *
 * Reached for a genuinely missing or unpublished article (AC-04,
 * AC-07). It is deliberately NOT used for upstream failures — those
 * go to `error.tsx` and render with a 5xx status (AC-08).
 */
export default function NotFound() {
  return (
    <div className="relative overflow-hidden py-12">
      <BrandMark
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-8 h-48 w-48 text-accent/10"
      />
      <div className="relative">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">
          Error 404
        </p>
        <h1 className="mt-2 font-serif text-4xl font-black tracking-tight sm:text-5xl">
          Page not found
        </h1>
        <p className="mt-3 max-w-xl text-muted">
          This page does not exist, or the article it referred to is no
          longer published.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <Link
            href="/articles"
            className="rounded-full bg-accent px-5 py-2 font-semibold text-white transition-colors hover:bg-accent-deep"
          >
            Browse the archive
          </Link>
          <Link
            href="/"
            className="rounded-full border border-line px-5 py-2 font-semibold transition-colors hover:border-gold hover:text-gold"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
