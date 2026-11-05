'use client';

import { useState } from 'react';
import type { ProductImage as ProductImageType } from '@/lib/api/types';
import { ProductImage } from './product-image';

export function ProductGallery({ images, name }: { images: ProductImageType[]; name: string }) {
  const [selected, setSelected] = useState(0);
  const current = images[selected] ?? images[0];

  return (
    <div className="space-y-3">
      <ProductImage
        image={current}
        alt={name}
        sizes="(min-width: 1024px) 50vw, 100vw"
        priority
        className="rounded-card"
      />
      {images.length > 1 && (
        <ul className="grid grid-cols-5 gap-2 sm:gap-3" aria-label="Fotos del producto">
          {images.map((image, i) => (
            <li key={image.id}>
              <button
                type="button"
                onClick={() => setSelected(i)}
                aria-label={`Ver foto ${i + 1} de ${images.length}`}
                aria-pressed={i === selected}
                className={`block w-full overflow-hidden rounded-control border-2 transition-colors ${
                  i === selected ? 'border-ink' : 'border-transparent hover:border-line-strong'
                }`}
              >
                <ProductImage image={image} alt="" sizes="96px" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
