/**
 * Advisor Insights Routes
 */

import express from 'express';
import { getAdvisorPulse, clearInsightsCache } from '../controllers/advisorInsightsController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// 获取 Advisor Pulse 建议
router.get('/advisor-pulse', protect, getAdvisorPulse);

// 清除缓存（手动刷新）
router.delete('/cache', protect, clearInsightsCache);

export default router;
