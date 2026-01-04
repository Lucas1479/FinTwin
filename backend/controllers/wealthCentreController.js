import asyncHandler from 'express-async-handler';
import FinancialAsset from '../models/financialAssetModel.js';
import CashFlow from '../models/cashFlowModel.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

// ==========================================
// Helper: Frequency Conversion
// ==========================================
const TO_ANNUAL = {
  'Weekly': 52,
  'Fortnightly': 26,
  'Monthly': 12,
  'Yearly': 1,
  'One-Off': 0,
};

const toAnnual = (amount, frequency) => amount * (TO_ANNUAL[frequency] || 0);

// ==========================================
// Helper: Calculate daily flow for a specific date
// ==========================================
const calculateDailyFlow = (flows, targetDate) => {
  const dayOfMonth = targetDate.getDate();
  const dayOfWeek = targetDate.getDay() || 7; // 1-7 (Mon=1, Sun=7)

  let dailyIncome = 0;
  let dailyExpense = 0;

  flows.forEach((flow) => {
    let amount = 0;
    let isHit = false;

    if (flow.timing_mode === 'Daily_Spread') {
      const annualAmount = toAnnual(flow.amount, flow.frequency);
      amount = annualAmount / 365;
      isHit = true;
    } else if (flow.timing_mode === 'Specific_Date') {
      if (flow.frequency === 'Monthly' && flow.anchor_date === dayOfMonth) {
        amount = flow.amount;
        isHit = true;
      } else if (flow.frequency === 'Weekly' && flow.anchor_date === dayOfWeek) {
        amount = flow.amount;
        isHit = true;
      }
    }

    if (isHit) {
      if (flow.type === 'Income') {
        dailyIncome += amount;
      } else {
        dailyExpense += amount;
      }
    }
  });

  return { income: dailyIncome, expense: dailyExpense, netFlow: dailyIncome - dailyExpense };
};

// ==========================================
// Helper: Calculate total flow between two dates
// ==========================================
const calculateFlowBetweenDates = (flows, startDate, endDate) => {
  let totalFlow = 0;
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    const daily = calculateDailyFlow(flows, current);
    totalFlow += daily.netFlow;
    current.setDate(current.getDate() + 1);
  }

  return totalFlow;
};

// ==========================================
// Wealth Centre Controller
// Handles Assets & Liabilities CRUD and Summary calculations.
// ==========================================

// @desc    Get all assets/liabilities for current user
// @route   GET /api/wealth/assets
// @access  Private
export const getAllAssets = asyncHandler(async (req, res) => {
  const filter = { user_id: req.user._id };

  // Optional filters from query params
  if (req.query.record_type) {
    filter.record_type = req.query.record_type; // 'Asset' or 'Liability'
  }
  if (req.query.category) {
    filter.category = req.query.category;
  }
  if (req.query.is_liquid !== undefined) {
    filter.is_liquid = req.query.is_liquid === 'true';
  }

  const assets = await FinancialAsset.find(filter)
    .sort({ record_type: 1, category: 1, created_at: -1 })
    .lean();

  res.json(assets);
});

// @desc    Get a single asset by id
// @route   GET /api/wealth/assets/:id
// @access  Private
export const getAssetById = asyncHandler(async (req, res) => {
  const asset = await FinancialAsset.findOne({
    _id: req.params.id,
    user_id: req.user._id,
  }).lean();

  if (!asset) {
    throw new NotFoundError('Asset not found');
  }

  res.json(asset);
});

// @desc    Create a new asset or liability
// @route   POST /api/wealth/assets
// @access  Private
export const createAsset = asyncHandler(async (req, res) => {
  const { name, record_type, category, value, currency, is_liquid, asset_details, source_product_id } = req.body;

  // Validation
  if (!name || !record_type || !category || value === undefined) {
    throw new BadRequestError('Missing required fields: name, record_type, category, value');
  }

  if (!['Asset', 'Liability'].includes(record_type)) {
    throw new BadRequestError('record_type must be "Asset" or "Liability"');
  }

  const asset = await FinancialAsset.create({
    user_id: req.user._id,
    name,
    record_type,
    category,
    value,
    currency: currency || 'NZD',
    is_liquid: is_liquid ?? false,
    asset_details: asset_details || {},
    source_product_id,
  });

  res.status(201).json(asset);
});

// @desc    Update an asset or liability
// @route   PUT /api/wealth/assets/:id
// @access  Private
export const updateAsset = asyncHandler(async (req, res) => {
  const asset = await FinancialAsset.findOne({
    _id: req.params.id,
    user_id: req.user._id,
  });

  if (!asset) {
    throw new NotFoundError('Asset not found');
  }

  // Allowed fields to update
  const allowedFields = ['name', 'category', 'value', 'currency', 'is_liquid', 'asset_details', 'source_product_id'];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      asset[field] = req.body[field];
    }
  });

  // Note: record_type should not be changed after creation (Asset stays Asset, Liability stays Liability)

  await asset.save();

  res.json(asset);
});

