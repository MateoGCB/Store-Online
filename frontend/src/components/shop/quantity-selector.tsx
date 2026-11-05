'use client';

import { Minus, Plus } from 'lucide-react';
import { useId } from 'react';

export const MAX_UNITS_PER_PRODUCT = 20;

/** Highest quantity allowed: never more than 20 nor than what can be bought right now. */
export function maxQuantity(maxPurchasable: number): number {
  return Math.max(0, Math.min(MAX_UNITS_PER_PRODUCT, Math.floor(maxPurchasable)));
}

export function clampQuantity(value: number, maxPurchasable: number): number {
  const max = maxQuantity(maxPurchasable);
  if (max === 0) return 0;
  if (!Number.isFinite(value)) return 1;
  return Math.min(max, Math.max(1, Math.round(value)));
}

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  /** Units the customer can buy (from the API's `maxPurchasable`). */
  maxPurchasable: number;
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export function QuantitySelector({
  value,
  onChange,
  maxPurchasable,
  label = 'Cantidad',
  disabled = false,
  size = 'md',
}: QuantitySelectorProps) {
  const id = useId();
  const max = maxQuantity(maxPurchasable);
  const isDisabled = disabled || max === 0;
  const box = size === 'sm' ? 'h-9' : 'h-11';
  const button =
    'inline-flex w-10 items-center justify-center text-ink hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <div
        className={`inline-flex ${box} w-fit overflow-hidden rounded-control border border-line-strong bg-surface`}
      >
        <button
          type="button"
          className={button}
          onClick={() => onChange(clampQuantity(value - 1, maxPurchasable))}
          disabled={isDisabled || value <= 1}
          aria-label="Restar una unidad"
          aria-controls={id}
        >
          <Minus aria-hidden className="size-4" />
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={1}
          max={max}
          value={isDisabled && max === 0 ? 0 : value}
          disabled={isDisabled}
          onChange={(event) => {
            const parsed = Number(event.target.value);
            if (event.target.value === '' || Number.isNaN(parsed)) return;
            onChange(clampQuantity(parsed, maxPurchasable));
          }}
          className="w-12 [appearance:textfield] border-x border-line-strong bg-transparent text-center text-base text-ink tabular-nums [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          className={button}
          onClick={() => onChange(clampQuantity(value + 1, maxPurchasable))}
          disabled={isDisabled || value >= max}
          aria-label="Sumar una unidad"
          aria-controls={id}
        >
          <Plus aria-hidden className="size-4" />
        </button>
      </div>
      {max > 0 && (
        <p className="text-xs text-muted">
          Máximo {max} {max === 1 ? 'unidad' : 'unidades'}
        </p>
      )}
    </div>
  );
}
