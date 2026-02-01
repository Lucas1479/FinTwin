import asyncHandler from 'express-async-handler';
import snapshotService from '../services/snapshotService.js';
import User from '../models/userModel.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

/**
 * ============================================================
 * Snapshot Controller - API Handlers
 * ============================================================
 * Handles HTTP requests for snapshot operations
 * ============================================================
 */

// @desc    Get wealth snapshot history
// @route   GET /api/snapshots/wealth
// @access  Private
// @query   period: '1m' | '3m' | '6m' | '1y' | '3y' | '5y' | 'all' (default: '6m')
export const getWealthHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const period = req.query.period || '6m';

  const validPeriods = ['1m', '3m', '6m', '1y', '3y', '5y', 'all'];
  if (!validPeriods.includes(period)) {
    throw new BadRequestError(`Invalid period. Must be one of: ${validPeriods.join(', ')}`);
  }

  const history = await snapshotService.getWealthHistory(userId, period);

  res.json({
    data: history,
    meta: {
      period,
      count: history.length,
      oldest: history.length > 0 ? history[0].date : null,
      newest: history.length > 0 ? history[history.length - 1].date : null
    }
  });
});

// @desc    Get goal progress history
// @route   GET /api/snapshots/goals/:goalId
// @access  Private
// @query   period: '1m' | '3m' | '6m' | '1y' | 'all' (default: '1y')
export const getGoalHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const goalId = req.params.goalId;
  const period = req.query.period || '1y';

  const validPeriods = ['1m', '3m', '6m', '1y', 'all'];
  if (!validPeriods.includes(period)) {
    throw new BadRequestError(`Invalid period. Must be one of: ${validPeriods.join(', ')}`);
  }

  const history = await snapshotService.getGoalHistory(userId, goalId, period);

  res.json({
    data: history,
    meta: {
      goalId,
      period,
      count: history.length,
      oldest: history.length > 0 ? history[0].date : null,
      newest: history.length > 0 ? history[history.length - 1].date : null
    }
  });
});

// @desc    Manually trigger a wealth snapshot
// @route   POST /api/snapshots/wealth/manual
// @access  Private
// @body    notes: Optional user notes
export const takeManualWealthSnapshot = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { notes } = req.body;

  const snapshot = await snapshotService.takeWealthSnapshot(userId, 'manual', { notes });

  res.status(201).json({
    message: 'Wealth snapshot created successfully',
    snapshot: snapshot.formatForChart()
  });
});

// @desc    Manually trigger a goal snapshot
// @route   POST /api/snapshots/goals/:goalId/manual
// @access  Private
// @body    notes: Optional user notes
export const takeManualGoalSnapshot = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const goalId = req.params.goalId;
  const { notes } = req.body;

  const snapshot = await snapshotService.takeGoalSnapshot(userId, goalId, 'manual', { notes });

  res.status(201).json({
    message: 'Goal snapshot created successfully',
    snapshot: snapshot.formatForChart()
  });
});

// @desc    Manually trigger a combined snapshot (wealth + all goals)
// @route   POST /api/snapshots/combined/manual
// @access  Private
// @body    notes: Optional user notes
export const takeManualCombinedSnapshot = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { notes } = req.body;

  const result = await snapshotService.takeCombinedSnapshot(userId, 'manual');

  res.status(201).json({
    message: `Combined snapshot created successfully: ${result.total} snapshots`,
    summary: {
      wealthSnapshot: result.wealth ? result.wealth.formatForChart() : null,
      goalSnapshots: result.goals.length,
      totalSnapshots: result.total
    }
  });
});

// @desc    Get user's snapshot settings
// @route   GET /api/snapshots/settings
// @access  Private
export const getSnapshotSettings = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const user = await User.findById(userId).select('snapshotSettings').lean();

  if (!user) {
    throw new NotFoundError('User not found');
  }

  const settings = user.snapshotSettings || {
    enabled: true,
    frequency: 'weekly',
    auto_snapshot_day: 0,
    keep_history_months: 24,
    last_snapshot_date: null
  };

  res.json(settings);
});

