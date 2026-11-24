import { existsSync } from 'fs';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';

function loadEnv() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dotenv = require('dotenv') as typeof import('dotenv');
    const candidates = [
      resolve(process.cwd(), '.env'),
      resolve(process.cwd(), '../../.env'),
      resolve(__dirname, '../../../.env'),
    ];
    for (const p of candidates) {
      if (existsSync(p)) {
        dotenv.config({ path: p });
        return;
      }
    }
  } catch {
    /* dotenv optional */
  }
}

loadEnv();

const globalForPrisma = globalThis as unknown as { __petpalPrisma?: PrismaClient };

export const prisma =
  globalForPrisma.__petpalPrisma ??
  new PrismaClient({
    log: process.env.PRISMA_LOG === '1' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__petpalPrisma = prisma;
}

export * from '@prisma/client';
export { PrismaClient };
