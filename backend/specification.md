# FinTwin Technical Specification & Logic

> **Version**: 1.3
> **Scope**: Core Business Logic & Algorithms
> **Audience**: AI Agents (RAG), Backend Developers

---

## 1. Wealth Center Module

The Wealth Center acts as the **Data Foundation** for the FinTwin ecosystem. It aggregates all user assets and liabilities to calculate Net Worth, Liquid Capital, and Risk Exposure. This data directly feeds into the Goal Engine and Simulation modules.

### 1.1 Core Definitions & Calculations

**[DOC_ANCHOR: WEALTH_CORE_DEFINITIONS]**

The system tracks financial health through two primary metrics, updated in real-time as users modify their ledger.

#### Net Worth
The absolute measure of financial position.
$$ \text{Net Worth} = \sum (\text{Assets}) - \sum (\text{Liabilities}) $$

- **Update Frequency**: Real-time (upon any CRUD operation on assets/liabilities).
- **Historical Tracking**: Snapshots are taken daily to generate the "Net Worth History" trendline (visible in Dashboard).

#### Liquid Capital (Available Funds)
A subset of Net Worth representing funds accessible for **immediate** use or Short/Medium-term Goal allocation. This excludes illiquid assets like Property, Vehicles, or locked KiwiSaver funds.

**[DOC_ANCHOR: LIQUID_CAPITAL_STRUCTURE]**

$$ \text{Liquid Capital} = \text{Spendable (Cash)} + \text{Allocated (Working Investments)} $$

**Breakdown of Use:**
1.  **Spendable (Unallocated)**: Pure cash holdings (e.g., Bank Accounts, Physical Cash). These are funds with zero friction and zero market risk, ready for immediate deployment or emergency use.
2.  **Allocated (Working Capital)**: Liquid investments (e.g., Managed Funds, ETFs) or assets explicitly linked to a specific Goal. While these can be sold quickly, they are considered "busy" working towards your objectives and are not "idle cash."

- **Default Liquid Assets**: `Cash_Bank`, `Cash_Physical`, `Invest_Shares`.
- **Default Illiquid Assets**: `Property`, `KiwiSaver`, `Cash_TermDeposit`, `Vehicle`.

**[DOC_ANCHOR: LIQUIDITY_TIER_ANALYSIS]**

#### Liquidity Tiers (Chart Analysis)
While `Liquid Capital` is a binary available/unavailable metric for calculations, the Liquidity Analysis Charts categorize assets into three distinct tiers based on **allocatability**:

1.  **Liquid (Immediate Access)**
    - *Definition*: Cash or equivalents available within 24 hours with zero value loss.
    - *Components*: `Cash_Bank`, `Cash_Physical`.
    - *Primary Use*: Emergency Fund, Daily Expenses, Short-term Goals (< 1 year).

2.  **Semi-Liquid (Marketable Securities)**
    - *Definition*: Assets that can be sold relatively quickly (T+2 settlement) but carry **Market Risk** or **Conversion Friction**.
    - *Components*: `Invest_Shares`, `Invest_ManagedFunds`, `Crypto`.
    - *Nuance*: While technically "liquid", converting these for short-term spending is often suboptimal due to market volatility or tax events.
    - *Primary Use*: Medium-term Goals (1-5 years), Wealth Accumulation.

3.  **Locked / Illiquid (Restricted)**
    - *Definition*: Assets that cannot be accessed without specific trigger events (Age, Sale of Property) or carry significant penalties.
    - *Components*: 
        - `KiwiSaver`: Locked until Age 65 or First Home purchase.
        - `Property`: Requires months to sell; high transaction costs.
        - `Cash_TermDeposit`: Locked until Maturity Date.
        - `Vehicle`: Depreciating use-assets, generally not considered investment capital.
    - *Primary Use*: Long-term Goals (Retirement), Lifestyle utility (Home/Car).

---

### 1.2 Asset & Liability Classification

**[DOC_ANCHOR: WEALTH_ASSET_CLASSES]**

