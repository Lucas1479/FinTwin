import api from '../utils/api';

// ==========================================
// Cash Flow CRUD
// ==========================================

export const getCashFlows = async () => {
  const response = await api.get('/cashflow');
  return response.data;
};

export const createCashFlow = async (data) => {
  const response = await api.post('/cashflow', data);
  return response.data;
};

export const updateCashFlow = async (id, data) => {
  const response = await api.put(`/cashflow/${id}`, data);
  return response.data;
};

export const deleteCashFlow = async (id) => {
  const response = await api.delete(`/cashflow/${id}`);
  return response.data;
};

// ==========================================
// Cash Flow Summary & Projections
// ==========================================

/**
 * Get cash flow summary normalized to a specific frequency
 * @param {string} frequency - 'Weekly' | 'Monthly' | 'Yearly'
 */
export const getCashFlowSummary = async (frequency = 'Monthly') => {
  const response = await api.get('/cashflow/summary', { params: { frequency } });
  return response.data;
};

/**
 * Get daily cash flow projection
 * @param {string} date - Start date (YYYY-MM-DD), defaults to today
 * @param {number} days - Number of days to project (max 90)
 */
export const getDailyProjection = async (date, days = 30) => {
  const params = { days };
  if (date) params.date = date;
  const response = await api.get('/cashflow/daily-projection', { params });
  return response.data;
};

// ==========================================
// Cash Asset Sync (Auto-projection + Interest)
// ==========================================

/**
 * Sync cash assets based on Cash Flow rules AND interest rates
 * 
 * This function:
 * 1. Calculates net cash flow from CashFlow rules
 * 2. Calculates interest income from assets with interest_rate
 * 3. Updates asset values accordingly
 * 
 * @param {Object} options
 * @param {string} options.targetAssetId - Optional: only sync a specific cash asset
 * @param {boolean} options.includeTermDeposits - Optional: also sync term deposits (default: false)
 */
export const syncCashAssets = async (options = {}) => {
  const { targetAssetId = null, includeTermDeposits = false } = options;
  const body = {};
  
  if (targetAssetId) {
    body.target_asset_id = targetAssetId;
  }
  if (includeTermDeposits) {
    body.include_term_deposits = true;
  }
  
  const response = await api.post('/wealth/sync-cash', body);
  return response.data;
};

// ==========================================
// Passive Income Management
// ==========================================

/**
 * Create a passive income CashFlow linked to an asset
 * (e.g., interest income from a savings account)
 * 
 * @param {Object} data
 * @param {string} data.sourceAssetId - The asset generating this income
 * @param {string} data.name - Display name (e.g., "ANZ Savings Interest")
 * @param {number} data.amount - Monthly interest amount
 * @param {string} data.frequency - 'Weekly' | 'Monthly' | 'Yearly'
 */
export const createPassiveIncome = async (data) => {
  const payload = {
    name: data.name,
    type: 'Income',
    category: 'Interest',
    amount: data.amount,
    frequency: data.frequency || 'Monthly',
    timing_mode: 'Daily_Spread', // Interest accrues daily
    is_variable: false,
    is_passive_income: true,
    source_asset_id: data.sourceAssetId,
  };
  
  const response = await api.post('/cashflow', payload);
  return response.data;
};

/**
 * Get all passive income CashFlows linked to assets
 */
export const getPassiveIncomes = async () => {
  const response = await api.get('/cashflow');
  const allFlows = response.data;
  return allFlows.filter(f => f.is_passive_income === true);
};

/**
 * Delete all passive incomes linked to a specific asset
 * (Called when asset is deleted or interest rate is removed)
 */
export const deletePassiveIncomesByAsset = async (assetId) => {
  const passiveIncomes = await getPassiveIncomes();
  const toDelete = passiveIncomes.filter(p => p.source_asset_id === assetId);
  
  for (const income of toDelete) {
    await api.delete(`/cashflow/${income._id}`);
  }
  
  return { deleted: toDelete.length };
};

