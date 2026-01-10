/**
 * Constants barrel export
 * Re-exports all constants for convenient imports
 */

export const BOT_NAME = "Divulga Fácil";

export const BOT_TYPES = {
  ARTS: "ARTS",
  DOWNLOAD: "DOWNLOAD",
  PINTEREST: "PINTEREST",
  SUGGESTION: "SUGGESTION",
} as const;

export * from './routes';
export * from './copy';
export * from './status';
export * from './pagination';