FinTwin uses a polymorphic schema where each category enforces specific data validation rules (`asset_details`).

#### A. Cash & Banking
- **Cash_Bank**: Standard operating accounts. Supports Interest Rate fields for daily accrual.
- **Cash_TermDeposit**: Locked funds with a specific `maturity_date`.
    - *System Logic*: The system automatically triggers a **Maturity Reminder** 30 days before `maturity_date`.
- **Cash_Physical**: Cash on hand or foreign currency holdings.

#### B. Investment Vehicles
- **KiwiSaver**: NZ-specific retirement scheme.
    - *Constraint*: Funds are strictly **locked** until Age 65 (Retirement Goal) or First Home Purchase.
    - *Risk Profiling*: Mapped to standard profiles (Defensive to Aggressive).
- **Invest_Shares / Managed Funds**: Market-linked assets.
    - *Valuation*: Currently manual or API-linked.
    - *Currency*: Supports multi-currency (e.g., USD stocks are converted to NZD for Net Worth using daily spot rates).

#### C. Physical Assets
- **Property**: Real estate holdings.
    - *Linkage*: Can be explicitly linked to a `Mortgage` liability to calculate **LVR (Loan-to-Value Ratio)** per property.
- **Vehicle**: Depreciating assets.

#### D. Liabilities (Debt)
- **Mortgage**:
    - *Refix Logic*: Tracks `fixed_until` date. System triggers alerts for "Mortgage Refixing" 30 days prior to expiry.
- **Loan_Student**:
    - *NZ Specifics*: Treated as 0% interest debt if `is_nz_student_loan` is true (Domestic students).
- **Credit_Card**: High-interest revolving debt.

---

### 1.3 Financial Health Ratios

**[DOC_ANCHOR: FINANCIAL_RATIOS_LVR]**

#### Loan-to-Value Ratio (LVR)
Used primarily for Property analysis to assess leverage risk.

$$ \text{LVR} = \frac{\text{Outstanding Mortgage Balance}}{\text{Property Market Valuation}} \times 100 $$

- **Healthy Range**: < 80% (Standard Bank Requirement).
- **Risk Threshold**: > 80% triggers warnings about potential Low Equity Premiums (LEP) or refinancing difficulties.
- **Context**: The AI uses this to recommend debt repayment strategies over investing if LVR is critically high.

**[DOC_ANCHOR: FINANCIAL_RATIOS_DSR]**

#### Debt Service Ratio (DSR)
Measures the percentage of income committed to debt repayment.

$$ \text{DSR} = \frac{\text{Total Monthly Debt Repayments}}{\text{Total Monthly Net Income}} \times 100 $$

- **Healthy Range**: < 30-35%.
- **Critical Threshold**: > 40%. The Simulation Engine will flag "High Insolvency Risk" if DSR exceeds this during stress tests (e.g., interest rate hikes).

---

### 1.4 Interest & Cash Flow Synchronization

**[DOC_ANCHOR: WEALTH_INTEREST_LOGIC]**

The system employs a "Sync" mechanism (`syncCashAssets`) that reconciles static asset values with dynamic Cash Flow events.

1.  **Daily Interest Accrual**:
    - For `Cash_Bank` and `Cash_TermDeposit`, interest is calculated daily as:
    $$ \text{Daily Interest} = \text{Principal} \times \frac{\text{Annual Rate}}{365} $$
    - *Note*: This is currently calculated as Simple Interest during the sync period, not continuous compounding.

2.  **Maturity Logic**:
    - **Term Deposits**: When `maturity_date` is reached, the asset is logically "unlocked" (becomes Liquid) unless `auto_rollover` is set to true.
    - **Mortgages**: When `fixed_until` expires, the loan reverts to `Floating` rate logic unless refixed.

---

## 2. Cash Flow Engine

The Cash Flow Engine is the dynamic counterpart to the Wealth Center. While Wealth tracks *stock* (what you have), Cash Flow tracks *flow* (what comes in and out). It is the primary driver for the **Evolution Engine** (Time Machine).

### 2.1 Core Metrics

