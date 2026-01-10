-- CreateTable: promo_tokens
CREATE TABLE IF NOT EXISTS promo_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_type VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ(6),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by_id UUID NOT NULL,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_promo_tokens_created_by FOREIGN KEY (created_by_id) REFERENCES admin_users(id) ON DELETE CASCADE,
  CONSTRAINT chk_promo_tokens_bot_type CHECK (bot_type IN ('ARTS', 'DOWNLOAD', 'PINTEREST', 'SUGGESTION'))
);

-- CreateIndex: Unique index on token
CREATE UNIQUE INDEX IF NOT EXISTS idx_promo_tokens_token ON promo_tokens(token);

-- CreateIndex: Composite index for filtering by bot_type and created_at
CREATE INDEX IF NOT EXISTS idx_promo_tokens_bot_type_created_at ON promo_tokens(bot_type, created_at DESC);

-- CreateIndex: Index for filtering by bot_type and expires_at
CREATE INDEX IF NOT EXISTS idx_promo_tokens_bot_type_expires_at ON promo_tokens(bot_type, expires_at);

-- CreateIndex: Index for filtering by is_active status
CREATE INDEX IF NOT EXISTS idx_promo_tokens_is_active ON promo_tokens(is_active);

-- CreateIndex: Index on created_by_id for foreign key lookups
CREATE INDEX IF NOT EXISTS idx_promo_tokens_created_by_id ON promo_tokens(created_by_id);
