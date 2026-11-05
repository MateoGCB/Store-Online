import { pluralize } from '@/lib/format/plural';

describe('pluralize', () => {
  it('uses the singular only for exactly one', () => {
    expect(pluralize(0, 'unidad', 'unidades')).toBe('0 unidades');
    expect(pluralize(1, 'unidad', 'unidades')).toBe('1 unidad');
    expect(pluralize(2, 'unidad', 'unidades')).toBe('2 unidades');
  });

  it('works for any noun', () => {
    expect(pluralize(0, 'producto', 'productos')).toBe('0 productos');
    expect(pluralize(1, 'producto', 'productos')).toBe('1 producto');
    expect(pluralize(2, 'producto', 'productos')).toBe('2 productos');
  });
});