**[DOC_ANCHOR: CASH_FLOW_METRICS]**

#### Monthly Surplus (Free Cash Flow)
The critical metric determining how much capital is available for *new* goals or wealth acceleration.

$$ \text{Surplus} = \text{Total Income} - (\text{Living Expenses} + \text{Committed Investments}) $$

- **Interpretation**: A positive surplus means the user is building wealth. A negative surplus indicates "burning capital" (eating into savings).
- **Nuance**: `Investments` (e.g., automatic transfers to Sharesies) are treated as *outflows* from the Cash Account, even though they increase Net Worth.

#### Savings Rate
$$ \text{Savings Rate} = \frac{\text{Net Flow (Income - Expenses)}}{\text{Total Income}} \times 100\% $$

- **Benchmark**: FinTwin considers > 20% as "Healthy" and > 50% as "Aggressive/FIRE".

**[DOC_ANCHOR: CASH_FLOW_INCOME_TYPES]**

#### Active vs. Passive Income Analysis
The Cash Flow engine strictly categorizes income sources to track progress toward Financial Independence (FIRE).

1.  **Active Income (Time-Dependent)**
    - *Definition*: Income generated by direct labor or employment. If you stop working, this income stops.
    - *Examples*: Salary, Hourly Wages, Contract Fees.
    - *Role*: The primary engine for building initial capital.

2.  **Passive Income (Asset-Dependent)**
    - *Definition*: Income generated by assets without active daily involvement.
    - *Examples*: Dividends, Bank Interest, Rental Income (net), Royalties.
    - *System Logic*: 
        - Users can manually tag income as `is_passive`.
        - The system *automatically* generates passive income entries for assets with defined interest rates (e.g., Term Deposits).

#### Financial Independence (FI) Ratio
This chart metric tracks how much of your lifestyle is funded by your assets.

$$ \text{FI Ratio} = \frac{\text{Total Passive Income}}{\text{Total Living Expenses}} \times 100\% $$

- **0 - 10%**: **Reliance Phase**. You are entirely dependent on your job.
- **50%**: **Security Phase**. Assets cover basic survival needs (Rent/Food).
- **> 100%**: **Financial Independence**. Work becomes optional.

---

### 2.2 Frequency Normalization

**[DOC_ANCHOR: CASH_FLOW_NORMALIZATION]**

To reconcile diverse financial cadences (e.g., Weekly wages vs Monthly rent), the system normalizes all flows to an **Annual Base** before converting to the requested view.

| Frequency | Annual Multiplier | Notes |
| :--- | :--- | :--- |
| Weekly | 52 | Standard 52-week year |
| Fortnightly | 26 | Common NZ pay cycle |
| Monthly | 12 | Standard billing cycle |
| Yearly | 1 | Insurance premiums, Rates |
| One-Off | 0 | Excluded from recurring forecasts |

---

### 2.3 Cash Flow Forecast (Short-Term Projection)

**[DOC_ANCHOR: CASH_FLOW_PROJECTION_LOGIC]**

**Distinction**: Unlike the *Time Machine* (which projects years into the future), the Cash Flow Forecast focuses on the **Next 30 Days** (or Monthly Average).

**Forecast vs Actual View**:
1.  **Actual View**: Based on historical, verified transactions imported from bank feeds. It shows what *really* happened.
2.  **Forecast View**: A forward-looking projection based on your **Cash Flow Rules** (Recurring Income/Expenses). It shows what *should* happen in the coming weeks if your budget is followed.

**Projection Modes**:
The system uses two distinct timing modes to generate daily cash flow curves (seen in the "Calibration" charts):

1.  **Discrete Events (`Specific_Date`)**
    - *Use Case*: Salary, Rent, Mortgage Payments.
    - *Algorithm*: The flow occurs *only* on the specific `anchor_date` (e.g., the 1st or 15th of the month).
    - *Visual*: Appears as sharp spikes in the daily net flow chart.

