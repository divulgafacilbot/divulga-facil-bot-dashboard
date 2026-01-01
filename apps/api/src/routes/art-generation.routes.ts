import { Router } from 'express';
import { artGenerationController } from '../controllers/art-generation.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// POST /api/generate-art - Generate art from product URL (requires auth)
router.post(
  '/generate-art',
  authMiddleware,
  artGenerationController.generateArt.bind(artGenerationController)
);

// GET /api/test-art - Generate test art with mock data
router.get(
  '/test-art',
  artGenerationController.testArt.bind(artGenerationController)
);

export default router;
