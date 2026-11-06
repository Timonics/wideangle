import Link from 'next/link';

/**
 * The WideAngle mark: a "W" monogram whose outer arms flare outward
 * like a wide-angle beam opening up, with a single filled focal dot —
 * the lens — resting in the counterform. That dot is the brand in
 * miniature: the focal point, and "more to the question".
 *
 * Drawn with strokes so it inherits `currentColor` and works in both
 * light and dark themes; the dot is always solid. `BrandMark` is
 * exported separately so the favicon (`src/app/icon.svg`) can reuse
 * the same geometry.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M4.5 5.5 L11 25.5 L16 12.5 L21 25.5 L27.5 5.5" />
      <circle cx="16" cy="19.5" r="2.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * Wordmark + brand mark, linking home. A plain link (no client
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
      <BrandMark className="h-7 w-7 text-accent transition-colors group-hover:text-gold" />
      <span
        className={`font-serif text-2xl font-black tracking-tight ${
          onDark ? 'text-white' : 'text-ink'
        }`}
      >
        {name}
      </span>
    </Link>
  );
}