2.  **Continuous Flow (`Daily_Spread`)**
    - *Use Case*: Groceries, Fuel, Entertainment.
    - *Algorithm*: The annual amount is divided by 365 to create a smooth daily "burn rate".
    - *Visual*: Appears as a constant baseline level (the "cost of existing").

---

### 2.4 The Evolution Engine (Time Machine)

**[DOC_ANCHOR: MARKET_SIMULATION_MODELS]**

The "Time Machine" is a client-side simulation that projects current Wealth + Cash Flow into the future (up to 20 years).

#### Deterministic Randomness
To ensure a consistent user experience (UX), the simulation uses a **Seeded Random Number Generator** (Mulberry32).
- *Effect*: If a user refreshes the page, the "random" market fluctuations remain identical. They only change if the user alters inputs (e.g., changes Risk Profile).

#### Market Conditions (Scenarios)
Users can toggle "Market Modes" to stress-test their strategy. These apply offsets to the Base Return Rate (7% default):

| Mode | Return Offset | Effective Return (Approx) |
| :--- | :--- | :--- |
| **Bull** | +5% | ~12% p.a. |
| **Neutral** | 0% | ~7% p.a. |
| **Bear** | -10% | ~ -3% p.a. |

- **Volatility**: In addition to the base trend, the engine applies a monthly random fluctuation (Noise) of ±2% to simulate market jitter.

#### Asset Evolution Rules
1.  **Cash**: Grows by `Surplus` + `Interest Rate` (Compounded Monthly).
2.  **Liabilities**: Mortgages amortize linearly over a standard 25-year curve (simplified for simulation speed).
3.  **Investments**: Grow by `Market Return` + `Monthly Contributions`.

---

## 3. Dashboard & Visualization Logic

The Dashboard serves as the "Cockpit" for the Financial Digital Twin. While many elements are interactive widgets, the core visualizations follow strict data representation rules.

### 3.1 Goal Heatmap (Squarified Treemap)

**[DOC_ANCHOR: DASHBOARD_HEATMAP_LOGIC]**

The `GoalHeatmapWidget` visualizes the user's Net Worth through the lens of their Life Goals.

#### 1. Area Represents Value
The surface area of each rectangular block is mathematically proportional to the **Current Market Value** of the assets contained within it.
- *Visual Insight*: Users can instantly assess which Goals are "Capital Heavy" (e.g., Retirement) vs "Capital Light".

#### 2. Hierarchical Grouping (Goal-First)
Unlike a standard asset class view, this map groups assets by their **Assigned Goal**.
- *Container*: The outer boundary represents a single Goal (e.g., "Retirement").
- *Items*: Inside the container, individual assets (e.g., "KiwiSaver", "Growth Fund") are nested.
- *Color Coding*: Each Goal group is assigned a distinct theme color to visually separate objectives.

#### 3. Dynamic Typography
To maintain legibility, font sizes for asset labels are dynamically calculated based on the tile's surface area. Small tiles may hide labels entirely to reduce clutter.

---

### 3.2 Funding Flow (Surplus Allocation)

**[DOC_ANCHOR: DASHBOARD_FUNDING_FLOW]**

The `FundingFlowWidget` (Donut Chart) answers the question: *"Where is my monthly surplus going?"*

#### 1. Focus on Surplus, Not Income
Crucially, this chart **excludes** Living Expenses. It only visualizes the `Pre-Investment Surplus` (Income - Living Expenses).

#### 2. The "Green Slice" (Free Cash)
- **Definition**: The portion of surplus that is *not* currently assigned to any investment plan.
- **Color**: Emerald Green (`#10b981`).
- **Strategic Insight**: This represents **Unused Potential**. A large green slice suggests the user is hoarding cash in a bank account rather than deploying it towards goals.

#### 3. Investment Slices
- **Definition**: Committed monthly contributions to specific goals/products.
- **Visual**: Each slice corresponds to an active `Investment` cash flow item.

---

### 3.3 The Digital Twin "Pulse" (Health Score)

**[DOC_ANCHOR: DASHBOARD_HEALTH_SCORE]**

The central "Health Score" (0-100) is a composite metric derived from three weighted pillars:

