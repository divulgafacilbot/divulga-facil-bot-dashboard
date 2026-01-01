import { Request, Response } from "express";
import { prisma } from "../db/prisma.js";
import { usageCountersService } from "../services/usage-counters.service.js";

export class MetricsController {
  async getMetrics(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const [artsCount, downloadCount, usage] = await Promise.all([
        prisma.telegram_bot_links.count({
          where: {
            user_id: userId,
            bot_type: "ARTS",
          },
        }),
        prisma.telegram_bot_links.count({
          where: {
            user_id: userId,
            bot_type: "DOWNLOAD",
          },
        }),
        usageCountersService.getMonthlyUsage(userId),
      ]);

      return res.status(200).json({
        activeBots: {
          arts: artsCount,
          download: downloadCount,
        },
        usage,
      });
    } catch (error) {
      console.error("Erro ao obter métricas:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}

export const metricsController = new MetricsController();
