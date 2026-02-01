# FinTwin: Goal-Based AI Financial Planning System

## Abstract

FinTwin is a goal-based financial planning platform that combines Large Language Models with mathematical optimization algorithms to provide transparent, personalized investment recommendations. Unlike traditional asset-centric approaches, FinTwin organizes all financial decisions around user-defined goals (retirement, home purchase, education, wealth growth), automatically allocating resources, managing conflicts, and tracking progress toward each specific objective. The system implements a four-stage AI decision pipeline where LLMs handle reasoning and context analysis while deterministic algorithms execute financial calculations.

**Goal-Based Investment Philosophy**: Every financial decision is linked to a specific life goal with defined timeline, target amount, and risk tolerance. The system prevents resource conflicts (double-counting assets), tracks goal-specific performance, and provides clear progress visualization. This approach delivers more meaningful advice than generic portfolio recommendations.

**Neuro-Symbolic Approach**: LLMs handle natural language understanding and contextual reasoning (neural), while mathematical algorithms execute portfolio optimization and Monte Carlo simulation (symbolic). This separation ensures explainability, auditability, and mathematical correctness.

**Key Innovations**: 
- **Goal-Centric Design**: All assets, cash flows, and portfolios linked to specific life goals with automatic conflict resolution
- **Hybrid AI**: Function-calling architecture bridging LLM reasoning and algorithmic computation
- **Complete Explainability**: Decision logs capturing thought process, rationale, and citations
- **Privacy-Preserving**: Three-layer privacy controls with granular data sharing management
- **Dynamic Forms**: AI-generated context-aware questionnaires with session isolation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Research Contributions](#research-contributions)
3. [System Architecture](#system-architecture)
4. [Core Features](#core-features)
5. [AI Engine Design](#ai-engine-design)
6. [Privacy and Explainability](#privacy-and-explainability)
7. [Technology Stack](#technology-stack)
8. [Installation](#installation)
9. [Data Models](#data-models)
10. [Development](#development)

---

## Project Overview

### Target Users

- Individual investors seeking AI-assisted financial planning
- Financial advisors requiring decision-support tools
- Researchers studying AI applications in finance and trustworthy AI systems

---

## Research Contributions

### 1. Goal-Based Investment Framework

**Innovation**: Full lifecycle goal management from definition to execution with automated resource allocation.

#### Goal-Centric Architecture
- **Asset Linking**: Each `FinancialAsset` can be linked to a specific goal via `asset_details.linked_goal_id`
- **Resource Conflict Prevention**: System tracks allocated assets across goals to prevent double-counting
- **Multi-Goal Optimization**: Linear programming allocates limited resources across competing goals
- **Progress Tracking**: Real-time visualization of goal progress, success probability, and projected outcomes

#### Lifecycle Management
1. **Goal Definition**: AI analyzes gap between current position and target
2. **Strategy Formulation**: Determines optimal contribution mix (lump sum vs. monthly)
3. **Product Allocation**: Automatically creates `FinancialAsset` records linked to goal when plan activated
4. **Continuous Monitoring**: Tracks performance, recalculates success probability, suggests adjustments

**Contrast with Traditional Approaches**:
- Traditional: "Here's a balanced portfolio for your risk profile"
- Goal-Based: "This retirement portfolio needs 73% growth exposure to achieve $1.025M by 2059 with 96% probability"

**User Value**: Users see exactly how each investment contributes to specific life goals, making financial planning more tangible and motivating.

### 2. Hybrid AI Architecture (Neuro-Symbolic Approach)

**Design Principle**: Separate AI reasoning from algorithmic computation for reliability and explainability.

#### LLM Component
- Natural language understanding of user goals
- Context-aware recommendation generation
- Document retrieval and synthesis (RAG)
- Intent classification (Ask vs. Auto mode)
- Function-calling to invoke computational tools

#### Algorithmic Component
- Portfolio optimization (gradient descent + greedy selection)
- Monte Carlo simulation (100 iterations with Box-Muller sampling)
- Multi-goal resource allocation (linear programming fallback)
- Cash flow calculations (deterministic arithmetic)

**Benefit**: LLM generates high-level strategy, algorithms execute precise calculations. Users can verify AI recommendations by inspecting the underlying mathematical models and optimization constraints.

### 3. Explainable AI (XAI) Decision System

**Innovation**: Full audit trail of AI reasoning process through structured decision logs.

#### Decision Logging Architecture
Every AI recommendation is persisted with:
- **Thought Process**: Step-by-step reasoning chain
- **Rationale**: Natural language explanation for end users
- **Evidence References**: Citations to regulatory documents (RAG sources)
- **Goal Snapshot**: Complete context at decision time
- **User Actions**: How user responded to recommendation (accepted/modified/rejected)

#### Model: `GoalDecisionLog`
Captures each step in the four-stage workflow (Definition, Strategy, Product, Simulation). Enables retrospective analysis of AI decision quality and user trust patterns.

**Use Cases**:
- Regulatory compliance audits
- Model improvement through feedback analysis
- User transparency ("Why did the AI recommend this?")

### 4. Privacy-First AI Architecture

**Challenge**: LLM APIs are third-party services; how to enable personalized advice while respecting data privacy?

#### Three-Layer Privacy Protection

**Layer 1: Global Sharing Control**
- User-level toggle: `privacy.shareWithAI` (boolean)
- If disabled, AI operates with only aggregate/anonymized data

**Layer 2: Granular Data Allowlist**
- Fine-grained control over data types sent to AI:
  - `financial_assets`, `income`, `debts`, `goals`, `cashflow`
- Example: User allows AI to see income but not specific asset holdings

**Layer 3: PII Sanitization**
- Automated scrubbing before LLM transmission:
  - Removes: `user_id`, `email`, `name`, `address`, `session_id`
  - Preserves: Financial values, ratios, and relationships
- Four sanitization modes: `none`, `pii_only`, `normalized`, `strict`

#### Request-Level Override
Chatbox interactions can temporarily override global settings:
- "Allow AI to see my full portfolio for this question only"
- Privacy context tracked per-request via middleware

**Academic Value**: First implementation of GDPR-style consent management for LLM-based financial advisory.

### 5. Intelligent Document Processing Pipeline

**Problem**: Raw PDF/DOCX extracts contain noise (headers, footers, tables of contents) that degrade RAG quality.

#### Automated Cleaning Pipeline

**Stage 1: Content Type Detection**
LLM-powered classification of text chunks into 8 types:
- `paragraph`, `table`, `list`, `figure_caption`, `table_of_contents`, `header_footer`, `metadata_section`, `other`

**Stage 2: Semantic Quality Filtering**
- LLM evaluates each chunk for:
  - `content_quality`: high/medium/low
  - `priority`: core concepts vs. edge cases
  - `topic`, `audience`, `keywords`
- Code-level enforcement: Force-filter TOC and headers regardless of LLM judgment

**Stage 3: Metadata Enrichment**
Auto-generates searchable attributes:
- Topic taxonomy (e.g., `kiwisaver`, `retirement_planning`, `investment_tax`)
- Document type (e.g., `guide`, `policy`, `calculation`)
- Structural features: `has_tables`, `has_numbers`, `has_examples`

#### Performance Metrics
- **Input**: 6 documents, 293 pages, 678 raw chunks
- **Output**: 501 high-quality chunks (73.9% retention)
- **Quality Distribution**: ~78% high quality, 22% medium quality
- **Processing Cost**: $0.036 USD (Gemini 1.5 Flash)
- **Processing Time**: 30 minutes (10 chunks/batch, 500ms delay)

**Research Impact**: Demonstrates feasibility of fully automated knowledge base curation for domain-specific RAG systems.

### 6. Function-Calling Portfolio Optimization

**Architecture**: AI determines user's investment goals → backend executes mathematical optimization.

#### Tool: `build_optimized_portfolios`

**Inputs**:
- `target_growth_pct`, `target_defensive_pct`, `target_liquidity_pct`
- `max_fees`, `is_retirement_goal`, `has_employment_income`

**Algorithm**:
1. Filter 1,092 products by risk, asset allocation, and category
2. Score candidates using distance metrics (Euclidean distance from target exposure)
3. Construct 3 portfolios via greedy optimization:
   - **Lowest Cost**: Minimize expense ratio
   - **Diversified**: Maximize provider count and asset class spread
   - **Balanced**: Optimize exposure accuracy with fee constraint
4. Refine weights using iterative optimization (gradient descent + random perturbation)

**Constraints**:
- Product weights: 5% ≤ w_i ≤ 70%
- Portfolio deviation: |actual - target| ≤ 13% per exposure category
- KiwiSaver requirement: Must include if retirement goal + employment income

**Output**: 3 ready-to-use portfolios with calculated exposures, total fees, and product weightings.

**Innovation**: Separates "AI reasoning" from "computational optimization" for reliability and auditability.

### 7. Multi-Goal Resource Allocation Engine

**Problem**: Users have N competing goals but finite capital (liquid assets + monthly surplus).

#### Allocation Strategy

**Phase 1: Linear Programming**
Optimize allocation across goals while satisfying:
- Monthly surplus ≥ Σ(monthly contributions)
- Liquid assets ≥ Σ(lump sum) + emergency buffer
- Debt servicing already deducted from surplus

**Phase 2: Greedy Fallback**
If LP infeasible, use priority-based greedy allocation:
- Sort goals by priority + deadline urgency
- Allocate resources sequentially
- Warn user when constraints violated

**Asset Tracking**: Prevents double-counting via `asset_details.linked_goal_id` field.

### 8. Dynamic Form Generation and Context Isolation

**Challenge**: Traditional financial planning uses static forms that cannot adapt to user context (e.g., retirement vs. home purchase requires different questions).

#### Dynamic Form Rendering System

**Architecture**: AI generates form schemas on-the-fly based on:
- Goal category (retirement/home/education/wealth/emergency)
- Current stage (definition/strategy/product/simulation)
- User's financial context (employment status, existing goals, risk tolerance)

**Form Schema Structure**:
```javascript
{
  fields: [
    {
      name: "lump_sum_amount",
      label: "Do you have an initial lump sum to invest?",
      type: "currency",
      validation: { min: 0, max: user.liquidAssets },
      conditional: { show_if: "has_liquid_assets === true" }
    }
  ]
}
```

**Frontend Implementation** (`GoalIntakePage.jsx`):
- Receives schema from AI engine
- Dynamically renders input components (text, number, select, currency, date)
- Applies conditional logic (show/hide fields based on other answers)
- Validates input against AI-defined rules
- Submits user response back to AI for next stage

#### Context Isolation Architecture

**Problem**: User navigates between multiple goals (retirement, home, vacation) - how to prevent context leakage?

**Solution**: Session-based isolation
- Each goal planning session has unique `session_id`
- Frontend maintains separate `goalContext` state per session
- Backend stores `previousDecisions` scoped to session
- Switching goals clears chatbox history and resets context

**Smart Routing**:
- Auto-detect incomplete stages: If user exits mid-planning, system resumes at exact substage
- Cross-goal awareness: AI knows about other goals to prevent resource conflicts (e.g., "Your retirement goal already uses $50k of your liquid assets")
- History preservation: Decision logs persisted to database, allowing users to review past reasoning

**User Experience Benefits**:
1. **Adaptive Questionnaires**: First-time home buyers see KiwiSaver withdrawal questions; investors don't
2. **Progressive Disclosure**: Only show advanced options (glide path, escalation rate) when relevant
3. **Context-Aware Validation**: "Lump sum cannot exceed your available liquid assets ($84,500)"
4. **Seamless Resumption**: User can leave mid-planning and return later without losing progress

---

## System Architecture

### System Architecture Diagram

```
┌───────────────────────────────────────────────────────────────────┐
│                   React Frontend (Vite)                           │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Dynamic Form Rendering Engine                              │ │
│  │  - AI-generated schemas → React components                  │ │
│  │  - Session-based context isolation                          │ │
│  │  - Smart routing with stage detection                       │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  - 25 pages, 60+ components, Real-time SSE streaming            │
└─────────────────┬─────────────────────────────────────────────────┘
                  │ HTTP REST API
┌─────────────────▼─────────────────────────────────────────────────┐
│                  Node.js/Express Backend                          │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              Goal Engine Controller (Hybrid Core)          │  │
│  │  - Context enrichment + Privacy filtering                  │  │
│  │  - LLM invocation for reasoning                            │  │
│  │  - Algorithm execution via function-calling                │  │
│  │  - Decision logging (XAI)                                  │  │
│  └──────────────┬─────────────────────────────────────────────┘  │
│                 │                                                 │
│  ┌──────────────▼─────────────┐  ┌──────────────────────────┐   │
│  │  LLM Service               │  │  Financial Algorithms    │   │
│  │  - Multi-provider support  │  │  - Portfolio optimizer   │   │
│  │  - Function calling        │  │  - Monte Carlo engine    │   │
│  │  - RAG integration         │  │  - Resource allocator    │   │
│  │  - Streaming responses     │  │  - 1,092 product search  │   │
│  └──────────────┬─────────────┘  └──────────────────────────┘   │
│                 │                                                 │
└─────────────────┼─────────────────────────────────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
    ▼             ▼             ▼
┌─────────┐  ┌─────────┐  ┌──────────┐
│ MongoDB │  │DeepSeek │  │ Vectara  │
│10 Models│  │R1 (LLM) │  │  (RAG)   │
└─────────┘  └─────────┘  └──────────┘
```

### Component Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Presentation** | React 18 + Vite | Dynamic form rendering, context isolation, smart routing |
| **API** | Express 4 + Mongoose | RESTful endpoints, AI-algorithm orchestration |
| **AI** | DeepSeek R1, GPT-4o | Natural language reasoning, context analysis |
| **Algorithms** | Custom implementations | Portfolio optimization, Monte Carlo, constraint solving |
| **RAG** | Vectara v2 | Semantic search, 501 cleaned document chunks |
| **Data** | MongoDB 6 | 10 collections with 50+ embedded schemas |

---

## Core Features

### 1. Four-Stage AI Goal Planning Pipeline

#### Stage 1: Goal Definition
- **Gap Analysis**: Compare current financial position to target
- **Resource Calculation**: ONLY unallocated assets (prevent double-counting)
- **Feasibility Assessment**: Coverage ratio, debt servicing capacity

#### Stage 2: Strategy Formulation
- **Risk Alignment**: Map user's risk tolerance to target exposure (growth/defensive/liquidity)
- **Contribution Strategy**: Optimize lump sum vs. monthly contribution split
- **Glide Path**: For retirement goals, auto-adjust exposure as deadline approaches

#### Stage 3: Product Selection
- **Function Calling**: AI invokes `build_optimized_portfolios` tool
- **Portfolio Construction**: Returns 3 options (lowest cost, diversified, balanced)
- **KiwiSaver Integration**: Mandatory for retirement goals with employment income

#### Stage 4: Monte Carlo Simulation
- **Projection**: 100 iterations, 35-year horizon (typical retirement scenario)
- **Success Probability**: % of simulations achieving target
- **Sensitivity Analysis**: p10, p50, p90 outcomes under volatility assumptions

### 2. Wealth Management Center

- **Asset-Liability Tracking**: Real-time net worth calculation
- **Cash Flow Engine**: Monthly surplus calculation (income - expenses - goal contributions)
- **Goal-Asset Linkage**: Visual tags showing which assets fund which goals
- **Simulation Mode**: Forward-looking projections (1-40 years, adjustable scenarios)

### 3. Product Library

- **Coverage**: 1,092 products across 3 categories
  - KiwiSaver: 800+ funds (FMA-regulated schemes)
  - Managed Funds: 200+ non-KiwiSaver investment products
  - Term Deposits: 90+ bank term deposits (3-month to 5-year terms)
- **Attributes**:
  - Risk scores (1-7 scale based on 5-year volatility)
  - Asset allocation (growth/defensive/cash percentages)
  - Fee structures (total annual, performance-based, admin)
  - Historical returns (1-year, 5-year net returns)

### 4. RAG Knowledge Base

- **Corpus**: FinTwin_Docs (6 authoritative documents)
  - FMA KiwiSaver Annual Report 2025
  - RBNZ Monetary Policy Statements
  - NZ Retirement Expenditure Guidelines
  - Housing Market Analysis
  - Tax and Investment Guides
- **Query Process**: User question → semantic search → top 6 passages → LLM synthesis
- **Quality Control**: Automated filtering removed 26.1% low-quality chunks

### 5. Interactive Chatbox (Ask Mode)

- **Intent Classification**: Automatically distinguishes Q&A vs. structured goal planning
- **Streaming Responses**: Server-Sent Events for real-time feedback
- **Context Awareness**: 12-turn conversation history maintained
- **Privacy Override**: User can temporarily enable/disable data sharing per message

---

## AI Engine Design

### Dual-Mode Architecture

#### Ask Mode (Conversational Q&A)
- User asks free-form question
- RAG retrieves relevant documentation
- LLM synthesizes answer with citations
- Response streamed via SSE

#### Auto Mode (Structured Planning)
- User proceeds through 4-stage goal workflow
- Each stage has predefined substages and JSON schemas
- AI populates structured fields + provides rationale
- Results logged for explainability

### LLM Service Abstraction

Unified interface across 3 providers:

| Provider | Use Case | Function Calling | Cost/1M tokens |
|----------|----------|------------------|----------------|
| **DeepSeek R1** | Primary | Via fallback | ~$0.30 |
| **GPT-4o** | High-stakes decisions | Native | ~$5.00 |
| **Gemini 1.5 Flash** | Document processing | Native | ~$0.08 |

#### Function Calling Fallback (DeepSeek)
DeepSeek doesn't natively support function calling, so we implement 2-phase approach:

**Phase 1**: Request tool calls
- Structured prompt asking AI to output JSON array of tool calls
- Parse JSON, validate parameters

**Phase 2**: Execute tools + final response
- Run each tool (e.g., `build_optimized_portfolios`)
- Send tool results back to AI
- AI generates final recommendation

### Prompt Engineering

- **Total Prompt Content**: ~1,000 lines across 4 stages
- **Structure**:
  - Context summary (user profile, financial snapshot, RAG passages)
  - Stage-specific instructions
  - JSON schema enforcement
  - Mathematical formulas (e.g., exposure calculation, surplus calculation)
  - Consistency rules (e.g., "debt servicing already in cash flow, don't subtract from assets")

**Example Rule (Strategy Stage)**:
```
CRITICAL: Debt servicing is ALREADY reflected in monthly_surplus.
DO NOT subtract debts from available assets.
Debts are a risk indicator, not an investment constraint.
```

### Monte Carlo Simulation Engine

**Method**: Box-Muller transform for normal distribution sampling

**Parameters**:
- Initial capital (lump sum)
- Monthly contributions
- Escalation rate (contribution growth over time)
- Asset returns (growth: 8%, defensive: 4%, cash: 3%)
- Volatility (growth: 15%, defensive: 5%, cash: 0.5%)
- Time horizon (1-50 years)

**Output**:
- Success probability (% reaching target)
- Percentile outcomes (p10, p50, p90)
- Median shortfall/surplus

---

## Privacy and Explainability

### Privacy Architecture

#### 1. Middleware-Level Control (`privacyMiddleware.js`)

Attaches privacy context to every authenticated request:

```javascript
req.privacyContext = {
  userId,
  globalSharingEnabled,     // User's default setting
  requestOverride,          // Per-request override from frontend
  finalAISharing,           // Effective policy (override > global)
  allowlist,                // Array of permitted data types
  canAccess(dataType),      // Function to check access
  getAccessReason(dataType) // Logging helper
}
```

**Usage in Controllers**:
Controllers check `req.privacyContext.canAccess('financial_assets')` before querying DB.

#### 2. Data Sanitization (`llmDataSanitizer.js`)

Four sanitization levels:
- **none**: Debug mode, send raw data
- **pii_only**: Remove identifiers, keep financial values (RECOMMENDED)
- **normalized**: Scale values while preserving ratios
- **strict**: Remove all financial data, generic advice only

**Removed Fields**: `user_id`, `email`, `name`, `phone`, `address`, `ip_address`, `session_id`

#### 3. User Controls (Frontend)

**Settings Page**:
- Global toggle: "Share my financial data with AI"
- Granular checklist: Select which data types to share
- Per-chat override: "For this question only, allow/deny AI access"

**Visual Indicators**: Lock icon in chatbox shows current privacy state.

### Explainability Features

#### Decision History Tab (Goal Detail Page)

Timeline view showing every AI decision for the goal:
- Timestamp, stage, and substage
- AI's thought process (reasoning chain)
- User input that triggered decision
- AI's recommendation
- User action (accepted/modified/rejected)
- Citations to knowledge base documents

**Use Case**: User asks "Why did the AI recommend KiwiSaver for my home goal?"
- Navigate to Decision History
- Find Product Selection stage
- Read AI's rationale: "Because you have employment income, KiwiSaver provides employer match (3%) and government contribution ($521/year), boosting your deposit savings by ~$2,500/year."

#### Memory Logger (In-Memory Analytics)

Real-time decision stream for debugging:
- Recent decisions cached in memory
- Grouped by stage and category
- Used for immediate feedback in development

#### RAG Citations

Every AI response includes references to source documents:
- Document title
- Passage relevance score
- Original URL (if available)

---

## Technology Stack

### Backend Core
- **Runtime**: Node.js 20.x
- **Framework**: Express 4.x
- **Database**: MongoDB 6.x (10 collections)
- **ODM**: Mongoose 8.x

### AI/ML Stack
- **LLM Providers**: DeepSeek R1, GPT-4o, Gemini 1.5
- **RAG Platform**: Vectara v2 (serverless vector DB)
- **Document Processing**: pdf-parse, mammoth (DOCX)
- **Simulation**: Custom Monte Carlo implementation

### Frontend Stack
- **Framework**: React 18.x
- **Build Tool**: Vite 5.x
- **UI Library**: Tailwind CSS 4.x
- **Charts**: Recharts 2.x
- **Icons**: Lucide React
- **Routing**: React Router 6.x

### Development Tools
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: express-validator
- **API Client**: Axios
- **Environment**: dotenv

---

## Installation

### Prerequisites
- Node.js 20.x or higher
- MongoDB 6.x running locally or remotely
- API keys for DeepSeek and Vectara

### Quick Start

```bash
# 1. Clone repository
git clone https://github.com/your-org/money-minds.git
cd money-minds

# 2. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 3. Configure environment variables
# Create backend/.env with:
#   MONGODB_URI, LLM_PROVIDER, DEEPSEEK_API_KEY, VECTARA_API_KEY, JWT_SECRET
# Create frontend/.env with:
#   VITE_API_BASE_URL

# 4. Initialize database (import 1,092 products)
cd backend
npm run seed

# 5. Start servers
# Terminal 1: cd backend && npm run dev
# Terminal 2: cd frontend && npm run dev

# 6. Access application
# Frontend: http://localhost:5173
# Backend: http://localhost:5001/api
```

---

## Data Models

### Core Models (10 total)

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| **User** | Authentication + privacy settings | `email`, `password`, `privacy.shareWithAI`, `privacy.dataAllowlist` |
| **Goal** | User's financial objectives | `goal_name`, `category`, `target_amount`, `due_date`, `plan` (ref) |
| **Plan** | AI-generated strategy for goal | `strategy_profile`, `selected_portfolio`, `simulation_results` |
| **Product** | Investment products (1,092) | `name`, `provider`, `category`, `metrics.riskScore`, `allocation` |
| **FinancialAsset** | User's assets/liabilities | `category`, `value`, `source_product_id`, `asset_details.linked_goal_id` |
| **CashFlow** | Recurring income/expenses | `type`, `amount`, `frequency`, `timing_mode` |
| **Snapshot** | Historical wealth tracking | `net_worth`, `total_assets`, `timestamp` |
| **GoalDecisionLog** | XAI audit trail | `stage`, `user_input`, `ai_decision`, `user_action` |
| **PlaygroundSimulation** | Scenario simulation runs | `simulation_type`, `time_offset`, `market_scenario`, `results` |
| **PlaygroundBackground** | Background task execution | `task_type`, `status`, `result`, `metadata` |

### Key Relationships

```
User (1) ─── (N) Goal
Goal (1) ─── (1) Plan
Plan (N) ─── (M) Product [via selected_portfolio.products array]
Goal (1) ─── (N) FinancialAsset [via asset_details.linked_goal_id]
Goal (1) ─── (N) GoalDecisionLog
FinancialAsset (N) ─── (1) Product [via source_product_id]
```

---

## Development

### Architectural Complexity

**AI-Algorithm Integration**:
- Function-calling interface for LLM to invoke computational tools
- Structured output validation (JSON schemas)
- Two-phase execution: LLM reasoning → algorithm calculation

**Algorithmic Complexity**:
- Portfolio optimization: O(n²) gradient descent + random perturbation
- Monte Carlo simulation: O(iterations × years)
- Multi-goal allocation: Linear programming (Simplex method)

**System Complexity**:
- Frontend: Dynamic form generation from AI schemas, session-based context isolation
- State management: 4-stage FSM with substages and smart routing
- Privacy control: 3-layer architecture (global/request/sanitization)
- LLM orchestration: Multi-provider with function-calling fallback
- RAG pipeline: Automated document processing with quality control

**Technical Depth**:
- Hybrid AI architecture (LLM reasoning + algorithmic computation)
- Advanced AI integration (function calling, structured output, streaming)
- Mathematical optimization (portfolio construction, Monte Carlo simulation)
- Privacy engineering (middleware, sanitization, user controls)
- Software architecture (layered design, separation of concerns, context isolation)

### Key Technical Challenges Solved

1. **LLM Hallucination Control**
   - URL validation and cleaning
   - Structured output enforcement via JSON schemas
   - RAG passage quality filtering

2. **Multi-Goal Resource Contention**
   - Linear programming for optimal allocation
   - Asset tracking via `linked_goal_id` to prevent double-counting

3. **Function Calling Fallback**
   - Two-phase approach for providers without native support
   - Tool result injection and final response generation

4. **Document Quality Assurance**
   - Automated content type detection
   - Code-level enforcement of filtering rules
   - LLM-powered metadata generation

5. **Real-Time Privacy Enforcement**
   - Middleware intercepts all requests
   - Per-request override capability
   - Transparent logging for auditability

6. **Dynamic Form Generation**
   - AI generates context-aware form schemas
   - Frontend dynamically renders input components
   - Session-based context isolation prevents cross-goal contamination

---

## Technical Innovations Summary

### Goal-Based Investment
- **Goal-Centric Design**: All financial decisions organized around user-defined life goals
- **Asset Linking**: Automatic tracking of which assets fund which goals (`linked_goal_id`)
- **Resource Allocation**: Multi-goal optimization prevents double-counting of limited capital
- **Progress Tracking**: Real-time success probability and projected outcome visualization

### Neuro-Symbolic AI Architecture
- **LLM Layer (Neural)**: Natural language understanding, context analysis, recommendation synthesis
- **Algorithm Layer (Symbolic)**: Deterministic computation for portfolio optimization, simulation, constraint solving
- **Integration**: Function-calling interface enables LLM to invoke computational tools

### Explainable AI
- Complete decision audit trail via `GoalDecisionLog` model
- Thought process, rationale, and user action tracking
- RAG citation system for evidence-based recommendations

### Privacy Engineering
- Three-layer protection: global toggle, granular allowlist, PII sanitization
- Request-level override for per-conversation control
- GDPR-compliant data handling

### Intelligent Document Processing
- 73.9% quality retention rate (678→501 chunks)
- Automated content type detection and semantic filtering
- LLM-powered metadata generation for searchable attributes

### Dynamic User Interface
- AI-generated form schemas adapt to user context
- Session-based context isolation prevents state leakage
- Smart routing for seamless multi-goal planning

### Research Applications
- Goal-based investment framework for personal finance
- Privacy-preserving AI financial advisory framework
- Explainable decision logging for regulated industries
- Neuro-symbolic architecture for trustworthy AI systems
- Automated knowledge base curation for domain-specific RAG

---

## License

MIT License - See LICENSE file for details.

## References

1. Financial Markets Authority (FMA). (2025). *KiwiSaver Annual Report 2025*.
2. Reserve Bank of New Zealand (RBNZ). (2025). *Monetary Policy Statement November 2025*.
3. Commission for Financial Capability (CFFC). (2024). *New Zealand Retirement Expenditure Guidelines*.
4. Ministry of Housing and Urban Development (MHUD). (2025). *Housing in Aotearoa 2025*.

## Acknowledgments

Data sources and infrastructure providers:
- Financial Markets Authority - KiwiSaver product data (1,092 instruments)
- Vectara - RAG platform (501 curated document chunks)
- DeepSeek - Primary LLM API
- MongoDB - Database infrastructure

---

**Maintainer**: [Your Name]  
**Institution**: University of Auckland, Department of Computer Science  
**Contact**: [your.email@auckland.ac.nz]
