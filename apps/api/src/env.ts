import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');
const result = dotenv.config({ path: envPath, override: true });
const parsed = result.parsed ?? {};

type ExportedEnv = NodeJS.ProcessEnv & { JWT_SECRET: string };

const envVars: ExportedEnv = {
  ...process.env,
  ...parsed,
  JWT_SECRET: parsed.JWT_SECRET ?? process.env.JWT_SECRET ?? '',
};

if (!envVars.JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined');
}

export const env = envVars;
