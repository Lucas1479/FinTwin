import Snapshot from '../models/snapshotModel.js';
import FinancialAsset from '../models/financialAssetModel.js';
import Goal from '../models/goalModel.js';
import User from '../models/userModel.js';

/**
 * ============================================================
 * Snapshot Service - Core Logic for Snapshot Generation
 * ============================================================
 * Responsibilities:
 * 1. Generate wealth snapshots
 * 2. Generate goal progress snapshots
 * 3. Check if snapshot is due
 * 4. Clean up old snapshots
 * ============================================================
 */

/**
 * Calculate wealth summary for a user
 * @param {ObjectId} userId - User ID
 * @returns {Object} Wealth summary data
 */
const calculateWealthSummary = async (userId) => {
  const assets = await FinancialAsset.find({ user_id: userId }).lean();

  let totalAssets = 0;
  let totalLiabilities = 0;
  let liquidCapital = 0;
  const assetBreakdownMap = {};

  assets.forEach((item) => {
    if (item.record_type === 'Asset') {
      totalAssets += item.value;
      if (item.is_liquid) {
        liquidCapital += item.value;
      }
      
      // Aggregate by category
      if (assetBreakdownMap[item.category]) {
        assetBreakdownMap[item.category] += item.value;
      } else {
        assetBreakdownMap[item.category] = item.value;
      }
    } else if (item.record_type === 'Liability') {
      totalLiabilities += item.value;
    }
  });

  const assetBreakdown = Object.keys(assetBreakdownMap).map(category => ({
    category,
    value: assetBreakdownMap[category]
  }));

  const netWorth = totalAssets - totalLiabilities;

  return {
    net_worth: netWorth,
    total_assets: totalAssets,
    total_liabilities: totalLiabilities,
    liquid_capital: liquidCapital,
    asset_breakdown: assetBreakdown
  };
};

/**
 * Take a wealth snapshot for a user
 * @param {ObjectId} userId - User ID
 * @param {String} trigger - Trigger type: 'auto' | 'manual' | 'event'
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Created snapshot document
 */
export const takeWealthSnapshot = async (userId, trigger = 'auto', metadata = {}) => {
  try {
    const wealthData = await calculateWealthSummary(userId);

    const snapshot = await Snapshot.create({
      user_id: userId,
      snapshot_type: 'wealth',
      snapshot_date: new Date(),
      wealth_snapshot: wealthData,
      metadata: {
        trigger,
        ...metadata
      }
    });

    // Update user's last snapshot date
    await User.findByIdAndUpdate(userId, {
      'snapshotSettings.last_snapshot_date': new Date()
    });

    return snapshot;
  } catch (error) {
    console.error('[SnapshotService] Error taking wealth snapshot:', error);
    throw error;
  }
};

/**
 * Take a goal progress snapshot
 * @param {ObjectId} userId - User ID
 * @param {ObjectId} goalId - Goal ID
 * @param {String} trigger - Trigger type
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Created snapshot document
 */
export const takeGoalSnapshot = async (userId, goalId, trigger = 'auto', metadata = {}) => {
  try {
    const goal = await Goal.findOne({ _id: goalId, user_id: userId }).lean();
    
    if (!goal) {
      throw new Error('Goal not found');
    }

    const progressPct = goal.target_amount > 0 
      ? Math.min(100, (goal.current_amount / goal.target_amount) * 100)
      : 0;

    // Calculate monthly contribution by comparing with last snapshot
    let monthlyContribution = 0;
    const lastSnapshot = await Snapshot.findOne({
      user_id: userId,
      snapshot_type: 'goal',
      'goal_snapshot.goal_id': goalId
    }).sort({ snapshot_date: -1 }).lean();

    if (lastSnapshot && lastSnapshot.goal_snapshot) {
      monthlyContribution = goal.current_amount - lastSnapshot.goal_snapshot.current_amount;
    }

    const snapshot = await Snapshot.create({
      user_id: userId,
      snapshot_type: 'goal',
      snapshot_date: new Date(),
      goal_snapshot: {
        goal_id: goalId,
        goal_name: goal.goal_name,
        target_amount: goal.target_amount,
        current_amount: goal.current_amount,
        progress_pct: progressPct,
        monthly_contribution: monthlyContribution,
        status: goal.status
      },
      metadata: {
        trigger,
        ...metadata
      }
    });

    return snapshot;
  } catch (error) {
    console.error('[SnapshotService] Error taking goal snapshot:', error);
    throw error;
  }
};

/**
 * Take snapshots for all user's goals
 * @param {ObjectId} userId - User ID
 * @param {String} trigger - Trigger type
 * @returns {Array} Array of created snapshots
 */
export const takeAllGoalSnapshots = async (userId, trigger = 'auto') => {
  try {
    const goals = await Goal.find({ 
      user_id: userId,
      status: { $in: ['not_started', 'in_progress'] }  // Don't snapshot completed/canceled goals
    }).lean();

    const snapshots = [];
    for (const goal of goals) {
      const snapshot = await takeGoalSnapshot(userId, goal._id, trigger);
      snapshots.push(snapshot);
    }

    return snapshots;
  } catch (error) {
    console.error('[SnapshotService] Error taking all goal snapshots:', error);
    throw error;
  }
};

/**
 * Take a combined snapshot (wealth + all goals)
 * @param {ObjectId} userId - User ID
 * @param {String} trigger - Trigger type
 * @returns {Object} Summary of snapshots taken
 */
export const takeCombinedSnapshot = async (userId, trigger = 'auto') => {
  try {
    const wealthSnapshot = await takeWealthSnapshot(userId, trigger);
    const goalSnapshots = await takeAllGoalSnapshots(userId, trigger);

    return {
      wealth: wealthSnapshot,
      goals: goalSnapshots,
      total: 1 + goalSnapshots.length
    };
  } catch (error) {
    console.error('[SnapshotService] Error taking combined snapshot:', error);
    throw error;
  }
};

