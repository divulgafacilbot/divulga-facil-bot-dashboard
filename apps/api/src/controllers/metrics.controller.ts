import { Request, Response } from "express";
import { prisma } from "../db/prisma.js";
import { usageCountersService } from "../services/usage-counters.service.js";
import { BOT_TYPES } from "../constants/bot-types.js";

export class MetricsController {
  async getMetrics(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const [artsCount, downloadCount, usage, scraperApiFallbacks] = await Promise.all([
        prisma.telegram_bot_links.count({
          where: {
            user_id: userId,
            bot_type: BOT_TYPES.ARTS,
          },
        }),
        prisma.telegram_bot_links.count({
          where: {
            user_id: userId,
            bot_type: BOT_TYPES.DOWNLOAD,
          },
        }),
        usageCountersService.getMonthlyUsage(userId),
        // ToDo - colocar no dashboard admin quando ele estiver feito - métrica de uso do ScraperAPI
        prisma.telemetry_events.count({
          where: {
            user_id: userId,
            event_type: "SCRAPE_FALLBACK_SCRAPERAPI",
          },
        }),
      ]);

      return res.status(200).json({
        activeBots: {
          arts: artsCount,
          download: downloadCount,
        },
        usage,
        scrapingFallbacks: {
          scraperapi: scraperApiFallbacks,
        },
      });
    } catch (error) {
      console.error("Erro ao obter métricas:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}

export const metricsController = new MetricsController();
