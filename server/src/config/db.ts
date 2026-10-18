import { PrismaClient } from '@prisma/client';
import { env, isDatabaseConfigured } from './env';

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export async function checkDatabaseConnection(): Promise<{ connected: boolean; error?: string }> {
  if (!isDatabaseConfigured()) {
    return {
      connected: false,
      error: 'DATABASE_URL is not configured. Please configure your PostgreSQL connection string in environment variables.',
    };
  }

  try {
    const timeoutPromise = new Promise<{ connected: false; error: string }>((_, reject) =>
      setTimeout(() => reject(new Error('PostgreSQL connection attempt timed out (5s). Check your database host/port.')), 5000)
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
