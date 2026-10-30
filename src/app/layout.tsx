import type { Metadata } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import './globals.css';
import { getConfig } from '@/lib/config';
import { absoluteUrl } from '@/lib/urls';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';

const fraunces = Fraunces({
  subsets: ['latin'],
  axes: ['opsz'],
  variable: '--font-fraunces',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

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
    <html
      lang={config.publication.locale}
      className={`${fraunces.variable} ${inter.variable}`}
    >
      <head>
        {/* Apply the persisted theme before first paint to avoid a
            flash of the wrong theme. Light is the default. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('theme')==='dark'){document.documentElement.classList.add('dark')}}catch(e){}",
          }}
        />
      </head>
      <body className="flex min-h-screen flex-col bg-paper font-sans text-ink antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-accent focus:px-4 focus:py-2 focus:text-paper"
        >
          Skip to content
        </a>

        <SiteHeader name={config.publication.name} />

        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-5 pb-16 pt-10">
          {children}
        </main>

        <SiteFooter
          name={config.publication.name}
          description={config.publication.description}
          contactEmail={config.contactEmail}
        />
      </body>
    </html>
  );
}