1.  **Solvency (40%)**: Based on Net Worth and LVR.
    - *Penalty*: High Debt (LVR > 80%) drastically reduces this component.
2.  **Liquidity (30%)**: Based on Emergency Fund coverage.
    - *Target*: 3-6 months of expenses in Liquid Assets.
3.  **Growth (30%)**: Based on Savings Rate and Goal Feasibility.
    - *Bonus*: High Savings Rate (>20%) boosts this score.

---

## 4. Goal Engine: The GBI-MPT Translation Layer

**[DOC_ANCHOR: GOAL_ENGINE_PHILOSOPHY]**

The Goal Engine is the architectural brain of FinTwin. It translates human desires into financial mathematics. 

### Core Philosophy: Gamma over Alpha
FinTwin is built on the principle of **Gamma ($\gamma$) Revenue**.
- **No Alpha ($\alpha$) Chasing**: We do not attempt to "beat the market" through stock picking, market timing, or complex derivatives. There is no real-time trading capability.
- **Focus on Gamma ($\gamma$)**: Value is generated through **Rational Resource Management**:
    1.  **Goal Alignment**: Ensuring assets match the time horizon of the goal.
    2.  **Tax Efficiency**: Optimizing PIR and fund selection.
    3.  **Behavioral Coaching**: Preventing panic selling during volatility (via Risk DNA).

### Phase 1: Translation (GBI Logic)
*Tech Implementation: Stage 'Definition' & 'Strategy'*

The engine converts abstract user intent into concrete financial constraints.
- **Input**: "I want to retire at 65 comfortably."
- **GBI Transformation**:
    - *Time Horizon*: 30 years ($T=30$)
    - *Target Corpus*: $1.2M (Inflation-adjusted future value)
    - *Liquidity Constraint*: High (KiwiSaver locked until 65)
    - *Risk Capacity*: High (Long horizon allows recovery from volatility)

### Phase 2: Allocation (MPT Logic)
*Tech Implementation: Stage 'Strategy' & 'Product'*

Once constraints are defined, the engine applies Modern Portfolio Theory (MPT) not to maximize speculative returns, but to **minimize uncompensated risk**.
- **Efficiency, not Speculation**: The system constructs a diversified portfolio that sits on the "Efficient Frontier" to ensure the user is not taking unnecessary risk for their required return.
- **Target Vector Construction**: Based on the GBI constraints, the system defines an ideal exposure, e.g., `{ Growth: 70%, Defensive: 30% }`.
- **Product Matching**: The Portfolio Optimizer searches the Marketplace for managed funds (not individual stocks) that structurally match this vector.

### Phase 3: Feasibility (Simulation Logic)
*Tech Implementation: Stage 'Simulation'*

Finally, the engine stress-tests the allocation against the GBI targets.
- **Feasibility Score**: A 0-100 probability metric.
    $$ \text{Score} = P(\text{Portfolio Value} \ge \text{Target Cost}) $$
- **Gap Analysis**: If the Score < 100%, the engine solves for the missing variable:
    - *Savings Gap*: "Increase monthly contribution by $X"
    - *Time Gap*: "Delay retirement by Y years"
    - *Return Gap*: "Increase risk profile (if capacity allows)"

---

## 5. Marketplace & Portfolio Engine

The Marketplace is not just a catalog; it is an intelligent engine that constructs compliant investment portfolios using the **Aggregation-Optimization** pattern.

### 5.1 Product Taxonomy & Risk

**[DOC_ANCHOR: MARKETPLACE_TAXONOMY]**

Products are strictly classified to ensure regulatory compliance (especially for KiwiSaver) and accurate risk matching.

#### 1. Category (Legal Structure)
- **KiwiSaver**: Government-regulated retirement funds.
    - *Constraint*: Funds cannot be withdrawn until Age 65 or First Home.
    - *Benefits*: Includes Employer Contributions (3%) and Government Credits.
- **Managed Funds**: Open-ended investment trusts. Liquid (T+2 days).
- **Term Deposits**: Fixed-interest bank products. Illiquid until maturity.

