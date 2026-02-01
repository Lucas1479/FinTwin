import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import User from '../models/userModel.js';
import FinancialAsset from '../models/financialAssetModel.js';
import CashFlow from '../models/cashFlowModel.js';
import Product from '../models/productModel.js';
import { BadRequestError, UnauthorizedError } from '../utils/errors.js';

// @desc    Register new user
// @route   POST /api/users/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    throw new BadRequestError('Please add all fields');
  }

  // Check if user exists
  const userExists = await User.findOne({ email });

  if (userExists) {
    throw new BadRequestError('User already exists', 'USER_EXISTS');
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
  });

  if (user) {
    generateToken(res, user._id);
    res.status(201).json({
      _id: user.id,
      name: user.name,
      email: user.email,
    });
  } else {
    throw new BadRequestError('Invalid user data');
  }
});

// @desc    Authenticate a user
// @route   POST /api/users/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Check for user email
  // explicitly select password because it's set to select: false in schema
  const user = await User.findOne({ email }).select('+password');

  if (user && (await user.matchPassword(password))) {
    generateToken(res, user._id);
    res.json({
      _id: user.id,
      name: user.name,
      email: user.email,
    });
  } else {
    throw new UnauthorizedError('Invalid credentials');
  }
});

// @desc    Get user data (profile summary used by frontend dashboards)
// @route   GET /api/users/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  if (!req.user?.id) {
    res.status(401);
    throw new Error('Not authorized');
  }

  const user = await User.findById(req.user.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.status(200).json({
    id: user._id,
    name: user.name,
    username: user.username,
    email: user.email,
    riskProfile: user.riskProfile,
    household: user.household,
    compliance: user.compliance,
    allocation: user.allocation,
    settings: user.settings,
    privacy: user.privacy,
    security: user.security,
    // Compatibility fields (for older frontend versions if any)
    riskTolerance: user.riskProfile?.level || 'Balanced',
    retirement_age: user.riskProfile?.retirementAge || 65,
  });
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (user) {
    user.name = req.body.name || user.name;
    user.username = req.body.username || user.username;
    user.email = req.body.email || user.email;

    // Use a deep merge approach for sub-documents to avoid overwriting defaults
    if (req.body.riskProfile) {
      user.riskProfile = { ...user.riskProfile.toObject(), ...req.body.riskProfile };
    }
    if (req.body.household) {
      user.household = { ...user.household.toObject(), ...req.body.household };
    }
    if (req.body.compliance) {
      user.compliance = { ...user.compliance.toObject(), ...req.body.compliance };
    }
    if (req.body.allocation) {
      user.allocation = { ...user.allocation.toObject(), ...req.body.allocation };
    }
    if (req.body.settings) {
      user.settings = { ...user.settings.toObject(), ...req.body.settings };
    }
    if (req.body.privacy) {
      user.privacy = { ...user.privacy.toObject(), ...req.body.privacy };
    }
    if (req.body.security) {
      user.security = { ...user.security.toObject(), ...req.body.security };
    }

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      id: updatedUser._id,
      name: updatedUser.name,
      username: updatedUser.username,
      email: updatedUser.email,
      riskProfile: updatedUser.riskProfile,
      household: updatedUser.household,
      compliance: updatedUser.compliance,
      allocation: updatedUser.allocation,
      settings: updatedUser.settings,
      privacy: updatedUser.privacy,
      security: updatedUser.security,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Logout user / clear JWT cookie
// @route   POST /api/users/logout
// @access  Public (only clears auth cookie, no auth required)
const logoutUser = asyncHandler(async (req, res) => {
  // Clear httpOnly JWT cookie
  res.cookie('jwt', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: new Date(0),
  });

  res.status(200).json({ message: 'Logged out successfully' });
});

// Generate JWT and set cookie
const generateToken = (res, userId) => {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });

  res.cookie('jwt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    sameSite: 'lax', // Lax is better for general navigation and development than Strict
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
};

// @desc    Update user password
// @route   PUT /api/users/password
// @access  Private
const updateUserPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new BadRequestError('Please provide both current and new passwords');
  }

  const user = await User.findById(req.user.id).select('+password');

  if (user && (await user.matchPassword(currentPassword))) {
    user.password = newPassword;
    await user.save();
    res.status(200).json({ message: 'Password updated successfully' });
  } else {
    throw new UnauthorizedError('Invalid current password');
  }
});

