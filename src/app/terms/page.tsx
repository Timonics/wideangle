import type { Metadata } from 'next';
import { getConfig } from '@/lib/config';

export const revalidate = 3600;

export function generateMetadata(): Metadata {
  const { publication } = getConfig();
  return {
    title: 'Terms',
    description: `Terms of use for ${publication.name}.`,
    alternates: { canonical: '/terms' },
  };
}

export default function TermsPage() {
  const { publication } = getConfig();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-serif text-4xl font-semibold tracking-tight">Terms</h1>

      <div className="prose-wideangle mt-6">
        <h2>Use of this site</h2>
        <p>
          {publication.name} publishes articles for general reading. You may
          read, link to and quote from these articles with attribution.
          Republishing an article in full, or presenting it as your own work,
          requires the author&apos;s permission.
        </p>

        <h2>Accuracy</h2>
        <p>
          Articles are written in good faith, but they are not warranties. The
          author is not liable for any loss arising from reliance on the
          content of an article. If you find an error, please report it — see
          the{' '}
          <a href="/contact" className="underline">
            contact page
          </a>
          .
        </p>

        <h2>Links</h2>
        <p>
          Articles may link to other sites. The author does not control those
          sites and is not responsible for their content.
        </p>

        <h2>Changes</h2>
        <p>
          These terms may be updated as the publication changes. The version
          on this page is the current one.
        </p>
      </div>
    </div>
  );
}
