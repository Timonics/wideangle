import Link from 'next/link';

/**
 * An editorial section header: a serif heading sitting on a hairline
 * rule, with an optional action link ("View all", "More in X") at the
 * right end. Used for the story sections on the front page.
 */
export function SectionLabel({
  id,
  children,
  action,
}: {
  id?: string;
  children: React.ReactNode;
  action?: { href: string; label: string };
}) {
  return (
    <div className="mb-8 flex flex-wrap items-baseline gap-x-4 gap-y-2 border-b-2 border-ink pb-3 sm:mb-10 sm:gap-x-5">
      <h2
        id={id}
        className="min-w-0 shrink font-serif text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl"
      >
        {children}
      </h2>
      <span
        aria-hidden="true"
        className="mb-1 hidden h-px flex-1 bg-line sm:block"
      />
      {action !== undefined ? (
        <Link
          href={action.href}
          className="shrink-0 text-xs font-bold uppercase tracking-[0.15em] text-gold underline decoration-gold/40 underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
