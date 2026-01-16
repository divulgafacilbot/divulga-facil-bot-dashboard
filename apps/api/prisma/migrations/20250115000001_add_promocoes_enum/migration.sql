-- Migration 1/2: Add PROMOCOES enum values
-- PostgreSQL requires new enum values to be committed before use

-- Add PROMOCOES to BotType enum
ALTER TYPE "BotType" ADD VALUE IF NOT EXISTS 'PROMOCOES';

-- Add BOT_PROMOCOES to TicketCategory enum
ALTER TYPE "TicketCategory" ADD VALUE IF NOT EXISTS 'BOT_PROMOCOES';
