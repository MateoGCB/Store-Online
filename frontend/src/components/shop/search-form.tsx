import Form from 'next/form';
import { Search } from 'lucide-react';

/** GET form to /products: works without JavaScript and keeps the search in the URL. */
export function SearchForm({
  defaultValue = '',
  className = '',
}: {
  defaultValue?: string;
  className?: string;
}) {
  return (
    <Form action="/products" role="search" className={`relative ${className}`}>
      <label htmlFor="site-search" className="sr-only">
        Buscar productos
      </label>
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle"
      />
      <input
        id="site-search"
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="Buscá tazas, mantas, macetas…"
        maxLength={100}
        className="h-11 w-full rounded-full border border-line-strong bg-surface pr-4 pl-10 text-base text-ink placeholder:text-subtle focus-visible:border-ink sm:text-sm"
      />
    </Form>
  );
}
