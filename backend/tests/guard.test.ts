import { describe, expect, it } from 'vitest';
import { assertTestDatabase } from '../src/config/env.js';

describe('test database guard', () => {
  it('accepts a database whose name ends in _test', () => {
    expect(() => assertTestDatabase('postgresql://u:p@localhost:5433/store_test')).not.toThrow();
  });

  it.each([
    'postgresql://u:p@localhost:5433/store',
    'postgresql://u:p@localhost:5433/store_test_copy',
    'postgresql://u:p@localhost:5433/test',
    'not a url',
    undefined,
  ])('refuses %s', (url) => {
    expect(() => assertTestDatabase(url)).toThrow(/_test/);
  });

  it('the suite is really connected to a _test database', () => {
    const url = new URL(process.env.DATABASE_URL_TEST!);
    expect(url.pathname.endsWith('_test')).toBe(true);
  });
});
