import mongoose from 'mongoose';

/**
 * ============================================================
 * Snapshot Model - Wealth and Goal Snapshot Records
 * ============================================================
 * Purpose:
 * 1. Record user's wealth status historical data
 * 2. Record goal completion progress history
 * 3. Support historical trend chart generation
 * 
 * Design Principles:
 * - Lightweight: Store only key metrics, no redundant full asset lists
 * - Queryable: Optimized indexes for fast time-range queries
 * - Extensible: Metadata field reserved for future expansion
 * ============================================================
 */

// Sub-schema: Wealth Snapshot Data
const WealthSnapshotSchema = new mongoose.Schema({
  net_worth: { 
    type: Number, 
    required: true,
    description: 'Net Worth = Total Assets - Total Liabilities'
  },
  total_assets: { 
    type: Number, 
    required: true,
    description: 'Total Assets'
  },
  total_liabilities: { 
    type: Number, 
    required: true,
    description: 'Total Liabilities'
  },
  liquid_capital: { 
    type: Number, 
    required: true,
    description: 'Liquid Capital (quickly convertible assets)'
  },
  // Asset breakdown by category (for pie charts, etc.)
  asset_breakdown: [{
    category: { type: String, required: true },
    value: { type: Number, required: true },
    _id: false
  }],
}, { _id: false });

// Sub-schema: Goal Snapshot Data
const GoalSnapshotSchema = new mongoose.Schema({
  goal_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Goal', 
    required: true 
  },
  goal_name: { 
    type: String, 
    required: true 
  },
  target_amount: { 
    type: Number, 
    required: true 
  },
  current_amount: { 
    type: Number, 
    required: true 
  },
  progress_pct: { 
    type: Number, 
    min: 0, 
    max: 100,
    description: 'Completion progress percentage'
  },
  monthly_contribution: { 
    type: Number,
    description: 'Monthly contribution amount (growth since last snapshot)'
  },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed', 'canceled'],
  }
}, { _id: false });

// Main Schema
const SnapshotSchema = new mongoose.Schema(
  {
    // --- User Reference ---
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },

    // --- Snapshot Type ---
    snapshot_type: {
      type: String,
      required: true,
      enum: ['wealth', 'goal', 'combined'],
      index: true,
      description: 'wealth: wealth snapshot, goal: single goal snapshot, combined: comprehensive snapshot'
    },

    // --- Snapshot Time ---
    snapshot_date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    // --- Snapshot Data (Polymorphic Fields) ---
    wealth_snapshot: {
      type: WealthSnapshotSchema,
      required: false,
      description: 'Used when snapshot_type is wealth or combined'
    },

    goal_snapshot: {
      type: GoalSnapshotSchema,
      required: false,
      description: 'Used when snapshot_type is goal'
    },

    // --- Metadata ---
    metadata: {
      trigger: {
        type: String,
        enum: ['auto', 'manual', 'event'],
        default: 'auto',
        description: 'auto: scheduled task, manual: user initiated, event: event triggered'
      },
      trigger_event: {
        type: String,
        description: 'If event triggered, record event type (e.g., goal_completed, asset_sold)'
      },
      market_conditions: {
        type: String,
        description: 'Optional: record market environment at snapshot time (bull/bear/volatile)'
      },
      notes: {
        type: String,
        maxlength: 500,
        description: 'User notes'
      }
    }
  },
  {
    timestamps: { 
      createdAt: 'created_at', 
      updatedAt: false  // Snapshots don't need updatedAt
    },
  }
);

/**
 * ============================================================
 * Index Optimization (Key to Query Performance)
 * ============================================================
 */

// Compound Index 1: Query by user and time (most common)
// Query scenario: Get user's snapshots from last N months
SnapshotSchema.index({ user_id: 1, snapshot_date: -1 });

// Compound Index 2: Query by user, type and time
// Query scenario: Get user's wealth snapshot history
SnapshotSchema.index({ user_id: 1, snapshot_type: 1, snapshot_date: -1 });

// Compound Index 3: Query by user and goal ID
// Query scenario: Get progress history for a specific goal
SnapshotSchema.index({ user_id: 1, 'goal_snapshot.goal_id': 1, snapshot_date: -1 });

/**
 * ============================================================
 * Instance Methods
 * ============================================================
 */

// Format snapshot data for frontend charts
SnapshotSchema.methods.formatForChart = function() {
  if (this.snapshot_type === 'wealth' || this.snapshot_type === 'combined') {
    return {
      date: this.snapshot_date.toISOString().split('T')[0],
      netWorth: this.wealth_snapshot.net_worth,
      assets: this.wealth_snapshot.total_assets,
      liabilities: this.wealth_snapshot.total_liabilities,
      liquidCapital: this.wealth_snapshot.liquid_capital
    };
  }
  
  if (this.snapshot_type === 'goal') {
    return {
      date: this.snapshot_date.toISOString().split('T')[0],
      currentAmount: this.goal_snapshot.current_amount,
      targetAmount: this.goal_snapshot.target_amount,
      progressPct: this.goal_snapshot.progress_pct,
      contribution: this.goal_snapshot.monthly_contribution || 0
    };
  }
  
  return null;
};

/**
 * ============================================================
 * Static Methods
 * ============================================================
 */

// Clean up old snapshots (data older than specified months)
SnapshotSchema.statics.cleanupOldSnapshots = async function(userId, keepMonths = 24) {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - keepMonths);
  
  const result = await this.deleteMany({
    user_id: userId,
    snapshot_date: { $lt: cutoffDate },
    'metadata.trigger': 'auto'  // Only delete auto snapshots, keep manual ones
  });
  
  return result.deletedCount;
};

// Get user's latest wealth snapshot
SnapshotSchema.statics.getLatestWealthSnapshot = async function(userId) {
  return await this.findOne({
    user_id: userId,
    snapshot_type: { $in: ['wealth', 'combined'] }
  })
  .sort({ snapshot_date: -1 })
  .lean();
};

export default mongoose.model('Snapshot', SnapshotSchema);