#### 2. Risk Score (1-7 Scale)
FinTwin adopts the standard industry risk indicator derived from 5-year annualized volatility.
- **1 (Defensive)**: Cash & Bonds. Minimal volatility.
- **2-3 (Conservative)**: <35% Growth Assets. 2-5 year horizon.
- **4 (Balanced)**: ~50% Growth Assets. 5-10 year horizon.
- **5 (Growth)**: ~80% Growth Assets. 10+ year horizon.
- **6-7 (Aggressive)**: 90-100% Growth Assets. High volatility tolerance required.

---

### 5.2 Asset Allocation Model

**[DOC_ANCHOR: ASSET_ALLOCATION_MODEL]**

To simplify complex fund holdings for AI analysis, FinTwin uses a **Three-Pillar Aggregation Model**:

1.  **Growth Assets** (`Equities` + `Property`)
    - The engine for long-term wealth compounding. High volatility.
2.  **Defensive Assets** (`Bonds` + `Fixed Interest`)
    - The stabilizer. Reduces portfolio drawdowns during market corrections.
3.  **Liquidity** (`Cash`)
    - The buffer. Ensures short-term obligations can be met without selling assets at a loss.

*Optimization Logic*: The Portfolio Engine treats these three pillars as the "Target Vector". For example, a "Balanced" user target is `{ Growth: 50%, Defensive: 40%, Cash: 10% }`.

---

### 5.3 The Portfolio Optimizer

**[DOC_ANCHOR: PORTFOLIO_OPTIMIZATION_LOGIC]**

When the AI recommends a portfolio, it does not guess. It uses a deterministic **Gradient Optimization Algorithm** (`optimize_portfolio_weights`) to construct the mathematical ideal.

#### How it Works:
1.  **Candidate Selection**: The system fetches top-rated products across all 3 asset classes (Growth/Defensive/Cash).
2.  **Strategy Application**: It selects products based on user preference:
    - *Lowest Cost Strategy*: Minimizes total Weighted Average Management Fee.
    - *Diversified Strategy*: Maximizes the number of distinct Providers (issuers) to reduce institutional risk.
3.  **Weight Solver**: The algorithm iteratively adjusts the % weight of each selected product until the total portfolio exposure matches the User's Target Vector (within ±5% tolerance).

#### Why this matters:
This ensures that if a user wants a "60/40" portfolio, the AI creates exactly that, even if the underlying funds are "55/45" or "70/30". It mixes them mathematically to achieve the precise target.

---

## 6. User Profile & Risk DNA

The User Profile is the metadata layer that governs all AI decisions. It is not just biographical data; it acts as a set of **hard constraints** and **soft preferences** for the Goal & Simulation engines.

### 6.1 Risk Profiling (The DNA)

**[DOC_ANCHOR: USER_RISK_PROFILE]**

FinTwin defines a user's financial personality through a composite "Risk DNA" rather than a single label.

#### Risk Tolerance (Psychological)
Mapped to `riskProfile.level` (e.g., "Growth").
- Determines the **Target Asset Allocation** for goals (e.g., Growth = 80% Equities).
- Collected via the Onboarding Quiz ("What would you do if the market drops 20%?").

#### Volatility Tolerance (Statistical)
Mapped to `riskProfile.volatilityTolerance` (e.g., 15%).
- A hard constraint for the Portfolio Optimizer. The AI will reject portfolios with historical volatility exceeding this threshold, even if they offer higher returns.

#### Drawdown Capacity (Financial)
Mapped to `riskProfile.maxDrawdown` (e.g., -20%).
- Used in Stress Testing simulations. If a "Bear Market" scenario triggers a drop larger than this, the AI will issue a "Risk Warning".

### 6.2 Household & Tax Structure

**[DOC_ANCHOR: USER_HOUSEHOLD_CONTEXT]**

#### Household Status
- **Single**: Standard analysis.
- **Partnered/Family**:
    - *Assumption*: "Dual Income Potential" (unless specified otherwise).
    - *Impact*: Increases Emergency Fund requirements (more dependents = larger buffer needed).

