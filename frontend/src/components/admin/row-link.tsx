import Link from 'next/link';

/** Classes for a table row whose whole surface opens a detail page (pair it with RowLink). */
export const linkRowClass = 'relative cursor-pointer transition-colors';

/**
 * Stretched link: a real <a> (keyboard, screen readers, middle click, "open in a new tab")
 * whose ::after covers the whole row, because the <tr> is `relative`. There is no onClick
 * on the row. Any interactive control placed inside such a row needs `relative z-10` so it
 * stays above the link.
 */
export function RowLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="font-medium text-ink after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-accent"
    >
      {children}
    </Link>
  );
}
