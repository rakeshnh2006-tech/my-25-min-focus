import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env, isGoogleOAuthConfigured } from './env';
import { prisma } from './db';
import { UserSessionPayload } from '../types';

export function configurePassport() {
  // Serialize user ID to session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from database
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          googleId: true,
          email: true,
          name: true,
          avatarUrl: true,
        },
      });
      if (!user) {
        return done(null, false);
      }
      done(null, user as UserSessionPayload);
    } catch (err) {
      done(err, null);
    }
  });

  // Only initialize Google Strategy if valid credentials are provided
  if (isGoogleOAuthConfigured()) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
          callbackURL: env.GOOGLE_CALLBACK_URL,
          proxy: true,
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const googleId = profile.id;
            const email = profile.emails?.[0]?.value?.toLowerCase();
            const name = profile.displayName || profile.name?.givenName || 'Cognify Student';
            const avatarUrl = profile.photos?.[0]?.value || null;

            if (!email) {
              return done(new Error('No email found in Google profile.'));
            }

            // Find or create user
            let user = await prisma.user.findUnique({
              where: { googleId },
            });

            if (!user) {
              // Check if user exists with the same email
              const existingByEmail = await prisma.user.findUnique({
                where: { email },
              });

              if (existingByEmail) {
                // Link googleId to existing user
                user = await prisma.user.update({
                  where: { id: existingByEmail.id },
                  data: {
                    googleId,
                    avatarUrl: avatarUrl || existingByEmail.avatarUrl,
                    name: existingByEmail.name || name,
                  },
                });
              } else {
                // Create user and default preferences in a transaction
                user = await prisma.$transaction(async (tx) => {
                  const newUser = await tx.user.create({
                    data: {
                      googleId,
                      email,
                      name,
                      avatarUrl,
                    },
                  });

                  await tx.userPreference.create({
                    data: {
                      userId: newUser.id,
                      focusDuration: 25,
                      shortBreakDuration: 5,
                      longBreakDuration: 15,
                      longBreakInterval: 4,
                      dailyGoalMinutes: 120,
                      soundEnabled: true,
                      notificationsEnabled: false,
                      theme: 'dark',
                      timezone: 'UTC',
                      hasCompletedOnboarding: false,
                    },
                  });

                  return newUser;
                });
              }
            } else {
              // Update avatar or name if they changed
              if (avatarUrl && user.avatarUrl !== avatarUrl) {
                user = await prisma.user.update({
                  where: { id: user.id },
                  data: { avatarUrl, name },
                });
              }
            }

            return done(null, {
              id: user.id,
              googleId: user.googleId,
              email: user.email,
              name: user.name,
              avatarUrl: user.avatarUrl,
            });
          } catch (err) {
            return done(err as Error);
          }
        }
      )
    );
  } else {
    console.warn(
      '[Google OAuth] Credentials not detected in environment. Setup instructions available on /api/auth/status.'
    );
  }
}
