import { Router } from 'express';
import supportRoutes from './support.routes.js';
import financeRoutes from './finance.routes.js';
import campaignsRoutes from './campaigns.routes.js';

const router = Router();

/**
 * User Routes Aggregator
 *
 * Mounts all user sub-routes:
 * - /user/support - Support ticket creation and management
 * - /user/finance - Subscription and payment information
 * - /user/campaigns - Promotional campaigns and downloads
 */

router.use('/support', supportRoutes);
router.use('/finance', financeRoutes);
router.use('/campaigns', campaignsRoutes);

export default router;
