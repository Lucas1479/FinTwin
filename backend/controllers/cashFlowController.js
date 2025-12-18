import CashFlow from '../models/cashFlowModel.js';
import asyncHandler from 'express-async-handler';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

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

export {
  getCashFlows,
  createCashFlow,
  updateCashFlow,
  deleteCashFlow
};

