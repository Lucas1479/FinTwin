/**
 * AI Assistant Context Anchors
 * 
 * This registry maps UI components to specific sections of the Knowledge Base (Specification.md).
 * Instead of hardcoding prompts in components, we reference these anchors.
 * 
 * Structure:
 * - id: Unique identifier for tracking
 * - contextTag: The RAG lookup key (e.g., matches [DOC_ANCHOR: TAG] in the markdown)
 * - question: The default user query text shown in the chat window
 */

export const HELP_ANCHORS = {
  // === Wealth Center ===
  WEALTH: {
    INTRO: {
      id: 'wealth_intro',
      contextTag: 'WEALTH_CORE_DEFINITIONS',
      question: 'What is the Wealth Center and how is it different from a simple budget?'
    },
    NET_WORTH: {
      id: 'wealth_net_worth',
      contextTag: 'WEALTH_CORE_DEFINITIONS',
      question: 'How is my Net Worth calculated?'
    },
    LIQUIDITY_TIERS: {
      id: 'wealth_liquidity_tiers',
      contextTag: 'LIQUIDITY_TIER_ANALYSIS',
      question: 'What is the difference between Liquid, Semi-Liquid, and Locked assets?'
    },
    LIQUID_CAPITAL: {
      id: 'wealth_liquid_capital',
      contextTag: 'LIQUID_CAPITAL_STRUCTURE',
      question: 'Why is my Liquid Capital split into Spendable and Allocated?'
    },
    ASSET_CLASSES: {
      id: 'wealth_asset_classes',
      contextTag: 'WEALTH_ASSET_CLASSES',
      question: 'How does FinTwin classify my assets and liabilities?'
    },
    DSR: {
      id: 'wealth_dsr',
      contextTag: 'FINANCIAL_RATIOS_DSR',
      question: 'What is Debt Service Ratio (DSR) and why is it critical?'
    },
    LVR: {
      id: 'wealth_lvr',
      contextTag: 'FINANCIAL_RATIOS_LVR',
      question: 'Explain Loan-to-Value Ratio (LVR) impact on my leverage.'
    },
    BALANCE_SHEET: {
      id: 'wealth_balance_sheet',
      contextTag: 'WEALTH_CORE_DEFINITIONS',
      question: 'How does FinTwin structure my Balance Sheet (Assets - Liabilities)?'
    }
  },

  // === Cash Flow ===
  CASHFLOW: {
    METRICS: {
      id: 'cf_core_metrics',
      contextTag: 'CASH_FLOW_METRICS',
      question: 'How are Surplus and Savings Rate calculated?'
    },
    INCOME_TYPES: {
      id: 'cf_income_types',
      contextTag: 'CASH_FLOW_INCOME_TYPES',
      question: 'What is the difference between Active and Passive Income?'
    },
    FI_RATIO: {
      id: 'cf_fi_ratio',
      contextTag: 'CASH_FLOW_INCOME_TYPES',
      question: 'What does the Financial Independence (FI) Ratio mean?'
    },
    FORECAST: {
      id: 'cf_forecast_logic',
      contextTag: 'CASH_FLOW_METRICS', 
      question: 'How is the Plan (Forecast) calculated and why is the Surplus metric important?'
    },
    ACTUAL: {
      id: 'cf_actual_logic',
      contextTag: 'CASH_FLOW_PROJECTION_LOGIC', 
      question: 'What is the difference between the Actual view and the Plan view in Cash Flow?'
    }
  },

  // === Dashboard ===
  DASHBOARD: {
    HEATMAP: {
      id: 'dash_heatmap',
      contextTag: 'DASHBOARD_HEATMAP_LOGIC',
      question: 'How should I interpret this Goal Heatmap?'
    },
    FUNDING_FLOW: {
      id: 'dash_funding_flow',
      contextTag: 'DASHBOARD_FUNDING_FLOW',
      question: 'What does the Funding Flow chart show me?'
    },
    HEALTH_SCORE: {
      id: 'dash_health_score',
      contextTag: 'DASHBOARD_HEALTH_SCORE',
      question: 'How is my Financial Health Score calculated?'
    }
  },

  // === Goal Engine ===
  GOALS: {
    INTRO: {
      id: 'goal_intro',
      contextTag: 'GOAL_ENGINE_PHILOSOPHY',
      question: 'What is Goal-Based Investing and how does this engine work?'
    },
    PHILOSOPHY: {
      id: 'goal_philosophy',
      contextTag: 'GOAL_ENGINE_PHILOSOPHY',
      question: 'How does FinTwin design my investment plan (GBI vs MPT)?'
    },
    FEASIBILITY: {
      id: 'goal_feasibility',
      contextTag: 'GOAL_ENGINE_PHILOSOPHY', // Mapped to general philosophy which covers scoring
      question: 'What does the Feasibility Score mean?'
    }
  },

  // === Marketplace & Portfolio ===
  MARKETPLACE: {
    OPTIMIZER: {
      id: 'mkt_optimizer',
      contextTag: 'PORTFOLIO_OPTIMIZATION_LOGIC',
      question: 'How does the AI select products for my portfolio?'
    },
    RISK_LEVELS: {
      id: 'mkt_risk_levels',
      contextTag: 'MARKETPLACE_TAXONOMY',
      question: 'How are Risk Scores (1-7) determined?'
    },
    ALLOCATION: {
      id: 'mkt_allocation',
      contextTag: 'ASSET_ALLOCATION_MODEL',
      question: 'Why is my portfolio split into Growth, Defensive, and Cash?'
    }
  },
  
  // === User Profile ===
  USER_PROFILE: {
    RISK_DNA: {
      id: 'profile_risk_dna',
      contextTag: 'USER_RISK_PROFILE',
      question: 'What is my Risk DNA and how does it affect AI recommendations?'
    },
    HOUSEHOLD: {
      id: 'profile_household',
      contextTag: 'USER_HOUSEHOLD_CONTEXT',
      question: 'How does my household status affect my financial plan?'
    },
    COMPLIANCE: {
      id: 'profile_compliance',
      contextTag: 'USER_HOUSEHOLD_CONTEXT',
      question: 'What is PIR (Prescribed Investor Rate) and why is it important?'
    },
    ALLOCATION: {
      id: 'profile_allocation',
      contextTag: 'USER_ALLOCATION_PREFS',
      question: 'How does my Debt vs Invest preference change the AI strategy?'
    }
  },
  
  // === Playground ===
  PLAYGROUND: {
    MONTE_CARLO: {
      id: 'sim_monte_carlo',
      contextTag: 'MONTE_CARLO_LOGIC',
      question: 'What is a Monte Carlo simulation?'
    },
    BACKGROUNDS: {
      id: 'sim_backgrounds',
      contextTag: 'PLAYGROUND_BACKGROUNDS',
      question: 'What is a Simulation Background?'
    },
    SIMULATIONS: {
      id: 'sim_simulations',
      contextTag: 'PLAYGROUND_SCENARIOS',
      question: 'What is a Simulation scenario?'
    },
    STRATEGY: {
      id: 'sim_strategy',
      contextTag: 'GOAL_ENGINE_PHILOSOPHY',
      question: 'How do "Guardrails" (Contributions & Exposure) affect my simulation?'
    },
    SUCCESS_PROB: {
      id: 'sim_success_prob',
      contextTag: 'SIMULATION_SUCCESS_PROB',
      question: 'What does "Success Probability" mean and what is a safe score?'
    }
  }
};
