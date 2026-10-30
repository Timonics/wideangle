import Link from 'next/link';
import { getConfig } from '@/lib/config';
import { getCategories } from '@/lib/data';
import { categoryPath } from '@/lib/urls';
import { SearchForm } from '@/components/SearchForm';

/**
 * The strip under the dark header: today's date, the category
 * links (scrollable on small screens), and a compact search box.
 * Everything is plain links/forms — no JavaScript required (AC-12).
 * A categories failure degrades to date + search only.
 */
export async function CategoryBar() {
  const { publication } = getConfig();
  const date = new Date().toLocaleDateString(publication.locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  let categories: Awaited<ReturnType<typeof getCategories>> = [];
  try {
    categories = await getCategories();
  } catch {
    categories = [];
  }

  return (
    <div className="border-b border-line bg-card">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-5 py-2">
        <p className="hidden shrink-0 text-xs font-semibold uppercase tracking-wide text-muted lg:block">
          {date}
        </p>

        {categories.length > 0 ? (
          <nav aria-label="Categories" className="min-w-0 flex-1 overflow-x-auto">
            <ul className="flex items-center gap-1 text-sm font-medium">
              {categories.map((category) => (
                <li key={category.id} className="shrink-0">
                  <Link
                    href={categoryPath(category.slug)}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-muted transition-colors hover:bg-surface hover:text-accent"
                  >
                    <span
                      aria-hidden="true"
                      className="inline-block h-1 w-1 rounded-full bg-accent"
                    />
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : (
          <div className="flex-1" />
        )}

        <div className="hidden shrink-0 sm:block">
          <SearchForm id="nav-search" />
        </div>
      </div>
    </div>
  );
}
