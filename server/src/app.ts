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

        let caContent: string | undefined = undefined;
        for (const p of possibleCaPaths) {
          if (fs.existsSync(p)) {
            caContent = fs.readFileSync(p, 'utf8');
            break;
          }
        }

        sslConfig = {
          rejectUnauthorized: true,
          ...(caContent ? { ca: caContent } : {}),
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
      name: 'focusflow.sid',
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
