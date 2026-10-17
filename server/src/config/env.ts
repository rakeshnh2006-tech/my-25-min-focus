import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const getCanonicalHost = (): string => {
  if (process.env.CLIENT_URL && process.env.CLIENT_URL !== '/' && !process.env.CLIENT_URL.includes('localhost')) {
    return process.env.CLIENT_URL.replace(/\/+$/, '');
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.VERCEL) {
    return 'https://my-25-min-focus.vercel.app';
  }
  return '';
};

const canonicalHost = getCanonicalHost();

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || canonicalHost || 'http://localhost:3000',
  DATABASE_URL: process.env.DATABASE_URL || '',
  SESSION_SECRET: process.env.SESSION_SECRET || 'focusflow-default-development-session-secret-change-me',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_CALLBACK_URL:
    process.env.GOOGLE_CALLBACK_URL ||
    (canonicalHost
      ? `${canonicalHost}/api/auth/google/callback`
      : 'http://localhost:5000/api/auth/google/callback'),
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || '',
};

export const isGoogleOAuthConfigured = (): boolean => {
  return (
    Boolean(env.GOOGLE_CLIENT_ID) &&
    Boolean(env.GOOGLE_CLIENT_SECRET) &&
    !env.GOOGLE_CLIENT_ID.includes('your_google_client_id') &&
    !env.GOOGLE_CLIENT_SECRET.includes('your_google_client_secret')
  );
};

export const isDatabaseConfigured = (): boolean => {
  return (
    Boolean(env.DATABASE_URL) &&
    !env.DATABASE_URL.includes('user:password@localhost') &&
    !env.DATABASE_URL.includes('your_database_url')
  );
};
