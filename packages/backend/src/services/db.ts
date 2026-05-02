import { PrismaClient } from '@prisma/client';

// Single shared Prisma instance — avoids connection pool exhaustion in dev
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
});
