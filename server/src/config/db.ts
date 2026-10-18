import { PrismaClient } from '@prisma/client';
import { env, isDatabaseConfigured } from './env';

/**
 * Optimizes the PostgreSQL database URL for serverless environments (Vercel + Supabase).
 * - Enforces `connection_limit=1` to prevent connection multiplication per serverless instance.
 * - Enforces `pgbouncer=true` when connecting to Supabase's transaction pooler (port 6543) so Prisma
 *   uses the simple query protocol without prepared statements.
 * - Emits clear diagnostics if port 5432 (session pooler) is detected in serverless production.
 */
export function getRuntimeDatabaseUrl(rawUrl?: string): string {
  const urlStr = rawUrl !== undefined ? rawUrl : (process.env.DATABASE_URL || '');
  if (!urlStr || urlStr.trim() === '') return '';

  try {
    const parsed = new URL(urlStr);
    const isSupabasePooler = parsed.hostname.includes('pooler.supabase.com');
    const isPort6543 = parsed.port === '6543';
    const isPort5432 = parsed.port === '5432';

    if (isSupabasePooler && isPort5432 && (process.env.VERCEL || process.env.NODE_ENV === 'production')) {
      console.warn(
        '[Database Warning] DATABASE_URL is configured on port 5432 (Session mode). ' +
        'Supabase limits session mode to pool_size: 15 (causing EMAXCONNSESSION). ' +
        'For serverless deployments on Vercel, switch to port 6543 (Transaction mode) with ?pgbouncer=true&connection_limit=1.'
      );
    }

    // When connecting to transaction pooler on port 6543, ensure pgbouncer=true is present
    if (isPort6543 || (isSupabasePooler && !isPort5432)) {
      if (!parsed.searchParams.has('pgbouncer')) {
        parsed.searchParams.set('pgbouncer', 'true');
      }
    }

    // Set a conservative connection limit of 1 per serverless instance if not explicitly set
    if (!parsed.searchParams.has('connection_limit')) {
      parsed.searchParams.set('connection_limit', '1');
    }

    return parsed.toString();
  } catch {
    return urlStr;
  }
}

// Persistent singleton across warm serverless container invocations (both dev & production)
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

const runtimeDatabaseUrl = getRuntimeDatabaseUrl(env.DATABASE_URL);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: runtimeDatabaseUrl
      ? {
          db: {
            url: runtimeDatabaseUrl,
          },
        }
      : undefined,
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

// Always assign to globalThis so warm lambdas reuse the exact same client and single connection
globalForPrisma.prisma = prisma;

export async function checkDatabaseConnection(): Promise<{ connected: boolean; error?: string }> {
  if (!isDatabaseConfigured()) {
    return {
      connected: false,
      error: 'DATABASE_URL is not configured. Please configure your PostgreSQL connection string in environment variables.',
    };
  }

  try {
    const timeoutPromise = new Promise<{ connected: false; error: string }>((_, reject) =>
      setTimeout(
        () => reject(new Error('PostgreSQL connection attempt timed out (5s). Check your database host/port.')),
        5000
      )
    );
    await Promise.race([prisma.$queryRaw`SELECT 1`, timeoutPromise]);
    return { connected: true };
  } catch (err: any) {
    return {
      connected: false,
      error: err?.message || 'Failed to connect to PostgreSQL database.',
    };
  }
}
