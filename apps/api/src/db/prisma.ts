import { env } from '../env.js';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

if (!process.env.DATABASE_URL && env.DATABASE_URL) {
  process.env.DATABASE_URL = env.DATABASE_URL;
}
const connectionString = process.env.DATABASE_URL;
const useNeonAdapter = process.env.USE_NEON_ADAPTER === 'true';
if (!connectionString) {
  throw new Error('DATABASE_URL is required to initialize Prisma');
}

// Configure PostgreSQL pool with proper connection management
const pool = new Pool({
  connectionString,
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
  keepAlive: true, // Keep TCP connection alive
  keepAliveInitialDelayMillis: 10000, // Delay before first keepalive probe
});

// Handle pool errors to prevent crashes
pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: useNeonAdapter
      ? new PrismaNeon({ connectionString })
      : new PrismaPg(pool),
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
