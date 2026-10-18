import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import pgSession from 'connect-pg-simple';
import passport from 'passport';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';

import { env, isDatabaseConfigured } from './config/env';
import { configurePassport } from './config/passport';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './routes/authRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import sessionRoutes from './routes/sessionRoutes';
import taskRoutes from './routes/taskRoutes';
import subjectRoutes from './routes/subjectRoutes';
import settingsRoutes from './routes/settingsRoutes';
import analyticsRoutes from './routes/analyticsRoutes';

export function createApp(): Express {
  const app = express();

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Let React assets load smoothly
      crossOriginEmbedderPolicy: false,
    })
  );

  // Trust reverse proxy (e.g. Vercel, Nginx, Cloudflare)
  if (env.NODE_ENV === 'production' || Boolean(process.env.VERCEL)) {
    app.set('trust proxy', 1);
  }

  // CORS configuration
  const allowedOrigins = [
    env.CLIENT_URL,
    'https://my-25-min-focus.vercel.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, true); // Allow all in dev for ease of use
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Rate limiting for auth and API endpoints
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts, please try again later.' },
  });

  app.use('/api/', apiLimiter);
  app.use('/api/auth/', authLimiter);

const EMBEDDED_SUPABASE_CA = `-----BEGIN CERTIFICATE-----
MIIDxDCCAqygAwIBAgIUbLxMod62P2ktCiAkxnKJwtE9VPYwDQYJKoZIhvcNAQEL
BQAwazELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5l
dyBDYXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEeMBwGA1UEAwwVU3VwYWJh
c2UgUm9vdCAyMDIxIENBMB4XDTIxMDQyODEwNTY1M1oXDTMxMDQyNjEwNTY1M1ow
azELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5ldyBD
YXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEeMBwGA1UEAwwVU3VwYWJhc2Ug
Um9vdCAyMDIxIENBMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqQXW
QyHOB+qR2GJobCq/CBmQ40G0oDmCC3mzVnn8sv4XNeWtE5XcEL0uVih7Jo4Dkx1Q
DmGHBH1zDfgs2qXiLb6xpw/CKQPypZW1JssOTMIfQppNQ87K75Ya0p25Y3ePS2t2
GtvHxNjUV6kjOZjEn2yWEcBdpOVCUYBVFBNMB4YBHkNRDa/+S4uywAoaTWnCJLUi
cvTlHmMw6xSQQn1UfRQHk50DMCEJ7Cy1RxrZJrkXXRP3LqQL2ijJ6F4yMfh+Gyb4
O4XajoVj/+R4GwywKYrrS8PrSNtwxr5StlQO8zIQUSMiq26wM8mgELFlS/32Uclt
NaQ1xBRizkzpZct9DwIDAQABo2AwXjALBgNVHQ8EBAMCAQYwHQYDVR0OBBYEFKjX
uXY32CztkhImng4yJNUtaUYsMB8GA1UdIwQYMBaAFKjXuXY32CztkhImng4yJNUt
aUYsMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEBAB8spzNn+4VU
tVxbdMaX+39Z50sc7uATmus16jmmHjhIHz+l/9GlJ5KqAMOx26mPZgfzG7oneL2b
VW+WgYUkTT3XEPFWnTp2RJwQao8/tYPXWEJDc0WVQHrpmnWOFKU/d3MqBgBm5y+6
jB81TU/RG2rVerPDWP+1MMcNNy0491CTL5XQZ7JfDJJ9CCmXSdtTl4uUQnSuv/Qx
Cea13BX2ZgJc7Au30vihLhub52De4P/4gonKsNHYdbWjg7OWKwNv/zitGDVDB9Y2
CMTyZKG3XEu5Ghl1LEnI3QmEKsqaCLv12BnVjbkSeZsMnevJPs1Ye6TjjJwdik5P
o/bKiIz+Fq8=
-----END CERTIFICATE-----`;

  // Session storage
  let sessionStore: session.Store | undefined;
  if (isDatabaseConfigured()) {
    try {
      const PgStore = pgSession(session);
      const isRemoteSsl = env.DATABASE_URL.includes('supabase.com') || env.DATABASE_URL.includes('sslmode=');
      const cleanPgUrl = env.DATABASE_URL.replace(/[\?&]sslmode=[^&]*/, '');

      let sslConfig: any = undefined;
      if (isRemoteSsl) {
        const possibleCaPaths = [
          process.env.NODE_EXTRA_CA_CERTS,
          path.resolve(__dirname, '../certs/prod-ca-2021.crt'),
          path.resolve(__dirname, '../../server/certs/prod-ca-2021.crt'),
          path.resolve(process.cwd(), 'server/certs/prod-ca-2021.crt'),
          path.resolve(process.cwd(), 'certs/prod-ca-2021.crt'),
        ].filter(Boolean) as string[];

        let caContent = EMBEDDED_SUPABASE_CA;
        for (const p of possibleCaPaths) {
          if (fs.existsSync(p)) {
            try {
              caContent = fs.readFileSync(p, 'utf8');
              break;
            } catch {
              // fallback to embedded CA
            }
          }
        }

        sslConfig = {
          rejectUnauthorized: false,
          ca: caContent,
        };
      }

      sessionStore = new PgStore({
        conObject: {
          connectionString: isRemoteSsl ? cleanPgUrl : env.DATABASE_URL,
          ssl: sslConfig,
        },
        tableName: 'sessions',
        createTableIfMissing: true,
      });
    } catch (err) {
      console.warn('[Session] Failed to initialize PostgreSQL session store, falling back to memory store:', err);
    }
  }

  const isProd = env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);

  app.use(
    session({
      name: 'cognify.sid',
      store: sessionStore,
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      },
    })
  );

  // Passport initialization
  configurePassport();
  app.use(passport.initialize());
  app.use(passport.session());

  // Mount API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/sessions', sessionRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api/subjects', subjectRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/analytics', analyticsRoutes);

  // Serve client static files if production build exists
  const clientDistPath = path.resolve(__dirname, '../../client/dist');
  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }

  // Central error handling
  app.use(errorHandler);

  return app;
}

const app = createApp();

export default app;
export { app };
