import Link from 'next/link';
import { BrandMark } from '@/components/Logo';

const RESOURCE_LINKS = [
  { href: '/articles', label: 'Articles' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/feed.xml', label: 'RSS feed' },
] as const;

const LEGAL_LINKS = [
  { href: '/editorial-policy', label: 'Editorial policy' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
] as const;

export function SiteFooter({
  name,
  description,
  contactEmail,
}: {
  name: string;
  description: string;
  contactEmail: string;
}) {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-8 overflow-hidden bg-night text-white/70">
      {/* Giant watermark of the viewfinder mark — a signature backdrop. */}
      <BrandMark
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-16 -right-10 h-72 w-72 rotate-12 text-white/[0.04]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-accent via-gold to-transparent"
      />
      <div className="relative mx-auto w-full max-w-6xl px-5 py-14">
        <div className="grid gap-10 sm:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <BrandMark className="h-8 w-8 text-gold" />
              <p className="font-serif text-3xl font-black tracking-tight text-white">
                {name}
              </p>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
              {description}
            </p>
            <a
              href={`mailto:${contactEmail}`}
              className="mt-4 inline-block text-sm font-medium text-gold underline decoration-gold/45 underline-offset-4 transition-colors hover:decoration-gold"
            >
              {contactEmail}
            </a>
          </div>

          <nav aria-label="Resources">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
              Resources
            </h2>
            <ul className="mt-5 space-y-3 text-sm">
              {RESOURCE_LINKS.map((link) => (
                <li key={link.href}>
                  <FooterLink href={link.href}>{link.label}</FooterLink>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Legal">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
              Legal
            </h2>
            <ul className="mt-5 space-y-3 text-sm">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <FooterLink href={link.href}>{link.label}</FooterLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/45">
          <p>
            © {year} {name}. Content published from Calliope. Reading
            requires no account.
          </p>
          <p className="flex items-center gap-1.5">
            <BrandMark className="h-4 w-4 text-gold" />
            There’s more to the question.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const className =
    'text-white/65 underline decoration-transparent underline-offset-4 transition-colors hover:text-white hover:decoration-white/40';
  return href === '/feed.xml' ? (
    <a href={href} className={className}>
      {children}
    </a>
  ) : (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
