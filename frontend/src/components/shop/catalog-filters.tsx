import Form from 'next/form';
import Link from 'next/link';
import { buttonClasses } from '@/components/ui/button';
import { FiltersPanel } from './filters-panel';
import { inputClasses } from '@/components/ui/field';
import type { Category } from '@/lib/api/types';
import {
  type CatalogFilters as Filters,
  SORT_OPTIONS,
  hasActiveFilters,
} from '@/lib/catalog/query';

/**
 * Plain GET form to /products: the filters end up in the URL, work without JavaScript and
 * the back button restores the previous search.
 */
export function CatalogFilters({
  filters,
  categories,
}: {
  filters: Filters;
  categories: Category[];
}) {
  return (
    <FiltersPanel>
      <Form action="/products" className="space-y-5 px-5 pb-5 lg:pt-5">
        {filters.q && <input type="hidden" name="q" value={filters.q} />}
        <div className="space-y-1.5">
          <label htmlFor="filter-category" className="block text-sm font-medium text-ink">
            Categoría
          </label>
          <select
            id="filter-category"
            name="category"
            defaultValue={filters.category}
            className={inputClasses}
          >
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium text-ink">Precio (en pesos)</legend>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="filter-min" className="sr-only">
                Precio mínimo
              </label>
              <input
                id="filter-min"
                name="minPrice"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Mínimo"
                defaultValue={filters.minPrice ?? ''}
                className={inputClasses}
              />
            </div>
            <div>
              <label htmlFor="filter-max" className="sr-only">
                Precio máximo
              </label>
              <input
                id="filter-max"
                name="maxPrice"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Máximo"
                defaultValue={filters.maxPrice ?? ''}
                className={inputClasses}
              />
            </div>
          </div>
        </fieldset>
        <label className="flex items-center gap-2.5 text-sm text-ink">
          <input
            type="checkbox"
            name="inStock"
            value="true"
            defaultChecked={filters.inStock}
            className="size-4 accent-ink"
          />
          Solo con stock
        </label>
        <div className="space-y-1.5">
          <label htmlFor="filter-sort" className="block text-sm font-medium text-ink">
            Ordenar por
          </label>
          <select id="filter-sort" name="sort" defaultValue={filters.sort} className={inputClasses}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="submit" className={buttonClasses('primary', 'md', 'flex-1')}>
            Aplicar
          </button>
          {hasActiveFilters(filters) && (
            <Link href="/products" className={buttonClasses('secondary', 'md')}>
              Limpiar
            </Link>
          )}
        </div>
      </Form>
    </FiltersPanel>
  );
}
