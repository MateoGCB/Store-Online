import { centsToPesosInput, formatCents, pesosToCents } from '@/lib/format/money';

const NBSP = ' '; // Intl puts a non-breaking space between "$" and the amount

describe('formatCents', () => {
  it.each([
    [0, `$${NBSP}0,00`],
    [1, `$${NBSP}0,01`],
    [99, `$${NBSP}0,99`],
    [100, `$${NBSP}1,00`],
    [199999, `$${NBSP}1.999,99`],
    [123456789, `$${NBSP}1.234.567,89`],
  ])('%i cents -> %s', (cents, expected) => {
    expect(formatCents(cents)).toBe(expected);
  });

  it('uses a non-breaking space, not a normal one', () => {
    expect(formatCents(100)).not.toContain('$ 1');
    expect(formatCents(100).charCodeAt(1)).toBe(0xa0);
  });
});

describe('pesosToCents (admin price field)', () => {
  it.each([
    ['19,99', 1999],
    ['19.99', 1999],
    ['19,9', 1990],
    ['0,1', 10],
    ['0,01', 1],
    ['1999', 199900],
    ['$ 19,99', 1999],
    ['  45,5  ', 4550],
    ['10000000', 1_000_000_000],
  ])('"%s" -> %i', (input, expected) => {
    expect(pesosToCents(input)).toBe(expected);
  });

  it('0,1 + 0,2 adds up exactly to 30 cents (no floating point error)', () => {
    expect(pesosToCents('0,1')! + pesosToCents('0,2')!).toBe(30);
    expect(pesosToCents('0,3')).toBe(30);
  });

  it.each([
    '',
    'abc',
    '-5',
    '1.234,56',
    '19,999',
    '1e3',
    ',5',
    '5,',
    '10000000,01',
    '19,99,1',
    'NaN',
  ])('rejects "%s"', (input) => {
    expect(pesosToCents(input)).toBeNull();
  });
});

describe('centsToPesosInput', () => {
  it.each([
    [1999, '19,99'],
    [5, '0,05'],
    [100000, '1000,00'],
  ])('%i -> %s', (cents, expected) => {
    expect(centsToPesosInput(cents)).toBe(expected);
  });
});
