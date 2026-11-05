'use client';

import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { ProductImage } from '@/components/shop/product-image';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { Field, inputClasses } from '@/components/ui/field';
import { FormError } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useDeleteImage, useReorderImages, useUploadImage } from '@/hooks/use-admin';
import { errorMessage } from '@/lib/api/errors';
import type { AdminProduct, ProductImage as ImageType } from '@/lib/api/types';

export const MAX_IMAGES = 8;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Client-side help only: the API validates the real content and decides. */
export function validateImageFile(file: File): string | null {
  if (!TYPES.includes(file.type)) return 'La imagen tiene que ser JPEG, PNG o WebP.';
  if (file.size > MAX_IMAGE_BYTES) return 'La imagen supera el máximo de 5 MB.';
  return null;
}

function moved(images: ImageType[], index: number, delta: -1 | 1): string[] {
  const ids = images.map((i) => i.id);
  const target = index + delta;
  [ids[index], ids[target]] = [ids[target]!, ids[index]!];
  return ids;
}

export function ProductImages({ product }: { product: AdminProduct }) {
  const upload = useUploadImage(product.id);
  const remove = useDeleteImage(product.id);
  const reorder = useReorderImages(product.id);
  const toast = useToast();
  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [alt, setAlt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<ImageType | null>(null);

  const images = [...product.images].sort((a, b) => a.position - b.position);
  const full = images.length >= MAX_IMAGES;
  const disabled = !!product.archivedAt;

  // Release the preview URL when it is replaced or the component unmounts.
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function choose(selected: File | null) {
    setFile(selected);
    setPreview(selected ? URL.createObjectURL(selected) : null);
  }

  function pick(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setError(null);
    if (selected) {
      const problem = validateImageFile(selected);
      if (problem) {
        setError(problem);
        event.target.value = '';
        choose(null);
        return;
      }
    }
    choose(selected);
  }

  function send() {
    if (!file || upload.isPending) return;
    upload.mutate(
      { file, alt: alt.trim() || product.name },
      {
        onSuccess: () => {
          toast.show('Subimos la imagen.');
          choose(null);
          setAlt('');
        },
        onError: (err) => setError(errorMessage(err)),
      },
    );
  }

  return (
    <section
      aria-labelledby="images-heading"
      className="space-y-4 rounded-card border border-line bg-surface p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="images-heading" className="font-display text-xl text-ink">
          Imágenes
        </h2>
        <p className="text-sm text-muted">
          {images.length} de {MAX_IMAGES}
        </p>
      </div>
      {images.length === 0 ? (
        <p className="text-sm text-muted">Todavía no tiene imágenes.</p>
      ) : (
        <ol className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {images.map((image, i) => (
            <li key={image.id} className="space-y-2">
              <ProductImage
                image={image}
                alt={image.alt || product.name}
                sizes="200px"
                className="rounded-control"
              />
              <p className="text-xs text-muted">{i === 0 ? 'Principal' : `Posición ${i + 1}`}</p>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="secondary"
                  aria-label={`Subir la imagen ${i + 1}`}
                  disabled={disabled || i === 0 || reorder.isPending}
                  onClick={() =>
                    reorder.mutate(moved(images, i, -1), {
                      onError: (err) => setError(errorMessage(err)),
                    })
                  }
                >
                  <ArrowUp aria-hidden className="size-4" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  aria-label={`Bajar la imagen ${i + 1}`}
                  disabled={disabled || i === images.length - 1 || reorder.isPending}
                  onClick={() =>
                    reorder.mutate(moved(images, i, 1), {
                      onError: (err) => setError(errorMessage(err)),
                    })
                  }
                >
                  <ArrowDown aria-hidden className="size-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Borrar la imagen ${i + 1}`}
                  disabled={disabled}
                  onClick={() => setToDelete(image)}
                >
                  <Trash2 aria-hidden className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <FormError message={error} />
      {!disabled && (
        <div className="space-y-3 border-t border-line pt-4">
          <div className="space-y-1.5">
            <label htmlFor={inputId} className="block text-sm font-medium text-ink">
              Agregar imagen
            </label>
            <input
              id={inputId}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={pick}
              disabled={full || upload.isPending}
              className="block w-full text-sm text-muted file:mr-3 file:rounded-control file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:font-medium file:text-canvas"
            />
            <p className="text-xs text-muted">
              {full
                ? `Llegaste al máximo de ${MAX_IMAGES} imágenes.`
                : 'JPEG, PNG o WebP de hasta 5 MB.'}
            </p>
          </div>
          {preview && (
            <div className="flex flex-wrap items-end gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview of a file before uploading */}
              <img
                src={preview}
                alt="Vista previa de la imagen elegida"
                className="size-28 rounded-control object-cover"
              />
              <Field label="Texto alternativo" optional className="min-w-56 flex-1">
                <input
                  value={alt}
                  onChange={(e) => setAlt(e.target.value)}
                  maxLength={200}
                  className={inputClasses}
                  placeholder="Qué se ve en la foto"
                />
              </Field>
              <Button onClick={send} loading={upload.isPending}>
                <ImagePlus aria-hidden className="size-4" /> Subir imagen
              </Button>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="¿Borrar esta imagen?"
        confirmLabel="Borrar"
        danger
        loading={remove.isPending}
        onConfirm={() =>
          toDelete &&
          remove.mutate(toDelete.id, {
            onSuccess: () => {
              setToDelete(null);
              toast.show('Borramos la imagen.', 'info');
            },
            onError: (err) => setError(errorMessage(err)),
          })
        }
      />
    </section>
  );
}
