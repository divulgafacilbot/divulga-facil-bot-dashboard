import { Router } from "express";
import { metricsController } from "../controllers/metrics.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/me/metrics", authMiddleware, metricsController.getMetrics.bind(metricsController));

export default router;
