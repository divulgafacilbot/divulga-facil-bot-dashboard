import { describe, expect, it, vi } from "vitest";
import { metricsController } from "../../src/controllers/metrics.controller.js";

vi.mock("../../src/db/prisma.js", () => ({
  prisma: {
    telegram_bot_links: {
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
    usageCountersService.getMonthlyUsage.mockResolvedValue({
      renders: 5,
      downloads: 3,
    });

    const req = { user: { id: "user-1" } } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;

    await metricsController.getMetrics(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      activeBots: { arts: 2, download: 1 },
      usage: { renders: 5, downloads: 3 },
    });
  });

  it("returns 401 when unauthenticated", async () => {
    const req = { user: null } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;

    await metricsController.getMetrics(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
  });
});
