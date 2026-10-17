import app from './app';
import { env, isGoogleOAuthConfigured, isDatabaseConfigured } from './config/env';
import { checkDatabaseConnection } from './config/db';

if (!process.env.VERCEL) {
  app.listen(env.PORT, async () => {
    console.log(`\n======================================================`);
    console.log(`  🚀 FocusFlow Server running at http://localhost:${env.PORT}`);
    console.log(`  🌐 Client configured at ${env.CLIENT_URL}`);
    console.log(`======================================================`);

    if (!isDatabaseConfigured()) {
      console.warn(`  ⚠️ [Database] DATABASE_URL is not set or uses placeholders.`);
      console.warn(`     Provide a valid PostgreSQL connection string in .env`);
    } else {
      const dbCheck = await checkDatabaseConnection();
      if (dbCheck.connected) {
        console.log(`  ✅ [Database] PostgreSQL connected successfully via Prisma.`);
      } else {
        console.warn(`  ⚠️ [Database] Could not connect: ${dbCheck.error}`);
      }
    }

    if (!isGoogleOAuthConfigured()) {
      console.warn(`  ⚠️ [Google OAuth] GOOGLE_CLIENT_ID or SECRET not set.`);
      console.warn(`     Google login will display a setup guide.`);
    } else {
      console.log(`  ✅ [Google OAuth] Configured with callback: ${env.GOOGLE_CALLBACK_URL}`);
    }
    console.log(`======================================================\n`);
  });
}

export default app;
export { app };
