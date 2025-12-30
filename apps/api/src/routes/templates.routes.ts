import { Router } from 'express';
import multer from 'multer';
import { TemplatesController } from '../controllers/templates.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.get('/', requireAuth, TemplatesController.list);

router.post(
  '/',
  requireAuth,
  upload.fields([
    { name: 'feed', maxCount: 1 },
    { name: 'story', maxCount: 1 },
  ]),
  TemplatesController.create
);

router.put(
  '/:id',
  requireAuth,
  upload.fields([
    { name: 'feed', maxCount: 1 },
    { name: 'story', maxCount: 1 },
  ]),
  TemplatesController.update
);

router.delete('/', requireAuth, TemplatesController.remove);

export default router;
