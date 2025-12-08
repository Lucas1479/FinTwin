# Money Minds - Sprint 2: The Intelligent Goal Engine MVP
## Strategy & Timeline (3 Weeks)

### 1. Executive Summary
**Goal**: Deliver a fully functional "Intelligent Goal Engine" that guides users from intent to a committed financial plan using AI.
**Core Philosophy**: "Vertical Slice" architecture, but executed in parallel by separating **Data Providers** (Marketplace, User Profile) from the **Core Logic Consumer** (The Goal Engine).
**Team Structure**: 5 Developers (Full Stack Split).

---

### 2. Feature Prioritization (MoSCoW)

#### 🔴 P0: Must Have (Critical Path - Week 1 & 2)
*Blocking issues for the MVP. If these aren't done, the core user flow fails.*

**A. The Goal Engine (The Core Flow)**
*   **Stage 1 (Definition)**: [Refinement] Connect "Gap Analysis" chart to real user asset data (from User Profile module).
*   **Stage 2 (Strategy)**: [New] Implement "Strategy Speedometer" UI. Allow toggling "Inflation Adjustment" and "Tax Optimization".
*   **Stage 3 (Product)**: [New] Integrate `Product Select` modal. Must fetch real data from the Marketplace API based on Stage 2's risk profile.
*   **Stage 4 (Simulation)**: [New] "Twin Projection" Chart. Calculate generic compound interest vs. selected product returns. Implement `COMMIT` transaction (write to `Goal` + `Plan`).

**B. Data Providers (The Foundation)**
*   **Marketplace (Product Database)**: A functional database of ~20 NZ financial products (Funds, KiwiSaver, ETFs) with fields: `risk_level`, `fees`, `returns_1y/5y/10y`, `category`.
*   **User Financial Profile**:
    *   **Risk Quiz**: A 5-question logic to determine `user.risk_profile` (Conservative/Balanced/Growth).
    *   **Asset Wallet**: Simple CRUD for `current_savings` and `monthly_surplus`. (Critical for Stage 1 Gap Analysis).

**C. AI Integration**
*   **State Machine**: Backend prompts tailored for each of the 4 stages.
*   **Copilot UI**: Right-panel chat that explains *why* a recommendation is made (Rationale).

#### 🟡 P1: Should Have (Experience Enhancers - Week 3)
*High value, but can be mocked if absolutely necessary.*

*   **Dashboard 2.0**: A consolidated view showing:
    *   "My Goals" (Progress Bars).
    *   "Net Worth" (Aggregated from Wallet).
    *   "Action Items" (Next steps for active goals).
*   **Decision Logs**: Backend logging of every `User Input` vs `AI Suggestion` for audit trails.
*   **Marketplace UI**: A dedicated "Browse" page for users to explore products outside of the Goal Engine flow.

#### 🟢 P2: Could Have (If Time Permits)
*   **Complex RAG**: Querying actual PDF documents (PDS) for product details. (Fallback: Use pre-summarized text in DB).
*   **Goal Conflict Detection**: Checking if Goal A steals funds from Goal B. (Fallback: Treat resources as infinite for MVP).
*   **Chat Intake (Pathway A)**: The conversational start. (Fallback: Use "Gallery" click-to-start).

---

### 3. Three-Week Development Schedule

#### 📅 Week 1: Decoupled Modules (Parallel Build)
*Focus: Building the independent blocks that the Engine needs.*

*   **Developer 1 (Engine Lead)**:
    *   Build **Stage 2 (Strategy)** UI & State logic.
    *   Build **Stage 4 (Simulation)** Calculation Engine (JS-based projection).
*   **Developer 2 (Backend Core)**:
    *   Finalize `PlanModel` & `GoalDecisionLogModel`.
    *   Build `LLMService` prompt state machine (Prompt Engineering).
*   **Developer 3 (Marketplace)**:
    *   Design `ProductSchema`. Seed DB with 20 real products.
    *   Build `GET /api/products` with filters (Risk, Category).
*   **Developer 4 (User/Wallet)**:
    *   Build **Risk Profile Quiz** page & logic.
    *   Build **Asset Wallet** API & UI (Input current cash/savings).
*   **Developer 5 (Frontend/UI)**:
    *   Standardize UI components (Cards, Modals, Charts).
    *   Implement **Stage 3 (Product Selection)** UI (Static mock first).

**✅ Week 1 Milestone**: All individual pages (Wallet, Market, Strategy UI) work independently with local/seed data.

#### 📅 Week 2: Integration (The Handshake)
*Focus: Connecting the blocks. The Engine starts consuming real data.*

*   **Dev 1 & 2**:
    *   Connect Stage 1 Gap Analysis to **User Wallet API** (Dev 4's work).
    *   Connect Stage 3 Product Selector to **Product API** (Dev 3's work).
    *   Connect Stage 2 Default Risk to **User Risk Profile** (Dev 4's work).
*   **Dev 3**:
    *   Build the full **Marketplace Browse Page** (P1).
*   **Dev 4**:
    *   Refine User Profile UX. Add "Retirement Age" settings.
*   **Dev 5**:
    *   Implement "Copilot" loading states and real AI response rendering.

**✅ Week 2 Milestone**: A user can register, take the quiz, enter assets, and run through the Goal Engine with *real* personalized data recommendations.

#### 📅 Week 3: Dashboard & Polish (The Loop)
*Focus: What happens *after* the goal is created.*

*   **Dev 1 & 2**:
    *   Implement the `COMMIT` button (Transactional save).
    *   Ensure **Decision Logs** are saved correctly.
*   **Dev 3 & 4**:
    *   Build **Dashboard 2.0** (P1). Show the created goals and their projected progress.
    *   Implement "Edit Goal" (re-entering the flow).
*   **Dev 5**:
    *   Visual Polish (Animations, Responsive checks).
    *   Error Handling (Global Error Boundary tests).

**✅ Week 3 Milestone**: End-to-End Demo ready. Login -> Quiz -> Wallet -> Goal Creation -> Dashboard View.

---

### 4. Technical Dependencies (Immediate Action Items)
1.  **Schema Agreement**: `ProductSchema` and `UserSchema` (assets/risk) must be frozen on Day 1.
2.  **API Contract**: Define the JSON shape for `GET /api/products` and `GET /api/user/profile`.
3.  **Prompt Engineering**: Start testing "Stage 2 Strategy" prompts in the playground immediately.

