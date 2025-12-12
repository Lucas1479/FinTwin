import mongoose from 'mongoose';

/**
 * ============================================================
 * Level 3: Sub-Schemas (Polymorphic Definitions)
 * Each category has its own schema for strict validation.
 * Design Principle: Only include fields that help with financial decision-making.
 * ============================================================
 */

// ==================== ASSETS ====================

// --- Cash & Banking ---

// 1. Cash_Bank (Everyday + Savings combined)
const BankAccountSchema = new mongoose.Schema({
  bank_name: { type: String, trim: true },       // e.g., "ANZ", "ASB"
  account_suffix: { type: String, trim: true },  // Last 2-4 digits to distinguish accounts
  interest_rate: { type: Number },               // For savings accounts with interest
}, { _id: false });

// 2. Cash_Physical (Cash at home, foreign currency)
const PhysicalCashSchema = new mongoose.Schema({
  location: { type: String, trim: true },        // e.g., "Home safe", "Wallet"
  currency: { type: String, default: 'NZD' },    // Supports foreign currency: USD, CNY, etc.
}, { _id: false });

// 3. Cash_TermDeposit (Locked deposits with maturity)
const TermDepositSchema = new mongoose.Schema({
  bank_name: { type: String, trim: true },
  interest_rate: { type: Number },
  term_months: { type: Number },                 // Lock period: 3, 6, 12, 24...
  maturity_date: { type: Date },                 // AI reminder for refix/withdrawal
  auto_rollover: { type: Boolean, default: false },
}, { _id: false });

// --- Investments ---

// 4. Invest_Shares (Stocks + ETFs, all markets combined)
const SharesSchema = new mongoose.Schema({
  platform: { type: String, trim: true },        // e.g., "Sharesies", "Stake", "IBKR"
  market: { 
    type: String, 
    enum: ['NZX', 'ASX', 'US', 'Other'],         // Useful for currency risk analysis
  },
  ticker: { type: String, trim: true },          // e.g., "AAPL", "SPY", "FPH"
  quantity: { type: Number },                    // Number of shares held
}, { _id: false });

// 5. Invest_ManagedFund (Managed Funds)
const ManagedFundSchema = new mongoose.Schema({
  provider: { type: String, trim: true },        // e.g., "Milford", "Fisher Funds"
  fund_name: { type: String, trim: true },       // e.g., "Active Growth Fund"
  risk_level: { 
    type: String, 
    enum: ['Aggressive', 'Growth', 'Balanced', 'Conservative', 'Defensive'],
  },
}, { _id: false });

// 6. KiwiSaver (NZ Retirement Savings - Special rules)
const KiwiSaverSchema = new mongoose.Schema({
  provider: { type: String, trim: true },        // e.g., "Simplicity", "ANZ"
  risk_level: { 
    type: String, 
    enum: ['Aggressive', 'Growth', 'Balanced', 'Conservative', 'Defensive'],
  },
  contribution_rate: { type: Number, min: 0, max: 10 },  // User's contribution %
  employer_contributes: { type: Boolean },       // Affects total contribution calculation
}, { _id: false });

// --- Physical Assets ---

// 7. Property (Real Estate)
const PropertySchema = new mongoose.Schema({
  address: { type: String, trim: true },
  property_type: { 
    type: String, 
    enum: ['Owner_Occupied', 'Investment', 'Other'],  // Affects financial analysis
  },
  purchase_price: { type: Number },              // For capital gain calculation
  purchase_year: { type: Number },
  has_mortgage: { type: Boolean },               // Reminder to link liability
}, { _id: false });

// 8. Vehicle (Cars, Motorcycles, etc.)
const VehicleSchema = new mongoose.Schema({
  make: { type: String, trim: true },            // e.g., "Toyota"
  model: { type: String, trim: true },           // e.g., "Aqua"
  year: { type: Number },                        // Affects depreciation estimate
  has_loan: { type: Boolean },                   // Reminder to link liability
}, { _id: false });

// 9. Other_Asset (Catch-all for valuables, collectibles, etc.)
const OtherAssetSchema = new mongoose.Schema({
  description: { type: String, trim: true },     // e.g., "Gold necklace", "Computer equipment"
}, { _id: false });

// ==================== LIABILITIES ====================

// 10. Mortgage (Home Loans)
const MortgageSchema = new mongoose.Schema({
  lender: { type: String, trim: true },          // e.g., "ANZ", "Westpac"
  interest_rate: { type: Number },               // Current rate
  rate_type: { 
    type: String, 
    enum: ['Fixed', 'Floating'],                 // Affects refix reminder logic
  },
  fixed_until: { type: Date },                   // AI reminder for refix
  loan_term_years: { type: Number },             // Total loan term
  linked_property_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'FinancialAsset',
  },                                             // Link to associated property
}, { _id: false });

// 11. Loan_Personal (Personal Loans)
const PersonalLoanSchema = new mongoose.Schema({
  lender: { type: String, trim: true },
  interest_rate: { type: Number },
  minimum_payment: { type: Number },             // Minimum monthly payment
}, { _id: false });