// @desc    Delete an asset or liability
// @route   DELETE /api/wealth/assets/:id
// @access  Private
export const deleteAsset = asyncHandler(async (req, res) => {
  const asset = await FinancialAsset.findOneAndDelete({
    _id: req.params.id,
    user_id: req.user._id,
  });

  if (!asset) {
    throw new NotFoundError('Asset not found');
  }

  res.status(200).json({ message: 'Asset removed successfully' });
});

// @desc    Get wealth summary (Net Worth, Liquid Capital)
// @route   GET /api/wealth/summary
// @access  Private
export const getSummary = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Aggregate all assets and liabilities
  const assets = await FinancialAsset.find({ user_id: userId }).lean();

  let totalAssets = 0;
  let totalLiabilities = 0;
  let liquidCapital = 0;

  assets.forEach((item) => {
    if (item.record_type === 'Asset') {
      totalAssets += item.value;
      if (item.is_liquid) {
        liquidCapital += item.value;
      }
    } else if (item.record_type === 'Liability') {
      totalLiabilities += item.value;
    }
  });

  const netWorth = totalAssets - totalLiabilities;

  res.json({
    netWorth,
    liquidCapital,
    totalAssets,
    totalLiabilities,
    assetCount: assets.filter((a) => a.record_type === 'Asset').length,
    liabilityCount: assets.filter((a) => a.record_type === 'Liability').length,
  });
});

// @desc    Get upcoming maturity reminders (Term Deposits, Fixed Mortgages)
// @route   GET /api/wealth/reminders
// @access  Private
// @query   days: number of days to look ahead (default: 30)
export const getMaturityReminders = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const daysAhead = parseInt(req.query.days, 10) || 30;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + daysAhead);

  // 1. Get Term Deposits with upcoming maturity
  const termDeposits = await FinancialAsset.find({
    user_id: userId,
    category: 'Cash_TermDeposit',
    'asset_details.maturity_date': {
      $gte: today,
      $lte: futureDate,
    },
  }).lean();

  // 2. Get Fixed Mortgages with upcoming refix dates
  const mortgages = await FinancialAsset.find({
    user_id: userId,
    category: 'Mortgage',
    'asset_details.rate_type': 'Fixed',
    'asset_details.fixed_until': {
      $gte: today,
      $lte: futureDate,
    },
  }).lean();

  // 3. Format reminders
  const reminders = [];

  termDeposits.forEach((td) => {
    const maturityDate = new Date(td.asset_details.maturity_date);
    const daysUntil = Math.ceil((maturityDate - today) / (1000 * 60 * 60 * 24));
    
    reminders.push({
      type: 'term_deposit_maturity',
      assetId: td._id,
      assetName: td.name,
      category: td.category,
      value: td.value,
      interestRate: td.asset_details.interest_rate,
      eventDate: maturityDate.toISOString().split('T')[0],
      daysUntil,
      autoRollover: td.asset_details.auto_rollover || false,
      message: daysUntil === 0 
        ? `Your term deposit "${td.name}" matures today!`
        : `Your term deposit "${td.name}" matures in ${daysUntil} day${daysUntil > 1 ? 's' : ''}.`,
      actionRequired: !td.asset_details.auto_rollover,
      priority: daysUntil <= 7 ? 'high' : daysUntil <= 14 ? 'medium' : 'low',
    });
  });

  mortgages.forEach((m) => {
    const refixDate = new Date(m.asset_details.fixed_until);
    const daysUntil = Math.ceil((refixDate - today) / (1000 * 60 * 60 * 24));
    
    reminders.push({
      type: 'mortgage_refix',
      assetId: m._id,
      assetName: m.name,
      category: m.category,
      value: m.value,
      interestRate: m.asset_details.interest_rate,
      eventDate: refixDate.toISOString().split('T')[0],
      daysUntil,
      message: daysUntil === 0 
        ? `Your mortgage "${m.name}" fixed rate ends today!`
        : `Your mortgage "${m.name}" fixed rate ends in ${daysUntil} day${daysUntil > 1 ? 's' : ''}.`,
      actionRequired: true,
      priority: daysUntil <= 7 ? 'high' : daysUntil <= 14 ? 'medium' : 'low',
    });
  });

  // Sort by days until (most urgent first)
  reminders.sort((a, b) => a.daysUntil - b.daysUntil);

  res.json({
    count: reminders.length,
    daysAhead,
    reminders,
  });
});

// @desc    Get available funds for goal planning (used by Goal Engine)
// @route   GET /api/wealth/available-funds
// @access  Private
// @query   goalType: 'short_term' | 'long_term' (optional, defaults to short_term)
export const getAvailableFunds = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const goalType = req.query.goalType || 'short_term';

  const assets = await FinancialAsset.find({
    user_id: userId,
    record_type: 'Asset',
  }).lean();

  let availableFunds = 0;

  if (goalType === 'long_term') {
    // Long Term Goals (Retirement): Total Net Worth (all assets)
    // AI assumes illiquid assets can be liquidated over 20+ years
    const liabilities = await FinancialAsset.find({
      user_id: userId,
      record_type: 'Liability',
    }).lean();

    const totalAssets = assets.reduce((sum, a) => sum + a.value, 0);
    const totalLiabilities = liabilities.reduce((sum, l) => sum + l.value, 0);
    availableFunds = totalAssets - totalLiabilities;
  } else {
    // Short/Medium Term Goals: Only liquid assets (Cash, Term Deposits, Stocks)
    // Family Home is EXCLUDED
    availableFunds = assets
      .filter((a) => a.is_liquid)
      .reduce((sum, a) => sum + a.value, 0);
  }

  res.json({
    availableFunds,
    goalType,
  });
});

