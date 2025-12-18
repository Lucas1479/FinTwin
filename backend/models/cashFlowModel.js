import mongoose from 'mongoose';

const CashFlowSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },
    
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true,
    },

    // 'Income', 'Expense', or 'Subscription' (which is technically an expense but tracked separately)
    type: {
      type: String,
      required: true,
      enum: ['Income', 'Expense', 'Subscription'],
      index: true,
    },

    category: {
      type: String,
      required: true,
      trim: true, 
      // Examples: 'Salary', 'Investment', 'Housing', 'Food', 'Transport', 'Entertainment'
    },

    amount: {
      type: Number,
      required: true,
      min: [0, 'Amount must be positive'],
    },

    currency: {
      type: String,
      default: 'NZD',
    },

    // Frequency logic for projection
    frequency: {
      type: String,
      enum: ['Weekly', 'Fortnightly', 'Monthly', 'Yearly', 'One-Off'],
      default: 'Monthly',
    },

    // For Income: Is this stable (Salary) or variable (Dividends)?
    // For Expense: Is this fixed (Rent) or variable (Groceries)?
    is_variable: {
      type: Boolean,
      default: false,
    },
    
    // --- Time Dimension (For Projection & Calibration) ---
    // This replaces simple 'billing_cycle_date'
    
    timing_mode: {
      type: String,
      enum: ['Specific_Date', 'Daily_Spread'], 
      default: 'Specific_Date',
      description: "Specific_Date = Discrete event (Salary, Rent). Daily_Spread = Continuous flow (Food, Fuel)."
    },

    // For Specific_Date:
    // If Monthly: 1-31
    // If Weekly: 1-7 (1=Monday, 7=Sunday)
    anchor_date: {
        type: Number, 
        min: 1,
        max: 31,
        default: 1
    },
    
    // For Fortnightly calculation or precise One-Offs
    start_date: {
        type: Date,
        default: Date.now
    },
    
    // Optional icon or color for UI
    icon: { type: String }, 
    color: { type: String }
  },
  {
    timestamps: true,
  }
);

// Compound index for quick dashboard queries
CashFlowSchema.index({ user_id: 1, type: 1 });

export default mongoose.model('CashFlow', CashFlowSchema);
