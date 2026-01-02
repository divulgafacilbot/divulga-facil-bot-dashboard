import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { metricsController } from "../../src/controllers/metrics.controller.js";

vi.mock("../../src/db/prisma.js", () => ({
  prisma: {
    telegram_bot_links: {
      count: vi.fn(),
    },
    telemetry_events: {
      count: vi.fn(),
    },
  },
}));

vi.mock("../../src/services/usage-counters.service.js", () => ({
  usageCountersService: {
    getMonthlyUsage: vi.fn(),
  },
}));

describe("metricsController.getMetrics", () => {
  it("returns metrics payload for authenticated user", async () => {
    const { prisma } = await import("../../src/db/prisma.js");
    const { usageCountersService } = await import("../../src/services/usage-counters.service.js");

    prisma.telegram_bot_links.count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1);
    prisma.telemetry_events.count.mockResolvedValueOnce(4);
    usageCountersService.getMonthlyUsage.mockResolvedValue({
      renders: 5,
      downloads: 3,
    });

    const req = { user: { id: "user-1" } } as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;

    await metricsController.getMetrics(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      activeBots: { arts: 2, download: 1 },
      usage: { renders: 5, downloads: 3 },
      scrapingFallbacks: {
        scraperapi: 4,
      },
    });
  });

  it("returns 401 when unauthenticated", async () => {
    const req = { user: null } as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;

    await metricsController.getMetrics(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
  });
});
