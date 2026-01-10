import { Router } from 'express';
import { requireAdmin, requirePermission } from '../../middleware/require-admin.middleware.js';
import { promoTokensController } from '../../controllers/admin/promo-tokens.controller.js';
import {
  createPromoTokenSchema,
  updatePromoTokenSchema,
  getPromoTokensQuerySchema,
  tokenIdParamSchema,
} from '../../validators/admin/promo-tokens.validator.js';
import { AdminPermission } from '../../constants/admin-enums.js';

const router = Router();

// Validation middleware for Zod schemas
const validateBody = (schema: any) => {
  return (req: any, res: any, next: any) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error: any) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors || error.message,
      });
    }
  };
};

const validateQuery = (schema: any) => {
  return (req: any, res: any, next: any) => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated;
      next();
    } catch (error: any) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors || error.message,
      });
    }
  };
};

const validateParams = (schema: any) => {
  return (req: any, res: any, next: any) => {
    try {
      const validated = schema.parse(req.params);
      req.params = validated;
      next();
    } catch (error: any) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors || error.message,
      });
    }
  };
};

// POST /api/admin/promo-tokens - Create token
router.post(
  '/',
  requireAdmin,
  requirePermission(AdminPermission.PROMO_TOKENS),
  validateBody(createPromoTokenSchema),
  (req, res) => promoTokensController.createToken(req, res)
);

// GET /api/admin/promo-tokens - List tokens with filters
router.get(
  '/',
  requireAdmin,
  requirePermission(AdminPermission.PROMO_TOKENS),
  validateQuery(getPromoTokensQuerySchema),
  (req, res) => promoTokensController.getTokens(req, res)
);

// GET /api/admin/promo-tokens/:id - Get single token
router.get(
  '/:id',
  requireAdmin,
  requirePermission(AdminPermission.PROMO_TOKENS),
  validateParams(tokenIdParamSchema),
  (req, res) => promoTokensController.getTokenById(req, res)
);

// PATCH /api/admin/promo-tokens/:id - Update token
router.patch(
  '/:id',
  requireAdmin,
  requirePermission(AdminPermission.PROMO_TOKENS),
  validateParams(tokenIdParamSchema),
  validateBody(updatePromoTokenSchema),
  (req, res) => promoTokensController.updateToken(req, res)
);

// DELETE /api/admin/promo-tokens/:id - Delete token
router.delete(
  '/:id',
  requireAdmin,
  requirePermission(AdminPermission.PROMO_TOKENS),
  validateParams(tokenIdParamSchema),
  (req, res) => promoTokensController.deleteToken(req, res)
);

// POST /api/admin/promo-tokens/:id/rotate - Rotate token
router.post(
  '/:id/rotate',
  requireAdmin,
  requirePermission(AdminPermission.PROMO_TOKENS),
  validateParams(tokenIdParamSchema),
  (req, res) => promoTokensController.rotateToken(req, res)
);

export default router;
