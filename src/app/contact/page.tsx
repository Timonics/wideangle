import type { Metadata } from 'next';
import { getConfig } from '@/lib/config';

export const revalidate = 3600;

export function generateMetadata(): Metadata {
  return {
    title: { absolute: 'Contact WideAngle' },
    description:
      'Contact WideAngle with a correction, question, topic suggestion, privacy enquiry, or clearly described business proposal.',
    alternates: { canonical: '/contact' },
  };
}

export default function ContactPage() {
  const { publication, contactEmail } = getConfig();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-serif text-4xl font-black tracking-tight sm:text-5xl">
        Contact {publication.name}
      </h1>

      <div className="prose-wideangle mt-6">
        <p>
          Questions, corrections, and thoughtful suggestions are welcome.
          Contact {publication.name} at{' '}
          <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
        </p>

        <h2>Corrections and updates</h2>
        <p>
          If something in an article appears wrong or outdated, include its
          title or link and identify the passage in question. A supporting
          source, screenshot, or explanation will help me investigate.
        </p>
        <p>
          You do not need to write a formal complaint. A clear description
          of the issue is enough.
        </p>

        <h2>Suggest a question</h2>
        <p>
          Is there something you have tried to understand but have not found
          explained clearly? Send the question and a little context about
          what made the existing answers unhelpful.
        </p>
        <p>
          Suggestions help identify useful subjects, although sending one
          does not guarantee an article or a publication date.
        </p>

        <h2>Business enquiries</h2>
        <p>
          For a commercial proposal, identify the organization you represent
          and describe what you are suggesting. Any proposed relationship
          must remain compatible with {publication.name}&apos;s editorial
          standards.
        </p>

        <h2>Before sending</h2>
        <p>
          Messages are read personally, but I may not be able to reply to
          every enquiry or provide individual advice. Please do not email
          passwords, payment information, identity documents, or other
          sensitive material.
        </p>
        <p>
          For privacy-related questions, use the same address and include
          &ldquo;Privacy&rdquo; in the subject line.
        </p>
      </div>
    </div>
  );
}
