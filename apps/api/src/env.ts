import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');
const result = dotenv.config({ path: envPath, override: true });
const parsed = result.parsed ?? {};

export const env = {
  ...process.env,
  ...parsed,
};
