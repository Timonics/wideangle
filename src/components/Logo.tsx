import Link from 'next/link';

/**
 * The publication mark: a viewfinder frame with a lens dot — a
 * camera reference that reads clearly at favicon size.
 *
 * Drawn with strokes so it inherits `currentColor` and works in both
 * light and dark themes. `ViewfinderMark` is exported separately so
 * the favicon (`src/app/icon.svg`) can reuse the same geometry.
 */
export function ViewfinderMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M4 10V7a3 3 0 0 1 3-3h3" />
      <path d="M22 4h3a3 3 0 0 1 3 3v3" />
      <path d="M28 22v3a3 3 0 0 1-3 3h-3" />
      <path d="M10 28H7a3 3 0 0 1-3-3v-3" />
      <circle cx="16" cy="16" r="4.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * Wordmark + viewfinder mark, linking home. A plain link (no client
 * JS) so the header keeps working without JavaScript (AC-12). Pass
 * `onDark` when the logo sits on a dark surface (the dark header bar).
 */
export function Logo({ name, onDark = false }: { name: string; onDark?: boolean }) {
  return (
    <Link
      href="/"
      className="group flex items-center gap-2.5"
      aria-label={`${name} — home`}
    >
      <ViewfinderMark className="h-7 w-7 text-accent transition-colors group-hover:text-accent-deep" />
      <span
        className={`font-serif text-xl font-semibold tracking-tight ${
          onDark ? 'text-white' : 'text-ink'
        }`}
      >
        {name}
      </span>
    </Link>
  );
}
