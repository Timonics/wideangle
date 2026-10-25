import type { Metadata } from 'next';
import { getConfig } from '@/lib/config';

export const revalidate = 3600;

export function generateMetadata(): Metadata {
  const { publication } = getConfig();
  return {
    title: 'Privacy',
    description: `What data ${publication.name} collects, and what it does not.`,
    alternates: { canonical: '/privacy' },
  };
}

export default function PrivacyPage() {
  const { publication } = getConfig();

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Privacy</h1>

      <div className="prose-wideangle mt-6">
        <p>
          This page describes what {publication.name} actually does with data.
          It is not a boilerplate template.
        </p>

        <h2>Reading the site</h2>
        <p>
          Reading requires no account. There is no sign-in, no registration,
          no comment system, no newsletter and no reader profile.
        </p>
        <p>
          The site does not set tracking cookies and does not use
          advertising cookies. There is no third-party advertising script on
          these pages.
        </p>

        <h2>What the hosting provider may see</h2>
        <p>
          The site is served through a hosting platform and a content delivery
          network. As with any web server, the hosting provider processes the
          network information needed to deliver a page — such as your IP
          address, the time of the request and the URL requested — in order to
          serve the page and to protect the service against abuse. Those
          operational logs are used for security and capacity planning, not
          for building a profile of visitors.
        </p>

        <h2>Analytics</h2>
        <p>
          No analytics provider is configured on this site. Aggregate traffic
          may be inferred from the hosting provider&apos;s own operational
          statistics, which are not linked to individual visitors.
        </p>

        <h2>Content service</h2>
        <p>
          Published articles are fetched from a content service at request
          time. That request does not include any information about you.
        </p>

        <h2>Contact</h2>
        <p>
          If you email the author, that message is handled as ordinary
          correspondence. Nothing collected by email is published on this
          site.
        </p>
      </div>
    </>
  );
}
