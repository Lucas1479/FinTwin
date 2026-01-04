import express from 'express';
import { protect } from '../../middleware/authMiddleware.js';
import {
  getCashFlows,
  createCashFlow,
  updateCashFlow,
  deleteCashFlow,
  getCashFlowSummary,
  getDailyProjection,
} from '../../controllers/cashFlowController.js';

const router = express.Router();

// Summary & Projection routes (place before /:id to avoid conflict)
router.get('/summary', protect, getCashFlowSummary);
router.get('/daily-projection', protect, getDailyProjection);

// CRUD routes
router.route('/')
  .get(protect, getCashFlows)
  .post(protect, createCashFlow);

router.route('/:id')
  .put(protect, updateCashFlow)
  .delete(protect, deleteCashFlow);

export default router;

