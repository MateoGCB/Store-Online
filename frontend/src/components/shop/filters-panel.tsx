'use client';

import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { useId, useState } from 'react';

/**
 * Catalog filters container: collapsed by default on mobile (a toggle button opens it) and
 * always open on desktop (lg and up), where the toggle is hidden.
 */
export function FiltersPanel({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const contentId = useId();

  return (
    <div className="rounded-card border border-line bg-surface">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-5 py-4 text-left text-sm font-semibold text-ink lg:hidden"
      >
        <SlidersHorizontal aria-hidden className="size-4" />
        Filtros y orden
        <ChevronDown
          aria-hidden
          className={`ml-auto size-4 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div id={contentId} className={`${open ? 'block' : 'hidden'} lg:block`}>
        {children}
      </div>
    </div>
  );
}
