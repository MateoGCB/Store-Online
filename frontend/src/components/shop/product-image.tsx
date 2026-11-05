import { ImageOff } from 'lucide-react';
import Image from 'next/image';
import type { ProductImage as ProductImageType } from '@/lib/api/types';
import { imageSrc } from '@/lib/images';

/**
 * Square product image with a fixed aspect ratio (no layout shift). The image is served
 * through the store's own origin and optimized by next/image.
 */
export function ProductImage({
  image,
  alt,
  sizes,
  priority = false,
  className = '',
}: {
  image: ProductImageType | null | undefined;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const src = imageSrc(image?.url);
  return (
    <div className={`relative aspect-square overflow-hidden bg-line/60 ${className}`}>
      {src ? (
        <Image
          src={src}
          alt={image?.alt || alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      ) : (
        <div
          className="flex size-full items-center justify-center text-subtle"
          role="img"
          aria-label={`${alt} (sin foto)`}
        >
          <ImageOff aria-hidden className="size-8" />
        </div>
      )}
    </div>
  );
}
