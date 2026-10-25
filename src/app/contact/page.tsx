import type { Metadata } from 'next';
import { getConfig } from '@/lib/config';

export const revalidate = 3600;

export function generateMetadata(): Metadata {
  const { publication } = getConfig();
  return {
    title: 'Contact',
    description: `How to reach the author of ${publication.name}.`,
    alternates: { canonical: '/contact' },
  };
}

export default function ContactPage() {
  const { publication, contactEmail } = getConfig();

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Contact</h1>

      <div className="prose-wideangle mt-6">
        <p>
          {publication.name} is written by one person. The most reliable way to
          reach them is email:
        </p>
        <p>
          <a href={`mailto:${contactEmail}`} className="underline">
            {contactEmail}
          </a>
        </p>
        <p>
          Use email for corrections, questions about an article, or to suggest a
          topic. Messages are read in the order they arrive.
        </p>
      </div>
    </>
  );
}
