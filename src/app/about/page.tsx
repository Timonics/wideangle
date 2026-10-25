import type { Metadata } from 'next';
import Link from 'next/link';
import { getConfig } from '@/lib/config';
import { getAuthors } from '@/lib/data';
import { pageJsonLd } from '@/lib/seo';

export const revalidate = 3600;

export function generateMetadata(): Metadata {
  const { publication } = getConfig();
  return {
    title: 'About',
    description: `About ${publication.name} and the person behind it.`,
    alternates: { canonical: '/about' },
  };
}

export default async function AboutPage() {
  const { publication } = getConfig();
  const authors = await getAuthors();
  const author = authors[0];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            pageJsonLd({
              name: 'About',
              description: `About ${publication.name} and the person behind it.`,
              canonicalPath: '/about',
              breadcrumb: [
                { name: publication.name, path: '/' },
                { name: 'About', path: '/about' },
              ],
            }),
          ),
        }}
      />

      <h1 className="text-3xl font-bold tracking-tight">About</h1>

      <div className="prose-wideangle mt-6">
        <p>
          {publication.name} is a single-author publication. Everything here is
          written and edited by one person.
        </p>
        <p>
          The publication covers {publication.description.toLowerCase()}
        </p>

        {author !== undefined ? (
          <>
            <h2>The author</h2>
            <p>
              Articles are written by{' '}
              <strong className="font-semibold">{author.name}</strong>.
              {author.bio !== undefined ? ` ${author.bio}` : null}
            </p>
          </>
        ) : null}

        <h2>How this site works</h2>
        <p>
          Content is written and published in a separate content service. This
          site reads published articles from that service and renders them.
          Reading requires no account, no sign-in and no cookies.
        </p>
        <p>
          When an article is edited, the change appears here within a few
          minutes. When an article is withdrawn, it stops appearing here within
          the same window.
        </p>

        <h2>Corrections</h2>
        <p>
          If something here is wrong, please{' '}
          <Link href="/contact" className="underline">
            get in touch
          </Link>
          . Corrections are made by editing the original article, and the
          article&apos;s original publication date is preserved.
        </p>
      </div>
    </>
  );
}
