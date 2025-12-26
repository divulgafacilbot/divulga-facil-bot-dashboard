-- Migration: Add login history table
-- Description: Tracks all login attempts (successful and failed) for security monitoring

-- Create login_history table
CREATE TABLE IF NOT EXISTS login_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  failure_reason VARCHAR(255),
  login_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  location VARCHAR(255),
  device_info JSONB
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_email ON login_history(email);
CREATE INDEX IF NOT EXISTS idx_login_history_login_at ON login_history(login_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_success ON login_history(success);

-- Add comment to table
COMMENT ON TABLE login_history IS 'Tracks all login attempts for security monitoring and user activity';
