import asyncHandler from 'express-async-handler';
import FinancialAsset from '../models/financialAssetModel.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

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