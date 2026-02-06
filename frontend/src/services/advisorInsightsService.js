/**
 * Advisor Insights Service
 * 前端服务层 - 获取AI建议
 */

import api from '../utils/api';

/**
 * 获取 Advisor Pulse 建议
 * @param {boolean} forceRefresh - 是否强制刷新缓存
 * @returns {Promise<Array>} insights
 */
export const getAdvisorPulseInsights = async (forceRefresh = false) => {
  try {
    const response = await api.get('/insights/advisor-pulse', {
      params: { refresh: forceRefresh }
    });
    
    return response.data?.data || [];
  } catch (error) {
    console.error('[AdvisorInsights] Failed to fetch insights:', error);
    // 失败时返回空数组，不影响Dashboard加载
    return [];
  }
};

/**
 * 清除缓存（手动刷新）
 */
export const clearInsightsCache = async () => {
  try {
    await api.delete('/insights/cache');
    return true;
  } catch (error) {
    console.error('[AdvisorInsights] Failed to clear cache:', error);
    return false;
  }
};

export default {
  getAdvisorPulseInsights,
  clearInsightsCache
};
