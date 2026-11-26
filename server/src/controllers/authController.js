import { SESSION_COOKIE } from '../middlewares/auth.js';
import { toPublicUser } from '../services/authService.js';

export function createAuthController(authService, { secureCookie }) {
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: secureCookie,
    path: '/api',
  };

  return {
    async login(req, res) {
      const { user, token, expiresAt } = await authService.login(req.validated.body);
      res.cookie(SESSION_COOKIE, token, { ...cookieOptions, expires: expiresAt });
      res.json({ user });
    },

    async logout(req, res) {
      await authService.logout(req.cookies?.[SESSION_COOKIE]);
      res.clearCookie(SESSION_COOKIE, cookieOptions);
      res.status(204).end();
    },

    me(req, res) {
      res.json({ user: toPublicUser(req.user) });
    },

    async changePassword(req, res) {
      const user = await authService.changePassword(
        { user: req.user, sessionId: req.sessionId },
        req.validated.body,
      );
      res.json({ user });
    },
  };
}
