import { prisma } from "../db/prisma.js";

type TelemetryPayload = {
  eventType: string;
  userId?: string;
  telegramUserId?: string | number;
  origin?: string;
  metadata?: Record<string, unknown>;
};

class TelemetryService {
  async logEvent(payload: TelemetryPayload) {
    try {
      const telegramUserId = this.normalizeTelegramUserId(payload.telegramUserId);
      await prisma.telemetry_events.create({
        data: {
          event_type: payload.eventType,
          user_id: payload.userId || null,
          telegram_user_id: telegramUserId ?? undefined,
          origin: payload.origin || null,
          metadata: payload.metadata || undefined,
        },
      });
    } catch (error) {
      console.error("Erro ao salvar evento de telemetria:", error);
    }
  }

  private normalizeTelegramUserId(
    value?: string | number
  ): bigint | null {
    if (value === undefined || value === null) return null;
    try {
      if (typeof value === "number") {
        return BigInt(value);
      }
      const normalized = value.trim();
      if (!normalized) return null;
      return BigInt(normalized);
    } catch {
      return null;
    }
  }
}

export const telemetryService = new TelemetryService();
