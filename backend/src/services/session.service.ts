import { SignJWT, jwtVerify } from 'jose';
import type { Deps } from '../deps.js';
import type { AuthUser } from '../express.js';

export const SESSION_COOKIE = 'session';
export const SESSION_HOURS = 12;
const ALG = 'HS256';

function key(secret: string) {
  return new TextEncoder().encode(secret);
}

export async function signSession(deps: Deps, userId: string): Promise<string> {
  const now = Math.floor(deps.clock.now().getTime() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: ALG })
    .setSubject(userId)
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_HOURS * 3600)
    .sign(key(deps.env.JWT_SECRET));
}

/**
 * Verifies the token and loads the user from the database (so role changes and deleted
 * users take effect immediately). Returns null for any invalid or expired session.
 */
export async function resolveSession(
  deps: Deps,
  token: string | undefined,
): Promise<AuthUser | null> {
  if (!token) return null;
  let userId: string | undefined;
  try {
    const { payload } = await jwtVerify(token, key(deps.env.JWT_SECRET), {
      algorithms: [ALG],
      currentDate: deps.clock.now(),
    });
    userId = payload.sub;
  } catch {
    return null;
  }
  if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) return null;
  const user = await deps.prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true },
  });
  return user ?? null;
}