#### Compliance Settings
- **PIR (Prescribed Investor Rate)**: The tax rate applied to PIE funds (KiwiSaver/Managed Funds).
    - *Defaults*: 28% (standard), but can be 10.5% or 17.5% for lower incomes.
    - *AI Role*: The AI uses this to calculate **Net Returns** (After-Tax) for accurate projections.
- **KiwiSaver Contribution**:
    - *Impact*: Directly affects the "Employment Income" cash flow projections.
    - *Employee Match*: The AI automatically calculates the employer's 3% match (taxed at ESCT rates) as "Free Money".

### 6.3 Allocation Preferences

**[DOC_ANCHOR: USER_ALLOCATION_PREFS]**

Users explicitly define their strategy via `allocation.debtVsInvest`.

1.  **Aggressive Debt**:
    - *AI Behavior*: Prioritizes paying down High-Interest Debt (Credit Cards) and Mortgage Principal over investing.
    - *Surplus Routing*: Surplus -> Debt Repayment.
2.  **Balanced**:
    - *AI Behavior*: Splits surplus between Debt (to meet minimums) and Investing (for growth).
3.  **Aggressive Invest**:
    - *AI Behavior*: Prioritizes High-Growth Assets, assuming returns > mortgage interest rates.
    - *Surplus Routing*: Surplus -> Growth Funds / ETFs.

---

## 7. Playground & Simulation Engine

The Playground is an interactive "Sandbox" that allows users to perform "What-If" analysis without affecting their core financial plan. It uses stochastic modeling to predict outcomes under uncertainty.

### 7.1 Background Scenarios (Shadow Profiles)

**[DOC_ANCHOR: PLAYGROUND_SCENARIOS]**

To test hypothetical situations safely, users can create **Backgrounds**.
- *Concept*: A "Shadow Profile" that inherits from the real User Profile but allows specific variables to be overridden.
- *Use Case*: "What if I get a pay rise?" or "What if inflation hits 5%?"
- *Persistence*: Scenarios are saved independently, preserving the integrity of the live data.

### 7.2 Monte Carlo Simulation

**[DOC_ANCHOR: MONTE_CARLO_LOGIC]**

Unlike the deterministic "Time Machine" (which shows one path), the Playground uses a **Monte Carlo Engine** to simulate 100 possible futures.

#### The Algorithm
1.  **Volatility Injection**: Instead of a fixed return, the engine applies random monthly variance based on a Normal Distribution (Gaussian).
    $$ \text{Return} = \mu + \sigma \times \mathcal{N}(0,1) $$
    *(Where $\mu$ is expected return and $\sigma$ is volatility derived from asset exposure)*
2.  **Iteration**: The simulation runs 100 independent lifecycles.
3.  **Percentile Ranking**: The output generates three curves:
    - **Optimistic (90th percentile)**: "Lucky" market conditions.
    - **Median (50th percentile)**: The most likely outcome.
    - **Pessimistic (10th percentile)**: A bad sequence of returns (Sequence Risk).

### 7.3 Success Probability

**[DOC_ANCHOR: SIMULATION_SUCCESS_PROB]**

The core metric for decision-making.
$$ P(\text{Success}) = \frac{\text{Count of Iterations where Final Balance } \ge \text{Target}}{\text{Total Iterations (100)}} $$

- **Safe Zone**: > 85% probability.
- **Risky Zone**: < 70%. The AI will suggest increasing contributions or reducing the target amount.

### 7.4 Nominal vs. Real Returns

**[DOC_ANCHOR: INFLATION_ADJUSTMENT]**

The simulator allows toggling `isInflationAdjusted`.
- **Nominal Return**: Raw numbers. Looks impressive but misleading over long horizons.
- **Real Return**: Adjusted for purchasing power.
    $$ \text{Real Return} \approx \text{Nominal Return} - \text{Inflation Rate} $$
- *Default*: The AI defaults to **Real Returns** (Inflation-Adjusted) to give users a realistic view of future buying power.