// ==========================================
// Helper: Calculate daily interest for an asset
// ==========================================
const calculateDailyInterest = (asset) => {
  const details = asset.asset_details || {};
  const interestRate = details.interest_rate;
  
  // No interest rate defined
  if (!interestRate || interestRate <= 0) {
    return 0;
  }
  
  // Daily interest = (Principal * Annual Rate) / 365
  // e.g., $10,000 at 4.5% p.a. = $10,000 * 0.045 / 365 = $1.23/day
  const dailyRate = interestRate / 100 / 365;
  return asset.value * dailyRate;
};

// @desc    Sync cash assets based on Cash Flow rules AND asset interest rates
// @route   POST /api/wealth/sync-cash
// @access  Private
// @body    target_asset_id: (optional) sync only a specific asset
//          include_term_deposits: (optional) also sync term deposits (default: false)
//
// This function:
// 1. Calculates net cash flow from CashFlow rules
// 2. Calculates interest income from assets with interest_rate
// 3. Updates asset values accordingly
export const syncCashAssets = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { target_asset_id, include_term_deposits = false } = req.body;

  // 1. Determine which asset categories to sync
  const categories = ['Cash_Bank', 'Cash_Physical'];
  if (include_term_deposits) {
    categories.push('Cash_TermDeposit');
  }

  const filter = {
    user_id: userId,
    record_type: 'Asset',
    category: { $in: categories },
  };

  if (target_asset_id) {
    filter._id = target_asset_id;
  }

  const cashAssets = await FinancialAsset.find(filter);

  if (cashAssets.length === 0) {
    throw new NotFoundError('No cash assets found to sync');
  }

  // 2. Get Cash Flow rules (exclude passive income linked to assets - they'll be calculated directly)
  const flows = await CashFlow.find({ 
    user_id: userId,
    is_passive_income: { $ne: true } // Exclude auto-generated passive income
  }).lean();

  // 3. Calculate and update each asset
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const results = [];
  let totalCashFlowApplied = 0;
  let totalInterestEarned = 0;

  for (const asset of cashAssets) {
    const lastUpdate = new Date(asset.updated_at);
    lastUpdate.setHours(0, 0, 0, 0);

    // Calculate days since last update
    const daysDiff = Math.floor((today - lastUpdate) / (1000 * 60 * 60 * 24));

    if (daysDiff <= 0) {
      results.push({
        assetId: asset._id,
        name: asset.name,
        category: asset.category,
        previousValue: asset.value,
        newValue: asset.value,
        cashFlowApplied: 0,
        interestEarned: 0,
        daysSynced: 0,
        message: 'Already up to date',
      });
      continue;
    }

    // === Calculate Cash Flow for the period ===
    // Only apply cash flow to liquid accounts (not term deposits)
    let cashFlowForPeriod = 0;
    if (asset.category !== 'Cash_TermDeposit' && flows.length > 0) {
      cashFlowForPeriod = calculateFlowBetweenDates(flows, lastUpdate, today);
    }

    // === Calculate Interest for the period ===
    // Interest compounds daily on the previous day's balance
    let interestForPeriod = 0;
    const dailyInterest = calculateDailyInterest(asset);
    if (dailyInterest > 0) {
      // Simple interest for the period (compound interest would require daily iteration)
      interestForPeriod = dailyInterest * daysDiff;
    }

    // === Update asset value ===
    const previousValue = asset.value;
    const totalChange = cashFlowForPeriod + interestForPeriod;
    asset.value = Math.max(0, asset.value + totalChange);
    await asset.save();

    totalCashFlowApplied += cashFlowForPeriod;
    totalInterestEarned += interestForPeriod;

    results.push({
      assetId: asset._id,
      name: asset.name,
      category: asset.category,
      previousValue: Math.round(previousValue * 100) / 100,
      newValue: Math.round(asset.value * 100) / 100,
      cashFlowApplied: Math.round(cashFlowForPeriod * 100) / 100,
      interestEarned: Math.round(interestForPeriod * 100) / 100,
      interestRate: asset.asset_details?.interest_rate || 0,
      daysSynced: daysDiff,
      message: totalChange >= 0 ? 'Balance increased' : 'Balance decreased',
    });
  }

  // 4. Return detailed summary
  res.json({
    message: 'Cash assets synced successfully',
    syncDate: today.toISOString().split('T')[0],
    assetsUpdated: results.length,
    summary: {
      totalCashFlowApplied: Math.round(totalCashFlowApplied * 100) / 100,
      totalInterestEarned: Math.round(totalInterestEarned * 100) / 100,
      totalNetChange: Math.round((totalCashFlowApplied + totalInterestEarned) * 100) / 100,
    },
    details: results,
  });
});