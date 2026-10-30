import Link from 'next/link';
import { ViewfinderMark } from '@/components/Logo';

/**
 * Shared empty state: an accent icon medallion, a serif title, a muted
 * explanation, and an optional action button. Used everywhere a
 * section or listing has nothing to show yet.
 */
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: React.ReactNode;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-line bg-surface/50 px-6 py-14 text-center sm:py-16">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent">
        <ViewfinderMark className="h-7 w-7" />
      </span>
      <p className="mt-5 font-serif text-xl font-semibold tracking-tight text-ink">
        {title}
      </p>
      {children !== undefined ? (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
          {children}
        </p>
      ) : null}
      {action !== undefined ? (
        <Link
          href={action.href}
          className="mt-6 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-deep"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
