import CashFlow from '../models/cashFlowModel.js';
import asyncHandler from 'express-async-handler';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

// ==========================================
// Frequency Conversion Constants
// ==========================================
const TO_ANNUAL = {
  'Weekly': 52,
  'Fortnightly': 26,
  'Monthly': 12,
  'Yearly': 1,
  'One-Off': 0,
};

// ==========================================
// Helper: Convert amount to annual value
// ==========================================
const toAnnual = (amount, frequency) => {
  return amount * (TO_ANNUAL[frequency] || 0);
};

// ==========================================
// Helper: Calculate daily flow for a specific date
// This is the core logic for calibration
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
      // Continuous flow: spread evenly across all days
      const annualAmount = toAnnual(flow.amount, flow.frequency);
      amount = annualAmount / 365;
      isHit = true;
    } else if (flow.timing_mode === 'Specific_Date') {
      // Discrete event: only hits on specific days
      if (flow.frequency === 'Monthly' && flow.anchor_date === dayOfMonth) {
        amount = flow.amount;
        isHit = true;
      } else if (flow.frequency === 'Weekly' && flow.anchor_date === dayOfWeek) {
        amount = flow.amount;
        isHit = true;
      } else if (flow.frequency === 'Yearly') {
        // For yearly, check if anchor_date matches day of year (simplified: just month day)
        if (flow.anchor_date === dayOfMonth) {
          amount = flow.amount;
          isHit = true;
        }
      }
      // Fortnightly requires start_date logic (simplified for now)
    }

    if (isHit) {
      if (flow.type === 'Income') {
        dailyIncome += amount;
      } else {
        dailyExpense += amount;
      }
    }
  });

  return {
    income: dailyIncome,
    expense: dailyExpense,
    netFlow: dailyIncome - dailyExpense,
  };
};

// @desc    Get all cash flow items (Incomes, Expenses, Subs)
// @route   GET /api/cashflow
// @access  Private
const getCashFlows = asyncHandler(async (req, res) => {
  const flows = await CashFlow.find({ user_id: req.user._id });
  res.status(200).json(flows);
});

// @desc    Add a new cash flow item
// @route   POST /api/cashflow
// @access  Private
const createCashFlow = asyncHandler(async (req, res) => {
  if (!req.body.name || !req.body.amount || !req.body.type) {
    throw new BadRequestError('Please include name, amount and type');
  }

  const cashFlow = await CashFlow.create({
    user_id: req.user._id,
    ...req.body
  });

  res.status(201).json(cashFlow);
});

// @desc    Update item
// @route   PUT /api/cashflow/:id
// @access  Private
const updateCashFlow = asyncHandler(async (req, res) => {
  const cashFlow = await CashFlow.findById(req.params.id);

  if (!cashFlow) {
    throw new NotFoundError('Item not found');
  }

  if (cashFlow.user_id.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('User not authorized');
  }

  const updatedCashFlow = await CashFlow.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );

  res.status(200).json(updatedCashFlow);
});

// @desc    Delete item
// @route   DELETE /api/cashflow/:id
// @access  Private
const deleteCashFlow = asyncHandler(async (req, res) => {
  const cashFlow = await CashFlow.findById(req.params.id);

  if (!cashFlow) {
    throw new NotFoundError('Item not found');
  }

  if (cashFlow.user_id.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('User not authorized');
  }

  await cashFlow.deleteOne();

  res.status(200).json({ id: req.params.id });
});

// @desc    Get cash flow summary (normalized to different frequencies)
// @route   GET /api/cashflow/summary
// @access  Private
// @query   frequency: 'Weekly' | 'Monthly' | 'Yearly' (default: 'Monthly')
const getCashFlowSummary = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const targetFrequency = req.query.frequency || 'Monthly';

  const flows = await CashFlow.find({ user_id: userId }).lean();

  // Separate by type
  const incomes = flows.filter((f) => f.type === 'Income');
  const expenses = flows.filter((f) => f.type === 'Expense');
  const subscriptions = flows.filter((f) => f.type === 'Subscription');

  // Calculate totals (normalized to target frequency)
  const fromAnnual = (annualAmount) => {
    const divider = TO_ANNUAL[targetFrequency] || 12;
    return divider === 0 ? 0 : annualAmount / divider;
  };

  const totalIncome = incomes.reduce((sum, f) => sum + fromAnnual(toAnnual(f.amount, f.frequency)), 0);
  const totalExpenses = expenses.reduce((sum, f) => sum + fromAnnual(toAnnual(f.amount, f.frequency)), 0);
  const totalSubscriptions = subscriptions.reduce((sum, f) => sum + fromAnnual(toAnnual(f.amount, f.frequency)), 0);

  const totalOutflow = totalExpenses + totalSubscriptions;
  const netFlow = totalIncome - totalOutflow;
  const savingsRate = totalIncome > 0 ? (netFlow / totalIncome) * 100 : 0;

  // Confidence based on variable items
  const variableCount = flows.filter((f) => f.is_variable).length;
  const confidence = variableCount > flows.length / 2 ? 'low' : variableCount > 2 ? 'medium' : 'high';

  res.json({
    frequency: targetFrequency,
    income: {
      total: Math.round(totalIncome * 100) / 100,
      count: incomes.length,
    },
    expenses: {
      total: Math.round(totalExpenses * 100) / 100,
      count: expenses.length,
    },
    subscriptions: {
      total: Math.round(totalSubscriptions * 100) / 100,
      count: subscriptions.length,
    },
    outflow: Math.round(totalOutflow * 100) / 100,
    netFlow: Math.round(netFlow * 100) / 100,
    savingsRate: Math.round(savingsRate * 10) / 10,
    confidence,
  });
});

// @desc    Calculate theoretical daily flow for calibration
// @route   GET /api/cashflow/daily-projection
// @access  Private
// @query   date: 'YYYY-MM-DD' (default: today)
//          days: number of days to project (default: 1)
const getDailyProjection = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const flows = await CashFlow.find({ user_id: userId }).lean();

  // Parse date or use today
  const startDateStr = req.query.date;
  const startDate = startDateStr ? new Date(startDateStr) : new Date();
  startDate.setHours(0, 0, 0, 0);

  const daysToProject = parseInt(req.query.days, 10) || 1;
  const maxDays = 90; // Cap at 90 days for performance
  const actualDays = Math.min(daysToProject, maxDays);

  const projections = [];
  let cumulativeFlow = 0;

  for (let i = 0; i < actualDays; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);

    const daily = calculateDailyFlow(flows, currentDate);
    cumulativeFlow += daily.netFlow;

    projections.push({
      date: currentDate.toISOString().split('T')[0],
      dayOfWeek: currentDate.getDay() || 7,
      income: Math.round(daily.income * 100) / 100,
      expense: Math.round(daily.expense * 100) / 100,
      netFlow: Math.round(daily.netFlow * 100) / 100,
      cumulativeFlow: Math.round(cumulativeFlow * 100) / 100,
    });
  }

  // Summary for the period
  const totalIncome = projections.reduce((sum, p) => sum + p.income, 0);
  const totalExpense = projections.reduce((sum, p) => sum + p.expense, 0);

  res.json({
    startDate: startDate.toISOString().split('T')[0],
    days: actualDays,
    projections,
    periodSummary: {
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpense: Math.round(totalExpense * 100) / 100,
      netFlow: Math.round((totalIncome - totalExpense) * 100) / 100,
    },
  });
});

export {
  getCashFlows,
  createCashFlow,
  updateCashFlow,
  deleteCashFlow,
  getCashFlowSummary,
  getDailyProjection,
};

