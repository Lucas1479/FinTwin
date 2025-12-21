import mongoose from 'mongoose';

// --- 1. Asset Allocation (资产配置) ---
// Adopting "Aggregation + Details" dual-layer structure, convenient for frontend pie charts and AI deep analysis (采用 "聚合 + 详情" 的双层结构，既方便前端饼图展示，又方便 AI 深度分析)
const AssetAllocationSchema = new mongoose.Schema({
  // Aggregation Layer (For UI Charts) (聚合层)
  cash: { type: Number, default: 0 },
  bonds: { type: Number, default: 0 },          // NZ Fixed + Int Fixed
  equities: { type: Number, default: 0 },       // Australasian + Int Equities
  property: { type: Number, default: 0 },       // Listed + Unlisted
  other: { type: Number, default: 0 },          // Commodities + Other
  
  // Details Layer (For AI Analysis - Optional/Nullable) (详情层)
  details: {
    nzFixedInterest: Number,
    intlFixedInterest: Number,
    australasianEquities: Number,
    intlEquities: Number,
    unlistedProperty: Number
  }
}, { _id: false });

// --- 2. Metrics: Risk, Return, Fees (核心指标) ---
// Risk Level Mapping (风险等级映射):
//   1 -> Defensive/Cash (0-10% Growth, <2Y Horizon)
//   2-3 -> Conservative (10-35% Growth, 2-5Y Horizon)
//   4 -> Balanced (50% Growth, 5-10Y Horizon, Default)
//   5 -> Growth (80% Growth, 10+Y Horizon)
//   6-7 -> Aggressive (90-100% Growth, 15+Y Horizon)
// NOTE: Risk Indicator (1-7) is a mandatory calculation based on 5-year volatility.
//       We rely on this number as the source of truth for AI matching logic, rather than fund name.
const MetricsSchema = new mongoose.Schema({
  riskScore: { type: Number, min: 1, max: 7, required: true }, // FMA Risk Indicator (1-7) based on 5-year volatility (基于5年波动率的强制性风险指标)
  
  // Fee Structure (费用结构)
  fees: {
    total: { type: Number, required: true },    // Total Annual Fund Fees (%) - Core field for AI price comparison (AI 核心比价字段)
    performance: { type: Number, default: 0 },  // Performance-based Fees (%)
    admin: { type: Number, default: 0 }         // Other admin charges ($ or %)
  },
  
  // Return Performance (Net Return %) (收益表现)
  returns: {
    y1: Number,
    y3: Number, // Pipeline needs to calculate or leave empty (Pipeline 需自行计算或留空)
    y5: Number, // Average 5 Yrs Return Net
    benchmark_y1: Number // Market Index 1y (Used for calculating excess return Alpha) (用于计算超额收益 Alpha)
  }
}, { _id: false });

// --- 3. Top 5 Holdings (前5大持仓) ---
// Reduced from Top 10 for storage efficiency; Top 5 is sufficient for concentration analysis
const HoldingSchema = new mongoose.Schema({
  name: String,
  percent: Number, // Percentage of Net Assets (占净资产百分比)
  type: String,    // e.g. "NZ_FIXED_INTEREST"
  country: String  // e.g. "NZ", "US"
}, { _id: false });

// --- 4. Main Schema: Product (主 Schema: Product) ---
const productSchema = new mongoose.Schema({
  // --- Identity Information (身份信息) ---
  name: { type: String, required: true, trim: true, index: true },
  code: { type: String, sparse: true }, // Fund Number / ISIN
  provider: { type: String, required: true }, // Manager / Issuer
  description: String,
  websiteUrl: String, // Product detail page URL (if any) (产品详情页链接)

  // --- Taxonomy (分类体系) ---
  category: {
    type: String,
    enum: ['KiwiSaver', 'Fund', 'TermDeposit'], // Physical form classification (物理形态分类)
    required: true,
    index: true
  },
  type: {
    type: String,
    // Functional attribute classification (AI Tagging) (功能属性分类)
    // Active/Index for Funds; FixedTerm/Savings for Term Deposits (Active/Index 用于基金; FixedTerm/Savings 用于定存)
    enum: ['Active', 'Index', 'ETF', 'FixedTerm', 'Savings'], 
    default: 'Active'
  },
  strategy: {
    type: String,
    // Risk appetite classification derived from riskScore (风险偏好分类，由 riskScore 映射)
    // Defensive(1) | Conservative(2-3) | Balanced(4) | Growth(5) | Aggressive(6-7)
    enum: ['Defensive', 'Conservative', 'Balanced', 'Growth', 'Aggressive'],
    index: true
  },

  // --- Core Data Blocks (核心数据块) ---
  metrics: MetricsSchema,
  allocation: AssetAllocationSchema,
  topHoldings: [HoldingSchema],

  // --- Special Product Details (Polymorphic Fields) (特殊产品详情) ---
  // Term Deposit specific fields (Term Deposit 特有字段)
  termDepositDetails: {
    termLengthMonths: Number, // Term Length (Months) (期限)
    interestRate: Number,     // Annual Interest Rate (%) (年化利率)
    minDeposit: Number,       // Minimum Deposit Amount (起存金额)
    payoutFrequency: String   // e.g. "Monthly", "At Maturity"
  },

  // --- Metadata (元数据) ---
  lastUpdated: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true } // Soft delete flag (软删除标记)

}, { timestamps: true });

// --- Compound Index for Query Optimization (复合索引优化查询) ---
// Scenario: "Find all KiwiSaver with risk <= 3 and lowest fees" (场景: "查找所有风险<=3且费率最低的KiwiSaver")
productSchema.index({ category: 1, 'metrics.riskScore': 1, 'metrics.fees.total': 1 });
// Scenario: "Find Growth funds with highest 5-year return" (场景: "查找过去5年回报最高的Growth基金")
productSchema.index({ strategy: 1, 'metrics.returns.y5': -1 });

export default mongoose.model('Product', productSchema);
