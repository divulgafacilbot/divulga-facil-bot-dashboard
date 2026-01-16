-- Migration 2/2: Update existing data from ARTS to PROMOCOES

-- Update telegram_bot_links table
UPDATE telegram_bot_links SET bot_type = 'PROMOCOES' WHERE bot_type = 'ARTS';

-- Update telegram_link_tokens table
UPDATE telegram_link_tokens SET bot_type = 'PROMOCOES' WHERE bot_type = 'ARTS';

-- Update telegram_links table
UPDATE telegram_links SET bot_type = 'PROMOCOES' WHERE bot_type = 'ARTS';

-- Update user_entitlements table (uses VARCHAR)
UPDATE user_entitlements SET bot_type = 'PROMOCOES' WHERE bot_type = 'ARTS';

-- Update promo_tokens table (uses VARCHAR)
UPDATE promo_tokens SET bot_type = 'PROMOCOES' WHERE bot_type = 'ARTS';

-- Update support_tickets table
UPDATE support_tickets SET category = 'BOT_PROMOCOES' WHERE category = 'BOT_ARTS';

-- Update default value for telegram_links.bot_type column
ALTER TABLE telegram_links ALTER COLUMN bot_type SET DEFAULT 'PROMOCOES'::"BotType";

-- Note: The old values (ARTS, BOT_ARTS) remain in the enum types
-- PostgreSQL doesn't support removing enum values without recreating the type
