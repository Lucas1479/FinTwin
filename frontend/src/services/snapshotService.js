import api from '../utils/api';

/**
 * Get wealth snapshot history
 * @param {string} period - '1m' | '3m' | '6m' | '1y' | '3y' | '5y' | 'all'
 * @returns {Promise<{data: Array, meta: Object}>}
 */
export const getWealthHistory = async (period = '6m') => {
  const response = await api.get('/snapshots/wealth', {
    params: { period }
  });
  return response.data;
};

/**
 * Get goal progress history
 * @param {string} goalId - Goal ID
 * @param {string} period - '1m' | '3m' | '6m' | '1y' | 'all'
 * @returns {Promise<{data: Array, meta: Object}>}
 */
export const getGoalHistory = async (goalId, period = '1y') => {
  const response = await api.get(`/snapshots/goals/${goalId}`, {
    params: { period }
  });
  return response.data;
};

/**
 * Take manual wealth snapshot
 * @param {string} notes - Optional notes
 * @returns {Promise<Object>}
 */
export const takeManualWealthSnapshot = async (notes = '') => {
  const response = await api.post('/snapshots/wealth/manual', { notes });
  return response.data;
};

/**
 * Take manual goal snapshot
 * @param {string} goalId - Goal ID
 * @param {string} notes - Optional notes
 * @returns {Promise<Object>}
 */
export const takeManualGoalSnapshot = async (goalId, notes = '') => {
  const response = await api.post(`/snapshots/goals/${goalId}/manual`, { notes });
  return response.data;
};

/**
 * Get snapshot settings
 * @returns {Promise<Object>}
 */
export const getSnapshotSettings = async () => {
  const response = await api.get('/snapshots/settings');
  return response.data;
};

/**
 * Update snapshot settings
 * @param {Object} settings - Settings object
 * @returns {Promise<Object>}
 */
export const updateSnapshotSettings = async (settings) => {
  const response = await api.put('/snapshots/settings', settings);
  return response.data;
};

/**
 * Get snapshot status
 * @returns {Promise<Object>}
 */
export const getSnapshotStatus = async () => {
  const response = await api.get('/snapshots/status');
  return response.data;
};
