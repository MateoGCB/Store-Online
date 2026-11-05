import { describe, expect, it } from 'vitest';
import { pluralize } from '../src/lib/plural.js';

describe('pluralize', () => {
  it('uses the singular only for exactly one', () => {
    expect(pluralize(0, 'unidad', 'unidades')).toBe('0 unidades');
    expect(pluralize(1, 'unidad', 'unidades')).toBe('1 unidad');
    expect(pluralize(2, 'unidad', 'unidades')).toBe('2 unidades');
  });
});
