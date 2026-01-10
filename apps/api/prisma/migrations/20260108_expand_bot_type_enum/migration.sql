-- CreateEnum
CREATE TYPE "BotType" AS ENUM ('ARTS', 'DOWNLOAD', 'PINTEREST', 'SUGGESTION');

-- AlterTable telegram_bot_links - Convert bot_type from VARCHAR to BotType enum
ALTER TABLE "telegram_bot_links"
  ALTER COLUMN "bot_type" TYPE "BotType" USING ("bot_type"::text::"BotType");

-- AlterTable telegram_links - Convert bot_type from VARCHAR to BotType enum
ALTER TABLE "telegram_links"
  ALTER COLUMN "bot_type" DROP DEFAULT,
  ALTER COLUMN "bot_type" TYPE "BotType" USING ("bot_type"::text::"BotType"),
  ALTER COLUMN "bot_type" SET DEFAULT 'ARTS';
