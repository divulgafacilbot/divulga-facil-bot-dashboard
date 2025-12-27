-- Ensure UUID extension exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" VARCHAR(50) DEFAULT 'USER',
    "is_active" BOOLEAN DEFAULT true,
    "email_verified" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(6),
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(255),

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verification_tokens" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_history" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID,
    "email" VARCHAR(255) NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "failure_reason" VARCHAR(255),
    "login_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "location" VARCHAR(255),
    "device_info" JSONB,

    CONSTRAINT "login_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kiwify_events" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "event_id" VARCHAR(255) NOT NULL,
    "event_type" VARCHAR(100),
    "payload" JSONB NOT NULL,
    "received_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kiwify_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(100) NOT NULL,
    "billing_cycle" VARCHAR(50) DEFAULT 'MONTHLY',
    "max_artes_por_dia" INTEGER DEFAULT 10,
    "max_downloads_por_dia" INTEGER DEFAULT 10,
    "max_execucoes_simultaneas" INTEGER DEFAULT 1,
    "cooldown_entre_requisicoes" INTEGER DEFAULT 5,
    "acesso_bot_geracao" BOOLEAN DEFAULT false,
    "acesso_bot_download" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID,
    "plan_id" UUID,
    "status" VARCHAR(50) DEFAULT 'ACTIVE',
    "expires_at" TIMESTAMPTZ(6),
    "kiwify_customer_id" VARCHAR(255),
    "kiwify_transaction_id" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_bot_links" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID,
    "bot_type" VARCHAR(50) NOT NULL,
    "linked_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_bot_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_links" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID,
    "telegram_user_id" BIGINT NOT NULL,
    "telegram_chat_id" BIGINT NOT NULL,
    "linked_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telemetry_events" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "event_type" VARCHAR(100) NOT NULL,
    "user_id" UUID,
    "telegram_user_id" BIGINT,
    "origin" VARCHAR(50),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telemetry_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_counters" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID,
    "date" DATE NOT NULL,
    "renders_count" INTEGER DEFAULT 0,
    "downloads_count" INTEGER DEFAULT 0,

    CONSTRAINT "usage_counters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_brand_configs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID,
    "template_id" VARCHAR(100) DEFAULT 'default_v1',
    "bg_color" VARCHAR(7) DEFAULT '#FFFFFF',
    "text_color" VARCHAR(7) DEFAULT '#000000',
    "font_family" VARCHAR(100) DEFAULT 'Inter',
    "show_coupon" BOOLEAN DEFAULT false,
    "coupon_text" VARCHAR(50),
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_brand_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_email" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_role" ON "users"("role");

-- CreateIndex
CREATE INDEX "idx_password_reset_tokens_expires_at" ON "password_reset_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "idx_password_reset_tokens_user_id" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE INDEX "idx_refresh_tokens_user_id" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "idx_refresh_tokens_expires_at" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "idx_refresh_tokens_token_hash" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "idx_email_verification_tokens_user_id" ON "email_verification_tokens"("user_id");

-- CreateIndex
CREATE INDEX "idx_email_verification_tokens_expires_at" ON "email_verification_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "idx_login_history_user_id" ON "login_history"("user_id");

-- CreateIndex
CREATE INDEX "idx_login_history_email" ON "login_history"("email");

-- CreateIndex
CREATE INDEX "idx_login_history_login_at" ON "login_history"("login_at" DESC);

-- CreateIndex
CREATE INDEX "idx_login_history_success" ON "login_history"("success");

-- CreateIndex
CREATE UNIQUE INDEX "idx_kiwify_events_event_id" ON "kiwify_events"("event_id");

-- CreateIndex
CREATE INDEX "idx_kiwify_events_received_at" ON "kiwify_events"("received_at");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_user_id_key" ON "subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "idx_subscriptions_expires_at" ON "subscriptions"("expires_at");

-- CreateIndex
CREATE INDEX "idx_subscriptions_status" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "idx_subscriptions_user_id" ON "subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "idx_telegram_bot_links_user_id" ON "telegram_bot_links"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_bot_links_user_id_bot_type_key" ON "telegram_bot_links"("user_id", "bot_type");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_links_user_id_key" ON "telegram_links"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "idx_telegram_links_telegram_user_id" ON "telegram_links"("telegram_user_id");

-- CreateIndex
CREATE INDEX "idx_telegram_links_user_id" ON "telegram_links"("user_id");

-- CreateIndex
CREATE INDEX "idx_telemetry_events_created_at" ON "telemetry_events"("created_at");

-- CreateIndex
CREATE INDEX "idx_telemetry_events_event_type" ON "telemetry_events"("event_type");

-- CreateIndex
CREATE INDEX "idx_telemetry_events_user_id" ON "telemetry_events"("user_id");

-- CreateIndex
CREATE INDEX "idx_usage_counters_date" ON "usage_counters"("date");

-- CreateIndex
CREATE INDEX "idx_usage_counters_user_id" ON "usage_counters"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "usage_counters_user_id_date_key" ON "usage_counters"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "user_brand_configs_user_id_key" ON "user_brand_configs"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_brand_configs_user_id" ON "user_brand_configs"("user_id");

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_history" ADD CONSTRAINT "login_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "telegram_bot_links" ADD CONSTRAINT "telegram_bot_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "telegram_links" ADD CONSTRAINT "telegram_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "telemetry_events" ADD CONSTRAINT "telemetry_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "usage_counters" ADD CONSTRAINT "usage_counters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_brand_configs" ADD CONSTRAINT "user_brand_configs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
