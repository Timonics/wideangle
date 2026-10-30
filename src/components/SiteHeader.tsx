import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CategoryBar } from '@/components/CategoryBar';

const PRIMARY_LINKS = [
  { href: '/articles', label: 'Articles' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
] as const;

/**
 * The site header: a dark full-width bar (logo left, bold white nav,
 * RSS pill and theme toggle right) with a light category strip
 * underneath — date, category links, and a compact search box.
 *
 * The desktop nav is plain links. On small screens it collapses into a
 * menu built on the native `<details>` element, so it opens and closes
 * with zero JavaScript — the navigation works fully without JS (AC-12).
 */
export function SiteHeader({ name }: { name: string }) {
  return (
    <header className="sticky top-0 z-40 shadow-lg shadow-black/5">
      <div className="bg-[#181626] dark:bg-[#1e1c33]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
          <Logo name={name} onDark />
          <div className="flex items-center gap-2 sm:gap-4">
            <nav aria-label="Primary" className="hidden sm:block">
              <ul className="flex items-center gap-6 text-sm font-semibold text-white/85">
                {PRIMARY_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <a
              href="/feed.xml"
              className="hidden items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-accent-deep sm:inline-flex"
            >
              <RssIcon />
              RSS
            </a>

            <div className="flex items-center gap-2">
              <ThemeToggle onDark />

              <details className="group relative sm:hidden">
                <summary
                  aria-label="Menu"
                  className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full border border-white/25 text-white/85 transition-colors hover:border-accent hover:text-white [&::-webkit-details-marker]:hidden"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden="true"
                    className="h-4 w-4"
                  >
                    <line x1="4" y1="7" x2="20" y2="7" />
                    <line x1="4" y1="12" x2="20" y2="12" />
                    <line x1="4" y1="17" x2="20" y2="17" />
                  </svg>
                </summary>
                <nav
                  aria-label="Primary"
                  className="absolute right-0 top-11 z-50 w-56 rounded-xl border border-white/10 bg-[#221f36] p-2 shadow-xl"
                >
                  <ul className="text-sm font-medium">
                    {PRIMARY_LINKS.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className="block rounded-lg px-3 py-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                    <li>
                      <a
                        href="/feed.xml"
                        className="mt-1 flex items-center gap-2 rounded-lg bg-accent px-3 py-2 font-semibold text-white transition-colors hover:bg-accent-deep"
                      >
                        <RssIcon />
                        RSS feed
                      </a>
                    </li>
                  </ul>
                  <div className="mt-2 border-t border-white/10 pt-2">
                    <SearchFormMobile />
                  </div>
                </nav>
              </details>
            </div>
          </div>
        </div>
      </div>
      <CategoryBar />
    </header>
  );
}

function SearchFormMobile() {
  return (
    <form action="/articles" method="get" role="search" className="flex">
      <label htmlFor="mobile-search" className="sr-only">
        Search articles
      </label>
      <input
        id="mobile-search"
        name="q"
        type="search"
        placeholder="Search articles…"
        className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-accent"
      />
    </form>
  );
}

function RssIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      className="h-3.5 w-3.5"
    >
      <path d="M4 11a9 9 0 0 1 9 9" />
      <path d="M4 4a16 16 0 0 1 16 16" />
      <circle cx="5" cy="19" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
