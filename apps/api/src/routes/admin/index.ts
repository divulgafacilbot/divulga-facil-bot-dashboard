import { Router } from 'express';
import authRoutes from './auth.routes.js';
import overviewRoutes from './overview.routes.js';
import usersRoutes from './users.routes.js';
import botsRoutes from './bots.routes.js';
import usageRoutes from './usage.routes.js';
import supportRoutes from './support.routes.js';
import financeRoutes from './finance.routes.js';
import staffRoutes from './staff.routes.js';
import templatesRoutes from './templates.routes.js';
import campaignsRoutes from './campaigns.routes.js';
import promoTokensRoutes from './promo-tokens.routes.js';
import promotionalCampaignsRoutes from './promotional-campaigns.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/overview', overviewRoutes);
router.use('/users', usersRoutes);
router.use('/bots', botsRoutes);
router.use('/usage', usageRoutes);
router.use('/support', supportRoutes);
router.use('/finance', financeRoutes);
router.use('/staff', staffRoutes);
router.use('/templates', templatesRoutes);
router.use('/campaigns', campaignsRoutes);
router.use('/promo-tokens', promoTokensRoutes);
router.use('/promotional-campaigns', promotionalCampaignsRoutes);

export default router;
