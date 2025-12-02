import mongoose from 'mongoose';

/**
 * Level 3: Sub-Schemas (Embedded)
 * These are "parts" that will not exist independently; they are always attached to a Goal.
 */

// 1. Progress History (Used for drawing growth charts)
const ProgressHistorySchema = new mongoose.Schema({
  date: { type: Date, default: Date.now, required: true },
  amount: { type: Number, required: true }, // Total amount after change
  change: { type: Number }, // Amount changed in this transaction (+500 or -200)
  note: { type: String, trim: true } // e.g., "Monthly Auto-save"
}, { _id: false }); // No separate _id needed to save space

// 2. Action Plan (AI Generated To-Do List)
const ActionPlanSchema = new mongoose.Schema({
  action_text: { type: String, required: true }, // e.g., "Check KiwiSaver balance"
  is_completed: { type: Boolean, default: false },
  reminder_date: { type: Date }
}, { _id: true }); // Needs _id to facilitate locating when toggling completion on frontend

// 3. Funding Mix: How existing assets are allocated to this goal
const FundingMixSchema = new mongoose.Schema({
  asset_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FinancialAsset', // Refer to financial_assets collection model
    required: true,
  },
  allocation_type: {
    type: String,
    required: true,
    enum: ['Percentage', 'Fixed_Amount'],
  },
  allocation_value: {
    type: Number,
    required: true,
    min: 0,
  },
}, { _id: false });

// 4. Contribution Plan: Future recurring contributions for projection only
const ContributionPlanSchema = new mongoose.Schema({
  recurring_amount: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Amount the user commits to save regularly. Used only for AI projections.',
  },
  frequency: {
    type: String,
    default: 'Monthly',
    enum: ['Weekly', 'Fortnightly', 'Monthly'],
    description: 'How often the recurring_amount is added in projection models.',
  },
}, { _id: false });

// 1. Define Polymorphic Sub-Schemas (The "Magic Pocket" Shapes)
// ==========================================
// These schemas validate the `goal_details` mixed field based on the selected category.

const RetirementDetailSchema = new mongoose.Schema({
  retirement_age: { type: Number, required: true, default: 65 },
  life_expectancy: { type: Number, required: true, default: 90 },
  include_superannuation: { type: Boolean, default: true }, // NZ Super
  living_expense_pa: { type: Number, required: true }, // Per Annum requirement
}, { _id: false });

const HomeDetailSchema = new mongoose.Schema({
  location: { type: String, required: true }, // e.g. "Auckland"
  property_price_estimate: { type: Number, required: true },
  deposit_percentage: { type: Number, required: true, default: 20 },
  is_first_home: { type: Boolean, default: true }, // Triggers KiwiSaver grant logic
  homestart_grant_eligible: { type: Boolean, default: false }
}, { _id: false });

const EmergencyDetailSchema = new mongoose.Schema({
  monthly_expenditure: { type: Number, required: true },
  coverage_months: { type: Number, default: 3, min: 1, max: 12 }, // Usually 3-6 months
  is_locked: { type: Boolean, default: false } // If true, AI warns against withdrawing
}, { _id: false });

const DebtDetailSchema = new mongoose.Schema({
  lender_name: { type: String, required: true },
  interest_rate: { type: Number, required: true },
  minimum_monthly_payment: { type: Number },
  debt_type: { type: String, enum: ['credit_card', 'student_loan', 'personal_loan', 'mortgage'] }
}, { _id: false });

const EducationDetailSchema = new mongoose.Schema({
  start_year: { type: Number, required: true },
  duration_years: { type: Number, required: true, default: 3 },
  institution_type: { type: String, enum: ['University', 'Polytech', 'Private'], default: 'University' },
  student_name: { type: String } // e.g., "Child 1"
}, { _id: false });

const WealthDetailSchema = new mongoose.Schema({
  investment_vehicle: { type: String, enum: ['managed_fund', 'shares', 'crypto', 'business', 'other'] },
  target_return_rate: { type: Number }, // User's optimistic expectation
  reinvest_dividends: { type: Boolean, default: true }
}, { _id: false });

const TravelDetailSchema = new mongoose.Schema({
  destination: { type: String, required: true },
  travelers_count: { type: Number, default: 1 },
  duration_days: { type: Number, default: 14 },
  travel_date_flexible: { type: Boolean, default: false }
}, { _id: false });

const VehicleDetailSchema = new mongoose.Schema({
  vehicle_type: { type: String }, // e.g. "EV", "SUV"
  trade_in_value: { type: Number, default: 0 },
  finance_required: { type: Boolean, default: false }
}, { _id: false });

const BigPurchaseDetailSchema = new mongoose.Schema({
  item_name: { type: String, required: true }, // e.g., "Kitchen Renovation"
  purchase_type: { type: String, enum: ['renovation', 'wedding', 'electronics', 'luxury', 'other'] },
  vendor_quote: { type: Number } // If user has a specific quote
}, { _id: false });

// Helper map to link category string to schema
const DETAIL_SCHEMAS = {
  'retirement': RetirementDetailSchema,
  'home': HomeDetailSchema,
  'emergency': EmergencyDetailSchema,
  'debt': DebtDetailSchema,
  'education': EducationDetailSchema,
  'wealth': WealthDetailSchema,
  'travel': TravelDetailSchema,
  'vehicle': VehicleDetailSchema,
  'big_purchase': BigPurchaseDetailSchema
  // 'custom' uses no schema (flexible)
};

/**
 * Level 1 & 2: Main Schema
 */
