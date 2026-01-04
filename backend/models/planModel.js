import mongoose from 'mongoose';

/**
 * Plan Schema (The Engine)
 * Defines HOW a goal is achieved:
 * 1. Strategy (Risk, Rules, Economic Exposure)
 * 2. Execution (Source -> Target flow)
 * 3. Schedule (Frequency, Amount, Lump Sums)
 * 4. Portfolio (Selected products with weights)
 * 5. Glide Path (Risk reduction over time)
 * 6. Simulation Parameters (Monte Carlo config)
 */

// Sub-schema: Product in portfolio with weight
const PortfolioProductSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  weight_pct: { type: Number, required: true, min: 0, max: 100 },
  rationale: { type: String }
}, { _id: false });

// Sub-schema: Selected portfolio option
const SelectedPortfolioSchema = new mongoose.Schema({
  option_id: { type: String, required: true }, // e.g., 'lowest_cost', 'diversified', 'balanced'
  option_name: { type: String },
  description: { type: String },
  total_fees_estimate: { type: Number },
  calculated_exposure: {
    growth: { type: Number },
    defensive: { type: Number },
    liquidity: { type: Number }
  },
  products: [PortfolioProductSchema]
}, { _id: false });

// Sub-schema: Economic Exposure target
const EconomicExposureSchema = new mongoose.Schema({
  growth: { type: Number, default: 60 },
  defensive: { type: Number, default: 30 },
  liquidity: { type: Number, default: 10 }
}, { _id: false });

// Sub-schema: Glide Path (de-risking over time)
const GlidePathSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  start_years_before_goal: { type: Number, default: 10 },
  end_state: {
    growth: { type: Number, default: 30 },
    defensive: { type: Number, default: 50 },
    liquidity: { type: Number, default: 20 }
  }
}, { _id: false });

// Sub-schema: Contribution Strategy
const ContributionStrategySchema = new mongoose.Schema({
  mode: { type: String, enum: ['recurring', 'lump_sum', 'hybrid'], default: 'recurring' },
  monthly_amount: { type: Number, default: 0 },
  lump_sum_amount: { type: Number, default: 0 },
  income_linked: { type: Boolean, default: false },
  escalation_rate_pct: { type: Number, default: 2 } // Annual increase %
}, { _id: false });

// Sub-schema: Simulation Results (cached from Monte Carlo)
const SimulationResultSchema = new mongoose.Schema({
  run_at: { type: Date, default: Date.now },
  iterations: { type: Number, default: 1000 },
  success_probability: { type: Number }, // % chance of hitting target
  median_outcome: { type: Number },
  percentile_10: { type: Number },
  percentile_90: { type: Number },
  expected_return_pct: { type: Number },
  volatility_pct: { type: Number }
}, { _id: false });

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
  
  // Target economic exposure (from AI recommendation)
  target_exposure: { type: EconomicExposureSchema, default: () => ({}) },
  
  // Glide path configuration
  glide_path: { type: GlidePathSchema, default: () => ({}) },
  
  // Advanced Tweaks
  settings: {
    inflation_adjusted: { type: Boolean, default: true },
    tax_optimized: { type: Boolean, default: false },
    reinvest_dividends: { type: Boolean, default: true },
    liquidity_preference: { type: String, enum: ['locked', 'flexible'], default: 'flexible' }
  },

  // --- 2. Execution Flow (Source -> Target) ---
  funding_source: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset',
    description: "The primary account/asset funding this goal"
  },
  
  // Legacy: Single product reference
  investment_product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    description: "The investment vehicle selected"
  },
  
  // Legacy: Mock Product Details
  product_snapshot: {
    name: String,
    provider: String,
    fees: String,
    risk_level: String
  },

  // --- 3. Selected Portfolio (Stage 3) ---
  selected_portfolio: { type: SelectedPortfolioSchema },

  // --- 4. Contribution Schedule ---
  contribution: {
    amount: { type: Number, default: 0, min: 0 },
    frequency: { 
      type: String, 
      enum: ['weekly', 'fortnightly', 'monthly', 'lump_sum'], 
      default: 'monthly' 
    },
    next_payment_date: Date
  },
  
  // Enhanced contribution strategy (from AI)
  contribution_strategy: { type: ContributionStrategySchema, default: () => ({}) },

  // --- 5. Allocation of Existing Assets (Lump Sums) ---
  initial_allocations: [{
    asset_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' },
    amount: Number,
    allocated_at: { type: Date, default: Date.now }
  }],

  // --- 6. Simulation Results (Stage 4) ---
  simulation_result: { type: SimulationResultSchema },

  // --- Meta ---
  ai_rationale: { type: String, maxlength: 2000 },
  decision_session_id: { type: String }, // Links to GoalDecisionLog session
  status: {
    type: String,
    enum: ['active', 'paused', 'completed'],
    default: 'active'
  }

}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Index for quick lookup (goal_id already has unique:true which creates index)
// Only add compound index for user+status queries
PlanSchema.index({ user_id: 1, status: 1 });

export default mongoose.model('Plan', PlanSchema);
