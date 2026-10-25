import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { getConfig } from '@/lib/config';
import { absoluteUrl } from '@/lib/urls';

/**
 * Root layout.
 *
 * The publication identity is read from configuration. There is no
 * dashboard, no login and no editor here — the whole application is
 * public content (AC-03).
 */
export function generateMetadata(): Metadata {
  const config = getConfig();
  const { publication } = config;

  return {
    metadataBase: new URL(publication.canonicalOrigin),
    title: {
      default: publication.name,
      template: `%s — ${publication.name}`,
    },
    description: publication.description,
    applicationName: publication.name,
    authors: [{ name: publication.name }],
    openGraph: {
      type: 'website',
      siteName: publication.name,
      locale: publication.locale,
      url: publication.canonicalOrigin,
    },
    twitter: {
      card: 'summary_large_image',
    },
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: publication.canonicalOrigin,
      types: {
        'application/rss+xml': absoluteUrl('/feed.xml'),
      },
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = getConfig();

  return (
    <html lang={config.publication.locale}>
      <body className="min-h-screen bg-white text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-neutral-900 focus:px-4 focus:py-2 focus:text-white dark:focus:bg-neutral-100 dark:focus:text-neutral-900"
        >
          Skip to content
        </a>

        <SiteHeader name={config.publication.name} />

        <main id="main" className="mx-auto w-full max-w-3xl px-5 pb-16 pt-10">
          {children}
        </main>

        <SiteFooter
          name={config.publication.name}
          contactEmail={config.contactEmail}
        />
      </body>
    </html>
  );
}

function SiteHeader({ name }: { name: string }) {
  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-5 py-4">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight hover:underline"
        >
          {name}
        </Link>
        {/* Plain anchors, no client-side menu: the navigation must work
            without JavaScript (AC-12). */}
        <nav aria-label="Primary">
          <ul className="flex items-center gap-4 text-sm sm:gap-6">
            <li>
              <Link href="/articles" className="hover:underline">
                Articles
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:underline">
                About
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:underline">
                Contact
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

function SiteFooter({
  name,
  contactEmail,
}: {
  name: string;
  contactEmail: string;
}) {
  return (
    <footer className="border-t border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto w-full max-w-3xl px-5 py-8 text-sm text-neutral-600 dark:text-neutral-400">
        <p>
          {name}. Content published from Calliope. Reading requires no account.
        </p>
        <nav aria-label="Footer" className="mt-3">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            <li>
              <Link href="/about" className="hover:underline">
                About
              </Link>
            </li>
            <li>
              <Link href="/editorial-policy" className="hover:underline">
                Editorial policy
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:underline">
                Privacy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:underline">
                Terms
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:underline">
                Contact
              </Link>
            </li>
            <li>
              <a href="/feed.xml" className="hover:underline">
                RSS
              </a>
            </li>
          </ul>
        </nav>
        <p className="mt-4">
          Contact:{' '}
          <a href={`mailto:${contactEmail}`} className="hover:underline">
            {contactEmail}
          </a>
        </p>
      </div>
    </footer>
  );
}
