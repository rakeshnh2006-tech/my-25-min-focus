import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { getAuthStatus, getMe, logout } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';
import { env, isGoogleOAuthConfigured } from '../config/env';

const router = Router();

// Reconcile client redirects for local development vs single-domain Vercel deployment
const getClientRedirect = (subpath: string): string => {
  if (process.env.VERCEL || !env.CLIENT_URL || env.CLIENT_URL === '/') {
    return subpath;
  }
  return `${env.CLIENT_URL}${subpath}`;
};

// Public auth and system status
router.get('/status', getAuthStatus);

// Trigger Google OAuth 2.0 flow
router.get('/google', (req: Request, res: Response, next: NextFunction) => {
  if (!isGoogleOAuthConfigured()) {
    return res.redirect(getClientRedirect('/login?error=oauth_not_configured'));
  }
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
  })(req, res, next);
});

// Google OAuth 2.0 callback
router.get(
  '/google/callback',
  (req: Request, res: Response, next: NextFunction) => {
    if (!isGoogleOAuthConfigured()) {
      return res.redirect(getClientRedirect('/login?error=oauth_not_configured'));
    }
    if (req.query.error || !req.query.code) {
      const errParam = typeof req.query.error === 'string' ? req.query.error : 'auth_failed';
      return res.redirect(getClientRedirect(`/login?error=${encodeURIComponent(errParam)}`));
    }
    passport.authenticate('google', (err: any, user: any) => {
      if (err) {
        console.error('[Google OAuth Callback Error]:', err.message || err);
        const isDbError =
          err.message &&
          (err.message.includes("Can't reach database server") ||
            err.message.includes('PrismaClient') ||
            err.code === 'P1001');
        const errCode = isDbError ? 'db_connection_error' : 'auth_failed';
        return res.redirect(getClientRedirect(`/login?error=${errCode}`));
      }
      if (!user) {
        return res.redirect(getClientRedirect('/login?error=auth_failed'));
      }
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error('[Login Session Error]:', loginErr);
          return res.redirect(getClientRedirect('/login?error=session_error'));
        }
        return res.redirect(getClientRedirect('/dashboard'));
      });
    })(req, res, next);
  }
);

// Authenticated user endpoints
router.get('/me', requireAuth, getMe);
router.post('/logout', logout);
router.get('/logout', logout);

export default router;
