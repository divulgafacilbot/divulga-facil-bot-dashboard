import { prisma } from "../db/prisma.js";

export class UsageCountersService {
  private getTodayDate(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  private getMonthRange(): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
    return { start, end };
  }

  async incrementRenders(userId: string): Promise<void> {
    const today = this.getTodayDate();
    await prisma.usage_counters.upsert({
      where: {
        user_id_date: {
          user_id: userId,
          date: today,
        },
      },
      update: {
        renders_count: { increment: 1 },
      },
      create: {
        user_id: userId,
        date: today,
        renders_count: 1,
        downloads_count: 0,
      },
    });
  }

  async incrementDownloads(userId: string): Promise<void> {
    const today = this.getTodayDate();
    await prisma.usage_counters.upsert({
      where: {
        user_id_date: {
          user_id: userId,
          date: today,
        },
      },
      update: {
        downloads_count: { increment: 1 },
      },
      create: {
        user_id: userId,
        date: today,
        renders_count: 0,
        downloads_count: 1,
      },
    });
  }

  async getMonthlyUsage(userId: string): Promise<{ renders: number; downloads: number }> {
    const { start, end } = this.getMonthRange();
    const rows = await prisma.usage_counters.findMany({
      where: {
        user_id: userId,
        date: {
          gte: start,
          lte: end,
        },
      },
      select: {
        renders_count: true,
        downloads_count: true,
      },
    });

    return rows.reduce(
      (acc, row) => {
        acc.renders += row.renders_count ?? 0;
        acc.downloads += row.downloads_count ?? 0;
        return acc;
      },
      { renders: 0, downloads: 0 }
    );
  }
}

export const usageCountersService = new UsageCountersService();
