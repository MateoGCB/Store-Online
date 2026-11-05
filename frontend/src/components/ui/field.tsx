import { cloneElement, isValidElement, useId } from 'react';

export const inputClasses =
  'block w-full rounded-control border border-line-strong bg-surface px-3.5 py-2.5 text-base text-ink placeholder:text-subtle transition-colors focus-visible:border-ink aria-[invalid=true]:border-danger disabled:bg-canvas disabled:text-muted sm:text-sm';

interface FieldProps {
  label: string;
  /** Error message: shown below and linked with aria-describedby + aria-invalid. */
  error?: string;
  hint?: React.ReactNode;
  /** A single input/select/textarea element; it receives id and aria attributes. */
  children: React.ReactElement<Record<string, unknown>>;
  className?: string;
  optional?: boolean;
}

/** Label + control + hint + error, correctly associated for assistive technologies. */
export function Field({ label, error, hint, children, className = '', optional }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
      })
    : children;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
        {optional && <span className="ml-1 font-normal text-subtle">(opcional)</span>}
      </label>
      {control}
      {hint && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
