import { Request, Response } from 'express';
import { prisma, checkDatabaseConnection } from '../config/db';
import { isGoogleOAuthConfigured } from '../config/env';

export async function getAuthStatus(_req: Request, res: Response) {
  const dbStatus = await checkDatabaseConnection();
  const googleConfigured = isGoogleOAuthConfigured();

  return res.json({
    status: 'ok',
    configured: dbStatus.connected && googleConfigured,
    database: {
      connected: dbStatus.connected,
      error: dbStatus.error || null,
    },
    googleOAuth: {
      configured: googleConfigured,
      callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
    },
  });
}

export async function getMe(req: Request, res: Response) {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: 'Unauthorized', user: null });
  }

  const userId = (req.user as any).id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      preference: true,
      subjects: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
    },
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.json({
    user: {
      id: user.id,
      googleId: user.googleId,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    },
    preference: user.preference,
    subjects: user.subjects,
  });
}

export function logout(req: Request, res: Response) {
  const isHtml = req.accepts && req.accepts('html') && !req.xhr && req.headers['sec-fetch-dest'] === 'document';
  const finalize = () => {
    res.clearCookie('focusflow.sid', { path: '/' });
    if (isHtml) {
      const loginUrl = (process.env.VERCEL || !process.env.CLIENT_URL) ? '/login' : `${process.env.CLIENT_URL}/login`;
      return res.redirect(loginUrl);
    }
    return res.json({ success: true, message: 'Logged out successfully' });
  };

  try {
    if (req.logout) {
      req.logout((err) => {
        if (err) {
          console.warn('[Passport Logout Warning]:', err.message || err);
        }
        if (req.session) {
          req.session.destroy((sessionErr) => {
            if (sessionErr) {
              console.warn('[Session Destroy Warning]:', sessionErr.message || sessionErr);
            }
            finalize();
          });
        } else {
          finalize();
        }
      });
    } else {
      finalize();
    }
  } catch (err: any) {
    console.warn('[Logout Exception]:', err.message || err);
    finalize();
  }
}
