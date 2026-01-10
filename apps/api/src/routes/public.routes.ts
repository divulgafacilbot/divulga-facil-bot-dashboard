import { Router } from 'express';
import { PublicController } from '../controllers/public/public.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { botFilterMiddleware } from '../middleware/bot-filter.middleware.js';
import { visitorIdMiddleware } from '../middleware/visitor-id.middleware.js';
import { publicRateLimitMiddleware } from '../middleware/public-rate-limit.middleware.js';
import { dedupeMiddleware } from '../middleware/dedupe.middleware.js';
import {
  ListCardsQuerySchema,
  TrackEventBodySchema,
  SlugParamSchema,
  CardSlugParamSchema
} from '../validators/public.validators.js';

const router = Router();

// Middleware stack: botFilter → visitorId → rateLimit → dedupe
const publicMiddlewareStack = [
  botFilterMiddleware,
  visitorIdMiddleware
];

// Public routes (no auth)
router.get(
  '/api/public/:slug/cards',
  ...publicMiddlewareStack,
  publicRateLimitMiddleware('PAGE_VIEWS'),
  validate(SlugParamSchema, 'params'),
  validate(ListCardsQuerySchema, 'query'),
  PublicController.listCards
);

router.post(
  '/api/public/events',
  ...publicMiddlewareStack,
  publicRateLimitMiddleware('PAGE_VIEWS'),
  dedupeMiddleware,
  validate(TrackEventBodySchema, 'body'),
  PublicController.trackEvent
);

router.get(
  '/r/:slug/:cardSlug',
  ...publicMiddlewareStack,
  publicRateLimitMiddleware('CTA_CLICKS'),
  dedupeMiddleware,
  validate(CardSlugParamSchema, 'params'),
  PublicController.redirectToAffiliate
);

router.get(
  '/:slug/:cardSlug',
  ...publicMiddlewareStack,
  publicRateLimitMiddleware('CARD_VIEWS'),
  validate(CardSlugParamSchema, 'params'),
  PublicController.getPublicCard
);

router.get(
  '/:slug',
  ...publicMiddlewareStack,
  publicRateLimitMiddleware('PAGE_VIEWS'),
  validate(SlugParamSchema, 'params'),
  PublicController.getPublicProfile
);

export default router;
