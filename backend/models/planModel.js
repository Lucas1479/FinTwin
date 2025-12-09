import mongoose from 'mongoose';

/**
 * Plan Schema (The Engine)
 * Defines HOW a goal is achieved:
 * 1. Strategy (Risk, Rules)
 * 2. Execution (Source -> Target flow)
 * 3. Schedule (Frequency, Amount)
 */

const PlanSchema = new mongoose.Schema({
  // --- References ---
  goal_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Goal', 
    required: true, 
    unique: true // One active plan per goal (for MVP)
  },
  user_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },

  // --- 1. Strategic Guardrails (Stage 2) ---
  strategy_profile: {
    type: String,
    enum: ['conservative', 'balanced', 'aggressive', 'custom'],
    default: 'balanced'
  },
  
  // Advanced Tweaks
  settings: {
    inflation_adjusted: { type: Boolean, default: true }, // Auto-increase target/contributions
    tax_optimized: { type: Boolean, default: false },     // Prefer PIE funds
    reinvest_dividends: { type: Boolean, default: true },
    liquidity_preference: { type: String, enum: ['locked', 'flexible'], default: 'flexible' }
  },

  // --- 2. Execution Flow (Source -> Target) ---
  // Where is the money coming from? (The Wallet)
  funding_source: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset', // Links to financial_assets collection
    description: "The primary account/asset funding this goal"
  },
  
  // Where is the money going? (The Vehicle)
  investment_product: {
    type: mongoose.Schema.Types.ObjectId, // Could be an ID from a Product catalog
    ref: 'Product', // If you have a Product model, otherwise just store details
    description: "The investment vehicle selected (e.g., Simplicity Growth Fund)"
  },
  
  // Mock Product Details (if no separate Product collection yet)
  product_snapshot: {
    name: String,
    provider: String,
    fees: String,
    risk_level: String
  },

  // --- 3. Contribution Schedule ---
  contribution: {
    amount: { type: Number, required: true, min: 0 },
    frequency: { 
      type: String, 
      enum: ['weekly', 'fortnightly', 'monthly', 'lump_sum'], 
      default: 'monthly' 
    },
    next_payment_date: Date
  },

  // --- 4. Allocation of Existing Assets (Lump Sums) ---
  // "I'm also using $10k from my existing Savings"
  initial_allocations: [{
    asset_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' },
    amount: Number,
    allocated_at: { type: Date, default: Date.now }
  }],

  // --- Meta ---
  ai_rationale: { type: String, maxlength: 1000 }, // Why did the Engine suggest this?
  status: {
    type: String,
    enum: ['active', 'paused', 'completed'],
    default: 'active'
  }

}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Index for quick lookup by goal
PlanSchema.index({ goal_id: 1 });

export default mongoose.model('Plan', PlanSchema);