// @desc    Update user's snapshot settings
// @route   PUT /api/snapshots/settings
// @access  Private
// @body    enabled, frequency, auto_snapshot_day, keep_history_months
export const updateSnapshotSettings = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { enabled, frequency, auto_snapshot_day, keep_history_months } = req.body;

  // Validation
  if (frequency && !['daily', 'weekly', 'monthly'].includes(frequency)) {
    throw new BadRequestError('Frequency must be one of: daily, weekly, monthly');
  }

  if (auto_snapshot_day !== undefined) {
    const day = Number(auto_snapshot_day);
    if (frequency === 'weekly' && (day < 0 || day > 6)) {
      throw new BadRequestError('For weekly frequency, auto_snapshot_day must be 0-6 (Sunday-Saturday)');
    }
    if (frequency === 'monthly' && (day < 1 || day > 28)) {
      throw new BadRequestError('For monthly frequency, auto_snapshot_day must be 1-28');
    }
  }

  if (keep_history_months !== undefined) {
    const months = Number(keep_history_months);
    if (months < 1 || months > 120) {
      throw new BadRequestError('keep_history_months must be between 1 and 120');
    }
  }

  // Build update object
  const updateFields = {};
  if (enabled !== undefined) updateFields['snapshotSettings.enabled'] = enabled;
  if (frequency) updateFields['snapshotSettings.frequency'] = frequency;
  if (auto_snapshot_day !== undefined) updateFields['snapshotSettings.auto_snapshot_day'] = auto_snapshot_day;
  if (keep_history_months !== undefined) updateFields['snapshotSettings.keep_history_months'] = keep_history_months;

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: updateFields },
    { new: true, runValidators: true }
  ).select('snapshotSettings');

  if (!user) {
    throw new NotFoundError('User not found');
  }

  res.json({
    message: 'Snapshot settings updated successfully',
    settings: user.snapshotSettings
  });
});

// @desc    Check if snapshot is due and return status
// @route   GET /api/snapshots/status
// @access  Private
export const getSnapshotStatus = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const isDue = await snapshotService.isSnapshotDue(userId);
  const user = await User.findById(userId).select('snapshotSettings').lean();

  res.json({
    isDue,
    settings: user?.snapshotSettings || {},
    nextScheduledSnapshot: calculateNextSnapshotDate(user?.snapshotSettings)
  });
});

// @desc    Clean up old snapshots
// @route   DELETE /api/snapshots/cleanup
// @access  Private
export const cleanupSnapshots = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const deletedCount = await snapshotService.cleanupUserSnapshots(userId);

  res.json({
    message: `Cleaned up ${deletedCount} old snapshot(s)`,
    deletedCount
  });
});

/**
 * Helper function to calculate next snapshot date
 */
const calculateNextSnapshotDate = (settings) => {
  if (!settings || !settings.enabled) {
    return null;
  }

  const now = new Date();
  const lastSnapshot = settings.last_snapshot_date ? new Date(settings.last_snapshot_date) : new Date(0);

  switch (settings.frequency) {
    case 'daily': {
      const nextDate = new Date(lastSnapshot);
      nextDate.setDate(nextDate.getDate() + 1);
      return nextDate > now ? nextDate.toISOString().split('T')[0] : now.toISOString().split('T')[0];
    }

    case 'weekly': {
      const targetDay = settings.auto_snapshot_day || 0;
      const nextDate = new Date(now);
      const currentDay = now.getDay();
      const daysUntilTarget = (targetDay - currentDay + 7) % 7;
      nextDate.setDate(now.getDate() + (daysUntilTarget || 7));
      return nextDate.toISOString().split('T')[0];
    }

    case 'monthly': {
      const targetDay = settings.auto_snapshot_day || 1;
      const nextDate = new Date(now);
      nextDate.setDate(targetDay);
      if (nextDate <= now) {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }
      return nextDate.toISOString().split('T')[0];
    }

    default:
      return null;
  }
};

export default {
  getWealthHistory,
  getGoalHistory,
  takeManualWealthSnapshot,
  takeManualGoalSnapshot,
  takeManualCombinedSnapshot,
  getSnapshotSettings,
  updateSnapshotSettings,
  getSnapshotStatus,
  cleanupSnapshots
};
