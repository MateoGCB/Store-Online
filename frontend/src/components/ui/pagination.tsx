import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  /** Builds the URL (or handles the click) for a page number. */
  hrefFor?: (page: number) => string;
  onPageChange?: (page: number) => void;
  label?: string;
}

const itemClass =
  'inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-control border border-line-strong bg-surface px-3 text-sm text-ink transition-colors hover:bg-canvas';

/** Previous / "page X of Y" / next. Works with links (server pages) or callbacks. */
export function Pagination({
  page,
  pageSize,
  total,
  hrefFor,
  onPageChange,
  label = 'Paginación',
}: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  function control(target: number, text: string, icon: React.ReactNode, disabled: boolean) {
    const content =
      icon && text === 'Anterior' ? (
        <>
          {icon}
          <span>{text}</span>
        </>
      ) : (
        <>
          <span>{text}</span>
          {icon}
        </>
      );
    if (disabled) {
      return (
        <span className={`${itemClass} cursor-not-allowed opacity-45`} aria-disabled="true">
          {content}
        </span>
      );
    }
    if (hrefFor) {
      return (
        <Link href={hrefFor(target)} className={itemClass} scroll>
          {content}
        </Link>
      );
    }
    return (
      <button type="button" className={itemClass} onClick={() => onPageChange?.(target)}>
        {content}
      </button>
    );
  }

  return (
    <nav aria-label={label} className="flex items-center justify-center gap-3">
      {control(page - 1, 'Anterior', <ChevronLeft aria-hidden className="size-4" />, page <= 1)}
      <span className="text-sm text-muted" aria-current="page">
        Página {page} de {pages}
      </span>
      {control(
        page + 1,
        'Siguiente',
        <ChevronRight aria-hidden className="size-4" />,
        page >= pages,
      )}
    </nav>
  );
}
