import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { suggestionsController } from '../controllers/suggestions.controller.js';

const router = express.Router();

/**
 * Suggestions Routes
 * Base path: /api/suggestions
 */

// Get suggestion statistics
router.get('/stats', authMiddleware, (req, res) =>
  suggestionsController.getSuggestionStats(req, res)
);

// Get user preferences
router.get('/preferences', authMiddleware, (req, res) =>
  suggestionsController.getPreferences(req, res)
);

// Update user preferences
router.patch('/preferences', authMiddleware, (req, res) =>
  suggestionsController.updatePreferences(req, res)
);

// Generate suggestions
router.post('/generate', authMiddleware, (req, res) =>
  suggestionsController.generateSuggestions(req, res)
);

// Get suggestion history
router.get('/', authMiddleware, (req, res) =>
  suggestionsController.getSuggestions(req, res)
);

// Record user action on suggestion
router.post('/:id/action', authMiddleware, (req, res) =>
  suggestionsController.recordAction(req, res)
);

export default router;
