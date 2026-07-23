import { PrismaClient } from '@prisma/client';

// Prevents creating a new PrismaClient on every hot-reload in dev,
// which would otherwise exhaust your Postgres connection limit.
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}