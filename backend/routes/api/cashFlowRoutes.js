import express from 'express';
import { protect } from '../../middleware/authMiddleware.js'; // Note the relative path change for middleware
import {
  getCashFlows,
  createCashFlow,
  updateCashFlow,
  deleteCashFlow
} from '../../controllers/cashFlowController.js';

const router = express.Router();

router.route('/')
  .get(protect, getCashFlows)
  .post(protect, createCashFlow);

router.route('/:id')
  .put(protect, updateCashFlow)
  .delete(protect, deleteCashFlow);

export default router;

