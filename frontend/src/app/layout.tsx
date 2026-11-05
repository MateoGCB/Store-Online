import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

// Self-hosted by next/font: downloaded at build time, served from the store's own origin.
const body = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap' });
const heading = Fraunces({ subsets: ['latin'], variable: '--font-heading', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Tienda online', template: '%s' },
  description: 'Objetos de diseño para tu casa: cocina, hogar, jardín y papelería.',
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#f8f5f1',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={`${body.variable} ${heading.variable}`}>
      <body className="min-h-dvh">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