const GoalSchema = new mongoose.Schema({
  // --- References ---
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true // Level 1 Index: Indexed here to quickly find all goals for a specific person
  },

  // --- Level 1: Meta Data (Used for Dashboard card display) ---
  goal_name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  
  icon: { 
    type: String, 
    default: 'target' // Frontend renders SVG based on this string
  }, 

  category: {
    type: String,
    required: true,
    enum: [
            // --- 1. Foundation / Cornerstone  ---
            'retirement',    // Retirement (Strategy: Ultra-long term, KiwiSaver lock-in, Inflation-resistant)
            'home',          // Home Ownership (Strategy: Large capital, First Home Grant/Subsidy, Medium-to-long term)
            'emergency',     // Emergency Fund (Strategy: Extremely high liquidity, Zero risk, AI auto-calculates amount)
            'debt',          // Debt Repayment (Strategy: Guaranteed return, Highest priority)

            // --- 2. Growth / Value-Add  ---
            'education',     // Education (Strategy: Tuition/School district housing, Rigid demand/Guaranteed payment)
            'wealth',        // Wealth Growth (Strategy: No specific purpose, purely for making money grow, Includes starting a business)

            // --- 3. Lifestyle / Consumption  ---
            'travel',        // Travel (Strategy: Short term, Wishes, Adjustable)
            'vehicle',       // Vehicle Purchase (Strategy: Medium term, Depreciating asset)
            'big_purchase',  // Big Purchase (Strategy: Covers Renovations/Wedding/Luxury goods/Electronics)

            // --- 4. Catch-all  ---
            'custom'         // Custom (Strategy: Parameters are completely user-defined)
          ]
  },

  // MoneyGuidePro Priority Logic
  priority: {
    type: String,
    required: true,
    enum: ['need', 'want', 'wish'],
    description: "Used by AI for trade-off analysis"
  },
  // Same as the growth expectation
  riskTolerance: {
    type: String,
    required: true,
    enum: ['high-risk', 'middle-risk', 'low-risk'],
    description: "Used by AI for trade-off analysis"
  },

  // Strategy snapshot: AI recommendation vs final user decision
  strategy: {
    recommended_risk: {
      type: String,
      enum: ['high-risk', 'middle-risk', 'low-risk'],
      description: 'Risk level recommended by the AI for this goal.',
    },
    user_override: {
      type: Boolean,
      default: false,
      description: 'True if user-selected riskTolerance differs from recommended_risk.',
    },
    ai_rationale: {
      type: String,
      maxlength: 1000,
      description: 'Short explanation from AI on why this risk level was recommended.',
    },
    last_decision_at: {
      type: Date,
      description: 'Timestamp of the last strategy decision for this goal.',
    },
  },

  status: {
    type: String,
    default: 'in_progress',
    enum: ['not_started', 'in_progress', 'completed', 'canceled']
  },

  rank: {
    type: Number,
    default: 0,
    description: "Used for manual drag-and-drop ordering within the Goal Inventory UI."
  },

  // Financial Core
  target_amount: { type: Number, required: true , min: 0 },
  current_amount: { type: Number, default: 0 , min: 0 },
  due_date: { type: Date, required: true },
  inflation_adjusted:{ type:Boolean, default:true },

  // Funding & Contributions (The Wallet)
  // A. Existing Assets: how current assets are locked for this goal
  funding_mix: [FundingMixSchema], // Array of { asset_id, allocation_type, allocation_value }

  // B. Contribution Plan: future recurring savings (projection only)
  contribution_plan: {
    type: ContributionPlanSchema,
    default: () => ({}), // falls back to { recurring_amount: 0, frequency: 'Monthly' }
  },

  // --- Level 2: Polymorphic Details (Used for AI decision context) ---
  // Stores type-specific attributes for different goal types, keeping the Root clean
  goal_details: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    description: "Stores type-specific fields like { location: 'Auckland' } or { university: 'UoA' }"
  },

  notes: { type: String, maxlength: 500 }, // User motivation

  // --- Level 3: Embedded Data (Used for Detail Page interaction) ---
  progress_history: [ProgressHistorySchema], // Array: Stores history
  actions: [ActionPlanSchema],               // Array: Stores next actions

  // Linked Assets (Optional)
  linked_accounts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset'
  }],

  // Timestamps
  completed_at: Date

}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// ==========================================
// 4. Validation Middleware (The Guard)
// ==========================================
// Automatically validates `goal_details` against the correct Sub-Schema based on `category`
GoalSchema.pre('validate', async function(next) {
  const SpecificSchema = DETAIL_SCHEMAS[this.category];

  if (SpecificSchema && this.goal_details) {
    // strict: false allows extra fields in Mixed, but we want to validate the known ones
    const DummyModel = mongoose.model('DummyGoalDetail', SpecificSchema);
    const dummyDoc = new DummyModel(this.goal_details);
    
    const error = dummyDoc.validateSync();
    if (error) {
      next(new Error(`Validation failed for goal category '${this.category}': ${error.message}`));
      return;
    }
  }
  next();
});

// ==========================================
// Indexes (Query Optimization)
// ==========================================

// 1. Time filtering: "Show me goals ending this year"
GoalSchema.index({ due_date: 1 });

// 2. Status filtering: "Show User X's Active Goals" (Compound Index)
// This is the most common query for the Dashboard, very fast
GoalSchema.index({ user_id: 1, status: 1 });

GoalSchema.index({ user_id: 1, priority: 1, rank: 1 }); // For Goal Inventory Sorting


export default mongoose.model('Goal', GoalSchema);