/**
 * Check if a snapshot is due for a user
 * @param {ObjectId} userId - User ID
 * @returns {Boolean} True if snapshot is due
 */
export const isSnapshotDue = async (userId) => {
  try {
    const user = await User.findById(userId).select('snapshotSettings').lean();
    
    if (!user || !user.snapshotSettings || !user.snapshotSettings.enabled) {
      return false;
    }

    const settings = user.snapshotSettings;
    const lastSnapshot = settings.last_snapshot_date;
    
    // If never taken, it's due
    if (!lastSnapshot) {
      return true;
    }

    const now = new Date();
    const lastDate = new Date(lastSnapshot);
    const daysSinceLastSnapshot = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));

    // Check based on frequency
    switch (settings.frequency) {
      case 'daily':
        return daysSinceLastSnapshot >= 1;
      
      case 'weekly': {
        const currentDayOfWeek = now.getDay(); // 0=Sunday, 1=Monday, etc.
        const targetDay = settings.auto_snapshot_day || 0;
        return daysSinceLastSnapshot >= 7 || 
               (daysSinceLastSnapshot >= 1 && currentDayOfWeek === targetDay);
      }
      
      case 'monthly': {
        const currentDayOfMonth = now.getDate();
        const targetDay = settings.auto_snapshot_day || 1;
        return daysSinceLastSnapshot >= 28 || 
               (daysSinceLastSnapshot >= 1 && currentDayOfMonth === targetDay);
      }
      
      default:
        return false;
    }
  } catch (error) {
    console.error('[SnapshotService] Error checking if snapshot is due:', error);
    return false;
  }
};

/**
 * Get wealth snapshots for a user within a time period
 * @param {ObjectId} userId - User ID
 * @param {String} period - Period string: '6m', '1y', '3y', 'all'
 * @returns {Array} Array of formatted snapshots
 */
export const getWealthHistory = async (userId, period = '6m') => {
  try {
    const now = new Date();
    let startDate = new Date(now);

    // Calculate start date based on period
    switch (period) {
      case '1m':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3m':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6m':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case '3y':
        startDate.setFullYear(now.getFullYear() - 3);
        break;
      case '5y':
        startDate.setFullYear(now.getFullYear() - 5);
        break;
      case 'all':
        startDate = new Date(0); // Beginning of time
        break;
      default:
        startDate.setMonth(now.getMonth() - 6);
    }

    const snapshots = await Snapshot.find({
      user_id: userId,
      snapshot_type: { $in: ['wealth', 'combined'] },
      snapshot_date: { $gte: startDate }
    })
    .sort({ snapshot_date: 1 })
    .lean();

    return snapshots.map(snapshot => snapshot.wealth_snapshot ? {
      date: snapshot.snapshot_date.toISOString().split('T')[0],
      netWorth: snapshot.wealth_snapshot.net_worth,
      assets: snapshot.wealth_snapshot.total_assets,
      liabilities: snapshot.wealth_snapshot.total_liabilities,
      liquidCapital: snapshot.wealth_snapshot.liquid_capital,
      trigger: snapshot.metadata?.trigger
    } : null).filter(Boolean);
  } catch (error) {
    console.error('[SnapshotService] Error getting wealth history:', error);
    throw error;
  }
};

/**
 * Get goal progress history
 * @param {ObjectId} userId - User ID
 * @param {ObjectId} goalId - Goal ID
 * @param {String} period - Period string
 * @returns {Array} Array of formatted goal snapshots
 */
export const getGoalHistory = async (userId, goalId, period = '1y') => {
  try {
    const now = new Date();
    let startDate = new Date(now);

    switch (period) {
      case '1m':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3m':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6m':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        startDate = new Date(0);
        break;
      default:
        startDate.setFullYear(now.getFullYear() - 1);
    }

    const snapshots = await Snapshot.find({
      user_id: userId,
      snapshot_type: 'goal',
      'goal_snapshot.goal_id': goalId,
      snapshot_date: { $gte: startDate }
    })
    .sort({ snapshot_date: 1 })
    .lean();

    return snapshots.map(snapshot => snapshot.goal_snapshot ? {
      date: snapshot.snapshot_date.toISOString().split('T')[0],
      currentAmount: snapshot.goal_snapshot.current_amount,
      targetAmount: snapshot.goal_snapshot.target_amount,
      progressPct: snapshot.goal_snapshot.progress_pct,
      contribution: snapshot.goal_snapshot.monthly_contribution || 0,
      trigger: snapshot.metadata?.trigger
    } : null).filter(Boolean);
  } catch (error) {
    console.error('[SnapshotService] Error getting goal history:', error);
    throw error;
  }
};

/**
 * Clean up old snapshots for a user
 * @param {ObjectId} userId - User ID
 * @returns {Number} Number of deleted snapshots
 */
export const cleanupUserSnapshots = async (userId) => {
  try {
    const user = await User.findById(userId).select('snapshotSettings').lean();
    const keepMonths = user?.snapshotSettings?.keep_history_months || 24;
    
    const deletedCount = await Snapshot.cleanupOldSnapshots(userId, keepMonths);
    
    return deletedCount;
  } catch (error) {
    console.error('[SnapshotService] Error cleaning up snapshots:', error);
    throw error;
  }
};

export default {
  takeWealthSnapshot,
  takeGoalSnapshot,
  takeAllGoalSnapshots,
  takeCombinedSnapshot,
  isSnapshotDue,
  getWealthHistory,
  getGoalHistory,
  cleanupUserSnapshots
};
