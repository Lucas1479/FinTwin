/**
 * Advisor Insights Controller
 * 
 * 轻量级控制器，提供AI建议数据
 * 缓存策略：24小时有效期
 */

import asyncHandler from 'express-async-handler';
import { generateAdvisorInsights } from '../services/advisorInsightsService.js';

// 简单的内存缓存（生产环境可以换成Redis）
const insightsCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24小时

/**
 * @desc    获取 Advisor Pulse 建议
 * @route   GET /api/insights/advisor-pulse
 * @access  Private
 */
export const getAdvisorPulse = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  const forceRefresh = req.query.refresh === 'true';

  // 检查缓存
  if (!forceRefresh && insightsCache.has(userId)) {
    const cached = insightsCache.get(userId);
    
    // 检查是否过期
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('[AdvisorInsights] Returning cached insights for user:', userId);
      return res.json({
        success: true,
        data: cached.insights,
        cached: true,
        generated_at: new Date(cached.timestamp).toISOString()
      });
    }
  }

  // 生成新的建议
  console.log('[AdvisorInsights] Generating fresh insights for user:', userId);
  const insights = await generateAdvisorInsights(req.user._id);

  // 更新缓存
  insightsCache.set(userId, {
    insights,
    timestamp: Date.now()
  });

  res.json({
    success: true,
    data: insights,
    cached: false,
    generated_at: new Date().toISOString()
  });
});

/**
 * @desc    清除缓存（手动刷新）
 * @route   DELETE /api/insights/cache
 * @access  Private
 */
export const clearInsightsCache = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  
  const hadCache = insightsCache.has(userId);
  insightsCache.delete(userId);

  res.json({
    success: true,
    message: hadCache ? 'Cache cleared' : 'No cache found',
    cleared: hadCache
  });
});

export default {
  getAdvisorPulse,
  clearInsightsCache
};
