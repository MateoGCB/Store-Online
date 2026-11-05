import { describe, expect, it } from 'vitest';
import { z } from 'zod';
// Registers the Spanish error messages.
import '../src/lib/validation.js';

function messageOf(schema: z.ZodType, value: unknown): string | undefined {
  return schema.safeParse(value).error?.issues[0]?.message;
}

describe('validation messages agree in number', () => {
  it('minimum length of a text (a minimum of 0 can never fail)', () => {
    expect(messageOf(z.string().min(1), '')).toBe('Tiene que tener al menos 1 carácter.');
    expect(messageOf(z.string().min(2), 'a')).toBe('Tiene que tener al menos 2 caracteres.');
  });

  it('maximum length of a text', () => {
    expect(messageOf(z.string().max(0), 'a')).toBe('Puede tener como máximo 0 caracteres.');
    expect(messageOf(z.string().max(1), 'ab')).toBe('Puede tener como máximo 1 carácter.');
    expect(messageOf(z.string().max(2), 'abc')).toBe('Puede tener como máximo 2 caracteres.');
  });

  it('minimum size of a list', () => {
    expect(messageOf(z.array(z.number()).min(1), [])).toBe('Tiene que tener al menos 1 elemento.');
    expect(messageOf(z.array(z.number()).min(2), [1])).toBe(
      'Tiene que tener al menos 2 elementos.',
    );
  });

  it('maximum size of a list', () => {
    expect(messageOf(z.array(z.number()).max(0), [1])).toBe('Puede tener como máximo 0 elementos.');
    expect(messageOf(z.array(z.number()).max(1), [1, 2])).toBe(
      'Puede tener como máximo 1 elemento.',
    );
    expect(messageOf(z.array(z.number()).max(2), [1, 2, 3])).toBe(
      'Puede tener como máximo 2 elementos.',
    );
  });
});
