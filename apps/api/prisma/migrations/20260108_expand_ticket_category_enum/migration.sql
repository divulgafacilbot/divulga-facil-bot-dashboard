-- CreateEnum TicketCategory
CREATE TYPE "TicketCategory" AS ENUM (
  'GENERAL',
  'BILLING',
  'TECHNICAL',
  'BOT_ARTS',
  'BOT_DOWNLOAD',
  'BOT_PINTEREST',
  'BOT_SUGGESTION',
  'PUBLIC_PAGE'
);

-- CreateEnum TicketPriority
CREATE TYPE "TicketPriority" AS ENUM (
  'LOW',
  'NORMAL',
  'HIGH',
  'URGENT'
);

-- CreateEnum TicketStatus
CREATE TYPE "TicketStatus" AS ENUM (
  'OPEN',
  'IN_PROGRESS',
  'WAITING_USER',
  'RESOLVED',
  'CLOSED'
);

-- AlterTable support_tickets - Convert category from VARCHAR to TicketCategory enum
ALTER TABLE "support_tickets"
  ALTER COLUMN "category" TYPE "TicketCategory" USING (
    CASE
      WHEN "category" = 'general' THEN 'GENERAL'
      WHEN "category" = 'billing' THEN 'BILLING'
      WHEN "category" = 'technical' THEN 'TECHNICAL'
      WHEN "category" = 'bot_arts' THEN 'BOT_ARTS'
      WHEN "category" = 'bot_download' THEN 'BOT_DOWNLOAD'
      ELSE 'GENERAL'
    END::"TicketCategory"
  );

-- AlterTable support_tickets - Convert priority from VARCHAR to TicketPriority enum
ALTER TABLE "support_tickets"
  ALTER COLUMN "priority" DROP DEFAULT,
  ALTER COLUMN "priority" TYPE "TicketPriority" USING (
    CASE
      WHEN "priority" = 'low' THEN 'LOW'
      WHEN "priority" = 'normal' THEN 'NORMAL'
      WHEN "priority" = 'high' THEN 'HIGH'
      WHEN "priority" = 'urgent' THEN 'URGENT'
      ELSE 'NORMAL'
    END::"TicketPriority"
  ),
  ALTER COLUMN "priority" SET DEFAULT 'NORMAL';

-- AlterTable support_tickets - Convert status from VARCHAR to TicketStatus enum
ALTER TABLE "support_tickets"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "TicketStatus" USING (
    CASE
      WHEN "status" = 'open' THEN 'OPEN'
      WHEN "status" = 'in_progress' THEN 'IN_PROGRESS'
      WHEN "status" = 'waiting_user' THEN 'WAITING_USER'
      WHEN "status" = 'resolved' THEN 'RESOLVED'
      WHEN "status" = 'closed' THEN 'CLOSED'
      ELSE 'OPEN'
    END::"TicketStatus"
  ),
  ALTER COLUMN "status" SET DEFAULT 'OPEN';

-- Add new index on category
CREATE INDEX IF NOT EXISTS "idx_support_tickets_category" ON "support_tickets"("category");
