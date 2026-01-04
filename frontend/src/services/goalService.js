import api from '../utils/api';

// Create a new goal
export const createGoal = async (payload) => {
  const { data } = await api.post('/goals', payload);
  return data;
};

/**
 * Create a goal with a full plan from the Goal Engine workflow
 * This combines Goal, Plan, and Decision Log creation
 * @param {Object} goalContext - The complete goal context from the 4-stage workflow
 * @returns {Promise<Object>} - The created goal with plan
 */
export const createGoalWithPlan = async (goalContext) => {
  // Extract strategy recommendation
  const strategy = goalContext.ai_decision?.strategy_recommendation || {};
  const contributionStrategy = strategy.contribution_strategy || {};
  const glidePath = strategy.glide_path || {};
  const exposure = strategy.economic_exposure || { growth: 60, defensive: 30, liquidity: 10 };
  
  // Get selected portfolio
  const selectedPortfolio = goalContext.selectedPortfolio || 
    goalContext.ai_decision?.portfolio_options?.find(p => p.option_id === goalContext.selectedPortfolioId) ||
    goalContext.ai_decision?.portfolio_options?.[0];
  
  // Build the payload
  const payload = {
    // --- Goal Fields ---
    goal_name: goalContext.goal_name,
    icon: goalContext.icon || goalContext.category,
    category: goalContext.category,
    priority: goalContext.priority || 'want',
    riskTolerance: goalContext.riskTolerance || 'middle-risk',
    target_amount: goalContext.target_amount,
    current_amount: goalContext.current_amount || 0,
    due_date: goalContext.due_date,
    goal_details: goalContext.goal_details,
    notes: goalContext.notes,
    
    // --- Plan Fields ---
    strategyType: strategy.recommended_risk || 'balanced',
    granularSettings: {
      inflationAdjust: goalContext.inflationAdjust ?? true,
      taxOptimized: false,
      reinvestDividends: true,
      liquidity: 'flexible'
    },
    
    // Enhanced plan fields
    target_exposure: exposure,
    glide_path: glidePath,
    contribution_strategy: contributionStrategy,
    selected_portfolio: selectedPortfolio ? {
      option_id: selectedPortfolio.option_id,
      option_name: selectedPortfolio.option_name,
      description: selectedPortfolio.description,
      total_fees_estimate: selectedPortfolio.total_fees_estimate,
      calculated_exposure: selectedPortfolio.calculated_exposure,
      products: selectedPortfolio.products?.map(p => ({
        // 兼容多种 ID 字段名: product_id, id, _id
        product_id: p.product_id || p.id || p._id,
        weight_pct: p.weight_pct,
        rationale: p.rationale
      })).filter(p => p.product_id) // 过滤掉没有 ID 的产品
    } : undefined,
    
    contribution: {
      amount: contributionStrategy.monthly_amount || 0,
      frequency: contributionStrategy.mode === 'lump_sum' ? 'lump_sum' : 'monthly'
    },
    
    // Lump sum allocations
    initial_allocations: contributionStrategy.lump_sum_amount ? [{
      amount: contributionStrategy.lump_sum_amount,
      allocated_at: new Date()
    }] : [],
    
    // AI rationale
    ai_rationale: goalContext.ai_decision?.rationale || strategy.rationale,
    
    // Session ID for decision log linking
    decision_session_id: goalContext.session_id
  };
  
  const { data } = await api.post('/goals', payload);
  return data;
};

// Fetch all goals for the current user
export const getGoals = async (params = {}) => {
  const { data } = await api.get('/goals', { params });
  return data;
};

// Fetch a single goal by id
export const getGoalById = async (id) => {
  const { data } = await api.get(`/goals/${id}`);
  return data;
};

// Update an existing goal
export const updateGoal = async (id, payload) => {
  const { data } = await api.put(`/goals/${id}`, payload);
  return data;
};

// Delete a goal
export const deleteGoal = async (id) => {
  const { data } = await api.delete(`/goals/${id}`);
  return data;
};

// Get goal with full plan details (for detail page)
export const getGoalWithPlan = async (id) => {
  const { data } = await api.get(`/goals/${id}`);
  return data;
};

// Get decision logs for a goal
export const getDecisionLogsForGoal = async (goalId) => {
  const { data } = await api.get(`/goals/${goalId}/decisions`);
  return data;
};

// Get decision logs by session ID
export const getDecisionLogsBySession = async (sessionId) => {
  const { data } = await api.get(`/goals/decisions/session/${sessionId}`);
  return data;
};

