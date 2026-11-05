import { z } from 'zod';
import { badRequest } from './errors.js';
import { pluralize } from './plural.js';

/** User-facing validation messages in Spanish (Rioplatense, "vos"). */
const spanishErrors: z.core.$ZodErrorMap = (issue) => {
  switch (issue.code) {
    case 'invalid_type':
      return issue.input === undefined ? 'Este campo es obligatorio.' : 'El valor no es válido.';
    case 'too_small': {
      const min = Number(issue.minimum);
      if (issue.origin === 'string')
        return `Tiene que tener al menos ${pluralize(min, 'carácter', 'caracteres')}.`;
      if (issue.origin === 'array' || issue.origin === 'set')
        return `Tiene que tener al menos ${pluralize(min, 'elemento', 'elementos')}.`;
      return `Tiene que ser como mínimo ${issue.minimum}.`;
    }
    case 'too_big': {
      const max = Number(issue.maximum);
      if (issue.origin === 'string')
        return `Puede tener como máximo ${pluralize(max, 'carácter', 'caracteres')}.`;
      if (issue.origin === 'array' || issue.origin === 'set')
        return `Puede tener como máximo ${pluralize(max, 'elemento', 'elementos')}.`;
      return `Puede ser como máximo ${issue.maximum}.`;
    }
    case 'invalid_format':
      if (issue.format === 'email') return 'Ingresá un email válido.';
      if (issue.format === 'uuid') return 'El identificador no es válido.';
      if (issue.format === 'datetime' || issue.format === 'date')
        return 'Ingresá una fecha válida (ISO 8601).';
      return 'El formato no es válido.';
    case 'invalid_value':
      return 'El valor no es uno de los permitidos.';
    case 'unrecognized_keys':
      return `Campos no permitidos: ${issue.keys.join(', ')}.`;
    case 'not_multiple_of':
      return 'El valor no es válido.';
    default:
      return 'El valor no es válido.';
  }
};

z.config({ customError: spanishErrors });

export interface FieldError {
  field: string;
  message: string;
}

export function toFieldErrors(error: z.ZodError): FieldError[] {
  return error.issues.map((i) => ({ field: i.path.map(String).join('.'), message: i.message }));
}

/** Parses `data` with `schema` or throws a 400 VALIDATION_ERROR listing the invalid fields. */
export function parseOrThrow<T extends z.ZodType>(schema: T, data: unknown): z.output<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw badRequest('VALIDATION_ERROR', 'Revisá los datos enviados.', toFieldErrors(result.error));
  }
  return result.data;
}

/** Trimmed string with length limits. */
export const trimmed = (min: number, max: number) => z.string().trim().min(min).max(max);

export const uuidParam = z.object({ id: z.uuid() });
