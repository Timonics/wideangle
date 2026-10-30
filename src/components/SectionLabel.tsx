import Link from 'next/link';

/**
 * A slanted accent label with an extending rule — the section marker
 * used across the homepage. An optional action link (e.g. "View all")
 * sits at the right end of the rule.
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
    <div className="mb-6 flex items-center gap-4 sm:mb-8">
      <h2
        id={id}
        className="-skew-x-6 rounded-md bg-accent px-4 py-2 text-sm font-bold uppercase tracking-wider text-white"
      >
        <span className="block skew-x-6">{children}</span>
      </h2>
      <span aria-hidden="true" className="h-px flex-1 bg-line" />
      {action !== undefined ? (
        <Link
          href={action.href}
          className="shrink-0 rounded-full border border-line px-4 py-1.5 text-sm font-semibold text-muted transition-colors hover:border-accent hover:text-accent"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
