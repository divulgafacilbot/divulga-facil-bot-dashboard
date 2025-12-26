-- Posting Bot SaaS - Initial Schema Migration
-- Created: 2024-12-24
-- Description: Creates all tables for MVP

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ======================================================================
-- 1. USERS TABLE
-- ======================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ======================================================================
-- 2. PASSWORD RESET TOKENS
-- ======================================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- ======================================================================
-- 3. PLANS TABLE
-- ======================================================================
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  billing_cycle VARCHAR(50) DEFAULT 'MONTHLY' CHECK (billing_cycle IN ('MONTHLY', 'YEARLY', 'LIFETIME')),
  max_artes_por_dia INTEGER DEFAULT 10,
  max_downloads_por_dia INTEGER DEFAULT 10,
  max_execucoes_simultaneas INTEGER DEFAULT 1,
  cooldown_entre_requisicoes INTEGER DEFAULT 5,
  acesso_bot_geracao BOOLEAN DEFAULT false,
  acesso_bot_download BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ======================================================================
-- 4. SUBSCRIPTIONS TABLE
-- ======================================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES plans(id),
  status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED', 'REFUNDED')),
  expires_at TIMESTAMP WITH TIME ZONE,
  kiwify_customer_id VARCHAR(255),
  kiwify_transaction_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_expires_at ON subscriptions(expires_at);

-- ======================================================================
-- 5. TELEGRAM LINKS TABLE
-- ======================================================================
CREATE TABLE IF NOT EXISTS telegram_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  telegram_user_id BIGINT UNIQUE NOT NULL,
  telegram_chat_id BIGINT NOT NULL,
  linked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_telegram_links_user_id ON telegram_links(user_id);
CREATE UNIQUE INDEX idx_telegram_links_telegram_user_id ON telegram_links(telegram_user_id);

-- ======================================================================
-- 6. TELEGRAM BOT LINKS TABLE
-- ======================================================================
CREATE TABLE IF NOT EXISTS telegram_bot_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  bot_type VARCHAR(50) NOT NULL CHECK (bot_type IN ('ARTS', 'DOWNLOAD')),
  linked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, bot_type)
);

CREATE INDEX idx_telegram_bot_links_user_id ON telegram_bot_links(user_id);

-- ======================================================================
-- 7. USER BRAND CONFIGS TABLE
-- ======================================================================
CREATE TABLE IF NOT EXISTS user_brand_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  template_id VARCHAR(100) DEFAULT 'default_v1',
  bg_color VARCHAR(7) DEFAULT '#FFFFFF',
  text_color VARCHAR(7) DEFAULT '#000000',
  font_family VARCHAR(100) DEFAULT 'Inter',
  show_coupon BOOLEAN DEFAULT false,
  coupon_text VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_brand_configs_user_id ON user_brand_configs(user_id);

-- ======================================================================
-- 8. KIWIFY EVENTS TABLE (Webhook Logs)
-- ======================================================================
CREATE TABLE IF NOT EXISTS kiwify_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100),
  payload JSONB NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_kiwify_events_event_id ON kiwify_events(event_id);
CREATE INDEX idx_kiwify_events_received_at ON kiwify_events(received_at);

-- ======================================================================
-- 9. USAGE COUNTERS TABLE (Optional)
-- ======================================================================
CREATE TABLE IF NOT EXISTS usage_counters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  renders_count INTEGER DEFAULT 0,
  downloads_count INTEGER DEFAULT 0,
  UNIQUE(user_id, date)
);

CREATE INDEX idx_usage_counters_user_id ON usage_counters(user_id);
CREATE INDEX idx_usage_counters_date ON usage_counters(date);

-- ======================================================================
-- 10. TELEMETRY EVENTS TABLE (Audit Log)
-- ======================================================================
CREATE TABLE IF NOT EXISTS telemetry_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  telegram_user_id BIGINT,
  origin VARCHAR(50) CHECK (origin IN ('dashboard', 'bot_arts', 'bot_download', 'webhook', 'admin')),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_telemetry_events_user_id ON telemetry_events(user_id);
CREATE INDEX idx_telemetry_events_event_type ON telemetry_events(event_type);
CREATE INDEX idx_telemetry_events_created_at ON telemetry_events(created_at);

-- ======================================================================
-- SEED DATA: Default Plan
-- ======================================================================
INSERT INTO plans (name, billing_cycle, max_artes_por_dia, max_downloads_por_dia, acesso_bot_geracao, acesso_bot_download)
VALUES
  ('Free Trial', 'MONTHLY', 5, 5, true, false),
  ('Pro Monthly', 'MONTHLY', 50, 50, true, true),
  ('Pro Yearly', 'YEARLY', 100, 100, true, true)
ON CONFLICT DO NOTHING;

-- ======================================================================
-- COMPLETED
-- ======================================================================
