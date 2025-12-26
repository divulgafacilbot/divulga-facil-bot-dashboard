import { beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/db/prisma.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});
