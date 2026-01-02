import api from '../utils/api';
import PROFILE_FALLBACK from '../data/profileFallback';

// If the backend `/products` endpoint is unavailable, fall back to an empty list.
// (A static dataset can be added under `src/data/` later if needed.)
const fallbackProducts = [];

const cloneRecords = (records = []) => records.map((item) => ({ ...item }));

const normalizeProductsPayload = (payload) => {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  if (Array.isArray(payload.products)) {
    return payload.products;
  }

  return [];
};

const mergeRecords = (sourceRecords = [], fallbackRecords = []) => {
  if (Array.isArray(sourceRecords) && sourceRecords.length) {
    return cloneRecords(sourceRecords);
  }
  return cloneRecords(fallbackRecords);
};

export const buildProfile = (payload = {}) => ({
  ...PROFILE_FALLBACK,
  ...payload,
  assets: mergeRecords(payload.assets, PROFILE_FALLBACK.assets),
  liabilities: mergeRecords(payload.liabilities, PROFILE_FALLBACK.liabilities),
  goals: mergeRecords(payload.goals, PROFILE_FALLBACK.goals),
  liquidity: {
    ...PROFILE_FALLBACK.liquidity,
    ...(payload.liquidity || {}),
  },
  kiwisaver: {
    ...PROFILE_FALLBACK.kiwisaver,
    ...(payload.kiwisaver || {}),
  },
  monthlyContribution:
    typeof payload.monthlyContribution === 'number'
      ? payload.monthlyContribution
      : PROFILE_FALLBACK.monthlyContribution,
  monthlyIncome:
    typeof payload.monthlyIncome === 'number'
      ? payload.monthlyIncome
      : PROFILE_FALLBACK.monthlyIncome,
  monthlyExpenses:
    typeof payload.monthlyExpenses === 'number'
      ? payload.monthlyExpenses
      : PROFILE_FALLBACK.monthlyExpenses,
  aiInsight: payload.aiInsight || PROFILE_FALLBACK.aiInsight,
  gapInsights:
    Array.isArray(payload.gapInsights) && payload.gapInsights.length
      ? payload.gapInsights.slice()
      : PROFILE_FALLBACK.gapInsights.slice(),
});

export const fetchProducts = async () => {
  try {
    const response = await api.get('/products');
    const products = normalizeProductsPayload(response?.data);
    if (products.length > 0) {
      return products;
    }
  } catch (error) {
    console.warn('[services/api] fetchProducts failed, falling back to static data', error);
  }

  return fallbackProducts;
};

export const fetchCurrentUserProfile = async () => {
  try {
    const { data } = await api.get('/users/me');
    const userData = data?.data || data || {};
    return buildProfile(userData);
  } catch (error) {
    console.warn(
      '[services/api] fetchCurrentUserProfile failed, returning fallback profile',
      error
    );
    return buildProfile();
  }
};