// 12. Loan_Student (NZ Student Loans - Special 0% interest rules)
const StudentLoanSchema = new mongoose.Schema({
  is_nz_student_loan: { type: Boolean, default: true },  // NZ = 0% interest if domestic
  repayment_threshold: { type: Number },         // Income threshold (~$24,128)
}, { _id: false });

// 13. Credit_Card
const CreditCardSchema = new mongoose.Schema({
  issuer: { type: String, trim: true },          // e.g., "ANZ", "Westpac"
  credit_limit: { type: Number },                // For debt risk analysis
  interest_rate: { type: Number },               // Usually 20%+
  interest_free_days: { type: Number },          // Interest-free period
}, { _id: false });

// 14. Other_Liability (Catch-all: BNPL, personal debts, etc.)
const OtherLiabilitySchema = new mongoose.Schema({
  description: { type: String, trim: true },     // e.g., "Afterpay", "Money owed to friend"
  interest_rate: { type: Number },               // Optional
}, { _id: false });

/**
 * ============================================================
 * Schema Mapping: Connects 'category' to its validation Schema
 * ============================================================
 */
const ASSET_SCHEMAS = {
  // Assets - Cash
  'Cash_Bank': BankAccountSchema,
  'Cash_Physical': PhysicalCashSchema,
  'Cash_TermDeposit': TermDepositSchema,
  
  // Assets - Investments
  'Invest_Shares': SharesSchema,
  'Invest_ManagedFund': ManagedFundSchema,
  'KiwiSaver': KiwiSaverSchema,
  
  // Assets - Physical
  'Property': PropertySchema,
  'Vehicle': VehicleSchema,
  'Other_Asset': OtherAssetSchema,
  
  // Liabilities
  'Mortgage': MortgageSchema,
  'Loan_Personal': PersonalLoanSchema,
  'Loan_Student': StudentLoanSchema,
  'Credit_Card': CreditCardSchema,
  'Other_Liability': OtherLiabilitySchema,
};

/**
 * ============================================================
 * Level 1: Main Schema (Root)
 * ============================================================
 */
const FinancialAssetSchema = new mongoose.Schema(
  {
    // --- Identity & References ---
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },

    source_product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: false,
      index: true,
      description: "Links to Marketplace Product if purchased/adopted",
    },

    name: {
      type: String,
      required: [true, 'Please add an asset name'],
      trim: true,
    },

    // --- Classification ---
    record_type: {
      type: String,
      required: true,
      enum: ['Asset', 'Liability'],
      index: true,
    },

    category: {
      type: String,
      required: true,
      enum: [
        // Assets - Cash
        'Cash_Bank',
        'Cash_Physical',
        'Cash_TermDeposit',
        
        // Assets - Investments
        'Invest_Shares',
        'Invest_ManagedFund',
        'KiwiSaver',
        
        // Assets - Physical
        'Property',
        'Vehicle',
        'Other_Asset',
        
        // Liabilities
        'Mortgage',
        'Loan_Personal',
        'Loan_Student',
        'Credit_Card',
        'Other_Liability',
      ],
      index: true,
    },

    // --- Value ---
    value: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Value must be positive'],
    },

    currency: {
      type: String,
      default: 'NZD',
    },

    is_liquid: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
      description: "Used by AI to calculate Available Funds vs Net Worth",
    },

    // --- Polymorphic Details (The Magic Pocket) ---
    asset_details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      description: "Stores category-specific attributes validated by middleware",
    },
  },
  {
    timestamps: { 
      createdAt: 'created_at', 
      updatedAt: 'updated_at',
    },
  }
);

/**
 * ============================================================
 * Validation Middleware (The Guard)
 * Ensures 'asset_details' matches the rules of the selected 'category'.
 * ============================================================
 */
FinancialAssetSchema.pre('validate', async function() {
  const SpecificSchema = ASSET_SCHEMAS[this.category];

  if (SpecificSchema && this.asset_details && Object.keys(this.asset_details).length > 0) {
    // Create a temporary model to validate against the specific schema
    const modelName = `Temp_${this.category}_Validator`;
    
    // Avoid re-compiling if model already exists
    const DummyModel = mongoose.models[modelName] || mongoose.model(modelName, SpecificSchema);
    const dummyDoc = new DummyModel(this.asset_details);
    
    const error = dummyDoc.validateSync();
    if (error) {
      throw new Error(`Validation failed for category '${this.category}': ${error.message}`);  
    }
  }
  
});

/**
 * ============================================================
 * Indexes (Query Optimization)
 * ============================================================
 */

// Dashboard: "Show all assets/liabilities grouped by category"
FinancialAssetSchema.index({ user_id: 1, record_type: 1, category: 1 });

// Liquidity check: "Show all liquid assets for emergency fund calculation"
FinancialAssetSchema.index({ user_id: 1, is_liquid: 1 });

export default mongoose.model('FinancialAsset', FinancialAssetSchema);
