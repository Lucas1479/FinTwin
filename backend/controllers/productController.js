import asyncHandler from 'express-async-handler';
import Product from '../models/productModel.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

// ==========================================
// Product Controller
// Handles financial product queries and management.
// Most endpoints are public (no auth required).
// ==========================================

// @desc    Get all products with filtering, sorting and pagination
// @route   GET /api/products
// @access  Public
export const getProducts = asyncHandler(async (req, res) => {
  const {
    // Filters
    category,      // KiwiSaver | Fund | TermDeposit
    type,          // Active | Index | ETF | FixedTerm | Savings
    strategy,      // Defensive | Conservative | Balanced | Growth | Aggressive
    riskMin,       // Min risk score (1-7)
    riskMax,       // Max risk score (1-7)
    feeMax,        // Max total fee (%)
    provider,      // Provider name (partial match)
    search,        // Search in name/description
    
    // Sorting
    sortBy = 'name',           // name | fees | riskScore | returns
    sortOrder = 'asc',         // asc | desc
    
    // Pagination
    page = 1,
    limit = 50,
  } = req.query;

  // Build filter object
  const filter = { isActive: true };
  if (req.query.ids) {
    const idsArr = req.query.ids.split(',').map(i => i.trim()).filter(Boolean);
    filter._id = { $in: idsArr };
  }

  if (category) {
    filter.category = category;
  }

  if (type) {
    filter.type = type;
  }

  if (strategy) {
    filter.strategy = strategy;
  }

  if (riskMin || riskMax) {
    filter['metrics.riskScore'] = {};
    if (riskMin) filter['metrics.riskScore'].$gte = parseInt(riskMin);
    if (riskMax) filter['metrics.riskScore'].$lte = parseInt(riskMax);
  }

  if (feeMax) {
    filter['metrics.fees.total'] = { $lte: parseFloat(feeMax) };
  }

  if (provider) {
    filter.provider = { $regex: provider, $options: 'i' };
  }

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  // Build sort object
  const sortMap = {
    name: 'name',
    fees: 'metrics.fees.total',
    riskScore: 'metrics.riskScore',
    returns: 'metrics.returns.y5',
  };
  const sortField = sortMap[sortBy] || 'name';
  const sort = { [sortField]: sortOrder === 'desc' ? -1 : 1 };

  // Pagination
  const pageNum = Math.max(1, parseInt(page));
  // Allow larger limit for bulk loading (e.g. 2000 for full marketplace load)
  const limitNum = Math.min(5000, Math.max(1, parseInt(limit))); 
  const skip = (pageNum - 1) * limitNum;

  // Execute query
  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .select('-description -topHoldings') // Exclude heavy fields in list view
      .lean(),
    Product.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: products,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
});

// @desc    Get single product by ID (full details)
// @route   GET /api/products/:id
// @access  Public
export const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).lean();

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  res.json({
    success: true,
    data: product,
  });
});

// @desc    Get products by category (convenience endpoint)
// @route   GET /api/products/category/:category
// @access  Public
export const getProductsByCategory = asyncHandler(async (req, res) => {
  const { category } = req.params;
  const validCategories = ['KiwiSaver', 'Fund', 'TermDeposit'];

  if (!validCategories.includes(category)) {
    throw new BadRequestError(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
  }

  const products = await Product.find({ category, isActive: true })
    .sort({ 'metrics.fees.total': 1 })
    .select('-description -topHoldings')
    .lean();

  res.json({
    success: true,
    data: products,
    count: products.length,
  });
});

// @desc    Get products by strategy/risk level (convenience endpoint)
// @route   GET /api/products/strategy/:strategy
// @access  Public
export const getProductsByStrategy = asyncHandler(async (req, res) => {
  const { strategy } = req.params;
  const validStrategies = ['Defensive', 'Conservative', 'Balanced', 'Growth', 'Aggressive'];

  if (!validStrategies.includes(strategy)) {
    throw new BadRequestError(`Invalid strategy. Must be one of: ${validStrategies.join(', ')}`);
  }

  const products = await Product.find({ strategy, isActive: true })
    .sort({ 'metrics.fees.total': 1 })
    .select('-description -topHoldings')
    .lean();

  res.json({
    success: true,
    data: products,
    count: products.length,
  });
});

// @desc    Get product statistics (for dashboard/analytics)
// @route   GET /api/products/stats
// @access  Public
export const getProductStats = asyncHandler(async (req, res) => {
  const stats = await Product.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: null,
        totalProducts: { $sum: 1 },
        avgFee: { $avg: '$metrics.fees.total' },
        minFee: { $min: '$metrics.fees.total' },
        maxFee: { $max: '$metrics.fees.total' },
        avgRiskScore: { $avg: '$metrics.riskScore' },
      },
    },
  ]);

  const categoryStats = await Product.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        avgFee: { $avg: '$metrics.fees.total' },
      },
    },
  ]);

  const strategyStats = await Product.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$strategy',
        count: { $sum: 1 },
        avgFee: { $avg: '$metrics.fees.total' },
      },
    },
  ]);

  res.json({
    success: true,
    data: {
      overview: stats[0] || {},
      byCategory: categoryStats,
      byStrategy: strategyStats,
    },
  });
});

// @desc    Compare multiple products
// @route   POST /api/products/compare
// @access  Public
export const compareProducts = asyncHandler(async (req, res) => {
  const { productIds } = req.body;

  if (!productIds || !Array.isArray(productIds) || productIds.length < 2) {
    throw new BadRequestError('Please provide at least 2 product IDs to compare');
  }

  if (productIds.length > 5) {
    throw new BadRequestError('Cannot compare more than 5 products at once');
  }

  const products = await Product.find({ _id: { $in: productIds } })
    .select('name provider category strategy metrics allocation')
    .lean();

  if (products.length !== productIds.length) {
    throw new NotFoundError('One or more products not found');
  }

  res.json({
    success: true,
    data: products,
  });
});

// @desc    Search products (full-text search)
// @route   GET /api/products/search
// @access  Public
export const searchProducts = asyncHandler(async (req, res) => {
  const { q, limit = 20 } = req.query;

  if (!q || q.length < 2) {
    throw new BadRequestError('Search query must be at least 2 characters');
  }

  const products = await Product.find({
    isActive: true,
    $or: [
      { name: { $regex: q, $options: 'i' } },
      { provider: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
    ],
  })
    .limit(Math.min(50, parseInt(limit)))
    .select('name provider category strategy metrics.riskScore metrics.fees.total')
    .lean();

  res.json({
    success: true,
    data: products,
    count: products.length,
  });
});

// ==========================================
// Admin Endpoints (Require Auth)
// ==========================================

// @desc    Create a new product (Admin only)
// @route   POST /api/products
// @access  Private/Admin
export const createProduct = asyncHandler(async (req, res) => {
  const { name, provider, category, strategy, metrics } = req.body;

  if (!name || !provider || !category || !strategy || !metrics?.riskScore) {
    throw new BadRequestError('Missing required fields: name, provider, category, strategy, metrics.riskScore');
  }

  const product = await Product.create(req.body);

  res.status(201).json({
    success: true,
    data: product,
  });
});

// @desc    Update a product (Admin only)
// @route   PUT /api/products/:id
// @access  Private/Admin
export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { ...req.body, lastUpdated: Date.now() },
    { new: true, runValidators: true }
  );

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  res.json({
    success: true,
    data: product,
  });
});

// @desc    Delete a product (soft delete)
// @route   DELETE /api/products/:id
// @access  Private/Admin
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  res.json({
    success: true,
    message: 'Product deactivated successfully',
  });
});
