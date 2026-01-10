-- CreateTable telegram_link_tokens
CREATE TABLE "telegram_link_tokens" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "token" VARCHAR(10) UNIQUE NOT NULL,
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "bot_type" "BotType" NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- CreateIndex
CREATE INDEX "telegram_link_tokens_token_idx" ON "telegram_link_tokens"("token");
CREATE INDEX "telegram_link_tokens_expires_at_idx" ON "telegram_link_tokens"("expires_at");
CREATE INDEX "telegram_link_tokens_user_id_bot_type_idx" ON "telegram_link_tokens"("user_id", "bot_type");