// @desc    Reset user data with demo seed data (Assets + Cash Flows)
// @route   POST /api/users/reset-demo-data
// @access  Private
const resetDemoData = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // 1. Clear existing financial data
  await FinancialAsset.deleteMany({ user_id: userId });
  await CashFlow.deleteMany({ user_id: userId });

  // 2. Find Products to link (KiwiSaver & Fund)
  const kiwiSaverProduct = await Product.findOne({ category: 'KiwiSaver', strategy: 'Growth' });
  let fundProduct = await Product.findOne({ category: 'ManagedFund', strategy: 'Balanced' });
  if (!fundProduct) {
    fundProduct = await Product.findOne({ category: 'Fund', strategy: 'Balanced' });
  }

  // 3. Seed Financial Assets (from seedWealthData.js)
  const assets = [
    {
      user_id: userId,
      name: 'Everyday Account',
      record_type: 'Asset',
      category: 'Cash_Bank',
      value: 50000.00,
      currency: 'NZD',
      is_liquid: true,
      asset_details: { bank_name: 'ANZ', account_suffix: '00', interest_rate: 0.1 }
    },
    {
      user_id: userId,
      name: 'High Interest Savings',
      record_type: 'Asset',
      category: 'Cash_Bank',
      value: 200000.00,
      currency: 'NZD',
      is_liquid: true,
      asset_details: { bank_name: 'Rabobank', account_suffix: '50', interest_rate: 4.5 }
    },
    {
      user_id: userId,
      name: 'Family Home',
      record_type: 'Asset',
      category: 'Property',
      value: 1250000.00,
      currency: 'NZD',
      is_liquid: false,
      asset_details: {
        address: '123 Queen Street, Auckland',
        property_type: 'Owner_Occupied',
        purchase_price: 950000,
        purchase_year: 2018,
        has_mortgage: true
      }
    },
    {
      user_id: userId,
      name: 'Home Loan',
      record_type: 'Liability',
      category: 'Mortgage',
      value: 780000.00,
      currency: 'NZD',
      is_liquid: false,
      asset_details: {
        lender: 'ANZ',
        interest_rate: 6.85,
        fixed_until: new Date('2025-12-31')
      }
    },
    {
      user_id: userId,
      name: 'KiwiSaver Growth Fund',
      record_type: 'Asset',
      category: 'KiwiSaver',
      value: 48500.25,
      currency: 'NZD',
      is_liquid: false,
      source_product_id: kiwiSaverProduct?._id,
      asset_details: {
        provider: kiwiSaverProduct?.provider || 'Milford',
        risk_level: kiwiSaverProduct?.riskLevel || 'Growth',
        contribution_rate: 3,
        employer_contributes: true
      }
    },
    {
      user_id: userId,
      name: 'Managed Growth Fund',
      record_type: 'Asset',
      category: 'Invest_ManagedFund',
      value: 22000.00,
      currency: 'NZD',
      is_liquid: true,
      source_product_id: fundProduct?._id,
      asset_details: {
        provider: fundProduct?.provider || 'Fisher Funds',
        fund_name: fundProduct?.name || 'Growth Fund',
        risk_level: fundProduct?.riskLevel || 'Balanced'
      }
    },
    {
      user_id: userId,
      name: 'US Tech Portfolio',
      record_type: 'Asset',
      category: 'Invest_Shares',
      value: 12500.00,
      currency: 'USD',
      is_liquid: true,
      asset_details: { platform: 'Sharesies', market: 'US', ticker: 'NVDA, AAPL', quantity: 150 }
    },
    {
      user_id: userId,
      name: 'Credit Card',
      record_type: 'Liability',
      category: 'Credit_Card',
      value: 1200.00,
      currency: 'NZD',
      is_liquid: false,
      asset_details: { issuer: 'AMEX', credit_limit: 10000, interest_rate: 19.95 }
    }
  ];

  await FinancialAsset.insertMany(assets);

  // 4. Seed Cash Flows (from seedCashFlow.js - more detailed version)
  const cashFlows = [
    // Income
    {
      user_id: userId,
      name: 'Senior Dev Salary',
      amount: 8500,
      type: 'Income',
      category: 'Salary',
      frequency: 'Monthly',
      timing_mode: 'Specific_Date',
      anchor_date: 15,
      is_variable: false,
    },
    {
      user_id: userId,
      name: 'Tech Blog Revenue',
      amount: 450,
      type: 'Income',
      category: 'Side Hustle',
      frequency: 'Monthly',
      timing_mode: 'Specific_Date',
      anchor_date: 20,
      is_variable: true,
    },
    {
      user_id: userId,
      name: 'Dividends (US Stocks)',
      amount: 120,
      type: 'Income',
      category: 'Investment',
      frequency: 'Monthly',
      timing_mode: 'Daily_Spread',
      anchor_date: 1,
      is_variable: true,
    },
    // Expenses (Fixed)
    {
      user_id: userId,
      name: 'Rent - City Apt',
      amount: 650,
      type: 'Expense',
      category: 'Housing',
      frequency: 'Weekly',
      timing_mode: 'Specific_Date',
      anchor_date: 2,
      is_variable: false,
    },
    {
      user_id: userId,
      name: 'Power & Internet',
      amount: 220,
      type: 'Expense',
      category: 'Utilities',
      frequency: 'Monthly',
      timing_mode: 'Specific_Date',
      anchor_date: 25,
      is_variable: true,
    },
    {
      user_id: userId,
      name: 'Car Insurance',
      amount: 85,
      type: 'Expense',
      category: 'Insurance',
      frequency: 'Monthly',
      timing_mode: 'Specific_Date',
      anchor_date: 1,
      is_variable: false,
    },
    // Expenses (Variable - Daily Spread)
    {
      user_id: userId,
      name: 'Groceries Budget',
      amount: 800,
      type: 'Expense',
      category: 'Living',
      frequency: 'Monthly',
      timing_mode: 'Daily_Spread',
      is_variable: true,
    },
    {
      user_id: userId,
      name: 'Transport / Fuel',
      amount: 300,
      type: 'Expense',
      category: 'Transport',
      frequency: 'Monthly',
      timing_mode: 'Daily_Spread',
      is_variable: true,
    },
    {
      user_id: userId,
      name: 'Dining Out',
      amount: 400,
      type: 'Expense',
      category: 'Entertainment',
      frequency: 'Monthly',
      timing_mode: 'Daily_Spread',
      is_variable: true,
    },
    // Subscriptions
    {
      user_id: userId,
      name: 'Netflix Premium',
      amount: 24.99,
      type: 'Subscription',
      category: 'Entertainment',
      frequency: 'Monthly',
      timing_mode: 'Specific_Date',
      anchor_date: 5,
    },
    {
      user_id: userId,
      name: 'Spotify Duo',
      amount: 19.99,
      type: 'Subscription',
      category: 'Entertainment',
      frequency: 'Monthly',
      timing_mode: 'Specific_Date',
      anchor_date: 2,
    },
    {
      user_id: userId,
      name: 'ChatGPT Plus',
      amount: 35.00,
      type: 'Subscription',
      category: 'Productivity',
      frequency: 'Monthly',
      timing_mode: 'Specific_Date',
      anchor_date: 28,
    },
    {
      user_id: userId,
      name: 'Gym Membership',
      amount: 60.00,
      type: 'Subscription',
      category: 'Health',
      frequency: 'Fortnightly',
      timing_mode: 'Specific_Date',
      start_date: new Date(),
    },
    {
      user_id: userId,
      name: 'AWS Bill',
      amount: 45.50,
      type: 'Subscription',
      category: 'Tech',
      frequency: 'Monthly',
      timing_mode: 'Specific_Date',
      anchor_date: 10,
      is_variable: true,
    }
  ];

  await CashFlow.insertMany(cashFlows);

  res.status(200).json({
    success: true,
    message: 'Demo data loaded successfully',
    stats: {
      assets: assets.length,
      cashFlows: cashFlows.length
    }
  });
});

export {
  registerUser,
  loginUser,
  getMe,
  logoutUser,
  updateUserProfile,
  updateUserPassword,
  resetDemoData,
};