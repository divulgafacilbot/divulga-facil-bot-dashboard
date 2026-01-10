export const TIME_CONSTANTS = {
  // TTL
  TTL_DAYS: 30,
  TTL_DAYS_EXTENDED: 45, // For safety margins

  // Dedupe windows
  DEDUPE_WINDOW_SECONDS: 3600, // 1 hour

  // Housekeeping
  HOUSEKEEPING_LOCK_MINUTES: 10,
  HOUSEKEEPING_RUN_HOUR: 6,
  HOUSEKEEPING_RUN_MINUTE: 15,

  // Scheduler
  DEFAULT_RUN_AT_BRT: '06:15',
} as const;
