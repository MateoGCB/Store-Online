import { safeNext } from '@/lib/auth/next-param';
import { byteLength, passwordSchema, registerSchema } from '@/lib/auth/schemas';

describe('password rules (bytes, not characters)', () => {
  it('accepts exactly 72 bytes and rejects 73', () => {
    const ok = 'a1' + 'b'.repeat(70);
    const tooLong = 'a1' + 'b'.repeat(71);
    expect(byteLength(ok)).toBe(72);
    expect(byteLength(tooLong)).toBe(73);
    expect(passwordSchema.safeParse(ok).success).toBe(true);
    expect(passwordSchema.safeParse(tooLong).success).toBe(false);
  });

  it('rejects 40 accented characters because they take 79 bytes', () => {
    const password = 'á'.repeat(39) + '1';
    expect(password.length).toBe(40);
    expect(byteLength(password)).toBe(79);
    const result = passwordSchema.safeParse(password);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/72 bytes/);
  });

  it.each([
    ['too short', 'abc1234'],
    ['no number', 'abcdefghij'],
    ['no letter', '1234567890'],
  ])('rejects a password that is %s', (_label, value) => {
    expect(passwordSchema.safeParse(value).success).toBe(false);
  });

  it('accepts letters with accents counting bytes', () => {
    expect(passwordSchema.safeParse('contraseña1').success).toBe(true);
  });

  it('validates name 1-100 and email', () => {
    expect(
      registerSchema.safeParse({ name: ' ', email: 'a@b.co', password: 'abc12345' }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({ name: 'x'.repeat(101), email: 'a@b.co', password: 'abc12345' })
        .success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({ name: 'Ana', email: 'no-email', password: 'abc12345' }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({ name: 'Ana', email: 'ana@example.com', password: 'abc12345' })
        .success,
    ).toBe(true);
  });
});

describe('safeNext (open redirect protection)', () => {
  it.each([
    ['/products', '/products'],
    ['/products?q=taza&page=2', '/products?q=taza&page=2'],
    ['/account/orders/123#top', '/account/orders/123#top'],
  ])('accepts %s', (input, expected) => {
    expect(safeNext(input)).toBe(expected);
  });

  it.each([
    'https://evil.com',
    'http://evil.com/products',
    '//evil.com',
    '//evil.com/products',
    '/\\evil.com',
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    'evil.com',
    '',
    '/products\u0000',
  ])('rejects %s', (input) => {
    expect(safeNext(input)).toBe('/');
  });

  it('uses the fallback for null and undefined', () => {
    expect(safeNext(null, '/cart')).toBe('/cart');
    expect(safeNext(undefined)).toBe('/');
  });
});
