import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { marketplaceController } from '../controllers/marketplace.controller.js';

const router = express.Router();

/**
 * Marketplace Products Routes
 * Base path: /api/marketplace
 */

// Get product statistics
router.get('/products/stats', authMiddleware, (req, res) =>
  marketplaceController.getProductStats(req, res)
);

// List products
router.get('/products', authMiddleware, (req, res) =>
  marketplaceController.listProducts(req, res)
);

// Create product
router.post('/products', authMiddleware, (req, res) =>
  marketplaceController.createProduct(req, res)
);

// Get product by ID
router.get('/products/:id', authMiddleware, (req, res) =>
  marketplaceController.getProduct(req, res)
);

// Update product
router.patch('/products/:id', authMiddleware, (req, res) =>
  marketplaceController.updateProduct(req, res)
);

// Delete product
router.delete('/products/:id', authMiddleware, (req, res) =>
  marketplaceController.deleteProduct(req, res)
);

// Track product view (public endpoint for analytics)
router.post('/products/:id/view', (req, res) =>
  marketplaceController.trackView(req, res)
);

// Track product click (public endpoint for analytics)
router.post('/products/:id/click', (req, res) =>
  marketplaceController.trackClick(req, res)
);

export default router;
