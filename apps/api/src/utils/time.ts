import { DateTime } from 'luxon';

/**
 * Timezone oficial da plataforma
 */
export const PLATFORM_TIMEZONE = 'America/Sao_Paulo';

/**
 * Hora do corte do dia lógico (06:00 BRT)
 */
export const LOGICAL_DAY_CUTOFF_HOUR = 6;

/**
 * TTL padrão da plataforma (30 dias)
 */
export const DEFAULT_TTL_DAYS = 30;

/**
 * Retorna o momento atual em BRT
 */
export function nowBrt(): Date {
  return DateTime.now().setZone(PLATFORM_TIMEZONE).toJSDate();
}

/**
 * Converte uma Date para DateTime BRT
 */
export function toBrtDateTime(date: Date = new Date()): DateTime {
  return DateTime.fromJSDate(date).setZone(PLATFORM_TIMEZONE);
}

/**
 * Retorna o dayKey (YYYY-MM-DD) respeitando corte às 06:00 BRT
 *
 * Regra:
 * - Se hora BRT < 06:00 → dayKey = dia anterior
 * - Se hora BRT >= 06:00 → dayKey = dia atual
 *
 * Exemplos:
 * - 2026-01-08 05:59 BRT → "2026-01-07"
 * - 2026-01-08 06:00 BRT → "2026-01-08"
 */
export function getDayKey(date?: Date): string {
  const dt = date ? toBrtDateTime(date) : DateTime.now().setZone(PLATFORM_TIMEZONE);

  // Se antes das 06:00, usar dia anterior
  if (dt.hour < LOGICAL_DAY_CUTOFF_HOUR) {
    return dt.minus({ days: 1 }).toFormat('yyyy-MM-dd');
  }

  return dt.toFormat('yyyy-MM-dd');
}

/**
 * Verifica se mudou o dia lógico
 */
export function isNewLogicalDay(lastDayKey: string, currentDayKey: string): boolean {
  return lastDayKey !== currentDayKey;
}

/**
 * Adiciona N dias a uma data
 */
export function addDays(date: Date, n: number): Date {
  return toBrtDateTime(date).plus({ days: n }).toJSDate();
}

/**
 * Subtrai N dias de uma data
 */
export function subtractDays(date: Date, n: number): Date {
  return toBrtDateTime(date).minus({ days: n }).toJSDate();
}

/**
 * Calcula expiresAt baseado em TTL
 *
 * @param from Data base (padrão: agora)
 * @param days TTL em dias (padrão: 30)
 */
export function computeExpiresAt(from: Date = nowBrt(), days: number = DEFAULT_TTL_DAYS): Date {
  return addDays(from, days);
}

/**
 * Verifica se uma data expirou
 */
export function isExpired(expiresAt: Date, now?: Date): boolean {
  const nowDate = now || nowBrt();
  return expiresAt < nowDate;
}

/**
 * Calcula cutoff para janelas "últimos X dias"
 *
 * @param days Número de dias
 * @returns Data de corte (now - days)
 */
export function getCutoffDate(days: number): Date {
  return subtractDays(nowBrt(), days);
}

/**
 * Formata data para exibição em BRT
 */
export function formatBrt(date: Date, format: string = 'yyyy-MM-dd HH:mm:ss'): string {
  return toBrtDateTime(date).toFormat(format);
}

/**
 * Calcula próximo horário de execução (ex: próximo 06:15 BRT)
 */
export function getNextRunTime(hour: number, minute: number): Date {
  const now = DateTime.now().setZone(PLATFORM_TIMEZONE);
  let next = now.set({ hour, minute, second: 0, millisecond: 0 });

  // Se já passou hoje, agenda para amanhã
  if (next <= now) {
    next = next.plus({ days: 1 });
  }

  return next.toJSDate();
}

/**
 * Valida se uma janela de tempo está dentro do limite
 */
export function isWithinWindow(timestamp: Date, windowSeconds: number, now?: Date): boolean {
  const nowDate = now || nowBrt();
  const diffMs = nowDate.getTime() - timestamp.getTime();
  const diffSeconds = diffMs / 1000;
  return diffSeconds <= windowSeconds;
}
