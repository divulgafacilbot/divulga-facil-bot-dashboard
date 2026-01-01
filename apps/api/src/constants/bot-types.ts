export const BOT_TYPES = {
  ARTS: "ARTS",
  DOWNLOAD: "DOWNLOAD",
} as const;

export type BotType = (typeof BOT_TYPES)[keyof typeof BOT_TYPES];
