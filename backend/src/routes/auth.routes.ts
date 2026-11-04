import type { CookieOptions, Response, Router } from 'express';
import type { Deps } from '../deps.js';
import { parseOrThrow } from '../lib/validation.js';
import { requireAuth } from '../middleware/auth.js';
import type { RateLimiters } from '../middleware/rate-limit.js';
import { login, loginSchema, register, registerSchema } from '../services/auth.service.js';
import { userDto } from '../services/dto.js';
import { SESSION_COOKIE, SESSION_HOURS, signSession } from '../services/session.service.js';

function cookieOptions(deps: Deps): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: deps.env.NODE_ENV === 'production',
    path: '/',
  };
}

async function startSession(deps: Deps, res: Response, userId: string) {
  const token = await signSession(deps, userId);
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions(deps), maxAge: SESSION_HOURS * 3600_000 });
}

export function registerAuthRoutes(router: Router, deps: Deps, limiters: RateLimiters) {
  router.post('/auth/register', limiters.register, async (req, res) => {
    const input = parseOrThrow(registerSchema, req.body);
    const user = await register(deps, input);
    await startSession(deps, res, user.id);
    res.status(201).json({ user });
  });

  router.post('/auth/login', limiters.login, async (req, res) => {
    const input = parseOrThrow(loginSchema, req.body);
    const user = await login(deps, input);
    await startSession(deps, res, user.id);
    res.json({ user });
  });

  router.post('/auth/logout', (_req, res) => {
    res.clearCookie(SESSION_COOKIE, cookieOptions(deps));
    res.status(204).end();
  });

  router.get('/auth/me', requireAuth(deps), (req, res) => {
    res.json({ user: userDto(req.user!) });
  });
}
