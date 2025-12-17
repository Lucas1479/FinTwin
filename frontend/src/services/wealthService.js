import api from '../utils/api';

// Get Wealth Summary (Net Worth, Liquid Capital, etc.)
export const getWealthSummary = async () => {
  const response = await api.get('/wealth/summary');
  return response.data;
};

// Get All Assets & Liabilities
// Filters: { record_type: 'Asset'|'Liability', category: string, is_liquid: boolean }
export const getAssets = async (filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  const response = await api.get(`/wealth/assets?${params}`);
  return response.data;
};

// Create New Asset/Liability
export const createAsset = async (assetData) => {
  const response = await api.post('/wealth/assets', assetData);
  return response.data;
};

// Update Asset/Liability
export const updateAsset = async (id, assetData) => {
  const response = await api.put(`/wealth/assets/${id}`, assetData);
  return response.data;
};

// Delete Asset/Liability
export const deleteAsset = async (id) => {
  const response = await api.delete(`/wealth/assets/${id}`);
  return response.data;
};

