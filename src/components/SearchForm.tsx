/**
 * Search form for the archive. Submits with GET to /articles?q=… —
 * plain HTML, no JavaScript required. `large` is the prominent
 * variant used on the articles/search page; the default is the
 * compact pill used in the category bar.
 */
export function SearchForm({
  query = '',
  large = false,
  id,
}: {
  query?: string;
  large?: boolean;
  id: string;
}) {
  if (large) {
    return (
      <form
        action="/articles"
        method="get"
        role="search"
        className="flex w-full items-stretch"
      >
        <label htmlFor={id} className="sr-only">
          Search articles
        </label>
        <input
          id={id}
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Type here…"
          className="min-w-0 flex-1 rounded-l-xl border border-r-0 border-line bg-card px-4 py-3 text-ink outline-none placeholder:text-muted focus:border-accent"
        />
        <button
          type="submit"
          className="rounded-r-xl bg-accent px-6 py-3 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-accent-deep"
        >
          Search
        </button>
      </form>
    );
  }

  return (
    <form action="/articles" method="get" role="search" className="flex">
      <label htmlFor={id} className="sr-only">
        Search articles
      </label>
      <input
        id={id}
        name="q"
        type="search"
        placeholder="Search…"
        className="w-36 rounded-full border border-line bg-paper px-3 py-1.5 text-sm text-ink outline-none placeholder:text-muted focus:border-accent lg:w-44"
      />
    </form>
  );
}
