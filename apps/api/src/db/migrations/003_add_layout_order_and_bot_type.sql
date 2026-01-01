-- Description: Add layout order fields and bot_type for telegram link tokens

ALTER TABLE user_layout_preferences
  ADD COLUMN IF NOT EXISTS feed_order JSONB,
  ADD COLUMN IF NOT EXISTS story_order JSONB;

ALTER TABLE telegram_links
  ADD COLUMN IF NOT EXISTS bot_type VARCHAR(50) DEFAULT 'ARTS';

CREATE INDEX IF NOT EXISTS idx_telegram_links_bot_type ON telegram_links(bot_type);
