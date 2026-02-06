/**
 * GoalIntakePage.jsx
 * 
 * Goal Engine - Multi-stage goal planning with AI assistance
 * 
 * Architecture:
 * - Modular component design with extracted engine components
 * - SubstageStepIndicator, ConfirmedCard, GapAnalysisForm, AssumptionForm
 * - Copilot AI assistant with RAG and privacy controls
 * - See: frontend/src/components/goals/engine/
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import GoalDefinitionForm from '../components/goals/GoalDefinitionForm';
import { renderGoalForm, hasCustomForm } from '../components/goals/forms/GoalFormRegistry.jsx';
import StageStrategy from '../components/goals/StageStrategy';
import StageProduct from '../components/goals/StageProduct';
import StageSimulation, { runMonteCarlo } from '../components/goals/StageSimulation';
import goalEngineService from '../services/goalEngineService';
import { createGoalWithPlan, getGoals } from '../services/goalService';
import { getCashFlows } from '../services/cashFlowService';
import { computeFinancialsFromCashFlows, extractOtherGoalsMonthly } from '../utils/financialCalculations';
import { getUserProfile } from '../services/userService';
import { getRequiredDataTypes, getDataTypeLabels, shouldShowPermissionCard } from '../constants/privacyDataTypes';
import { extractField } from '../utils/streamHelpers';

// Import engine components
import { SubstageStepIndicator } from '../components/goals/engine/SubstageStepIndicator';
import { ConfirmedCard } from '../components/goals/engine/ConfirmedCard';
import { GapAnalysisForm } from '../components/goals/engine/GapAnalysisForm';
import { AssumptionForm } from '../components/goals/engine/AssumptionForm';
import Copilot from '../components/goals/engine/Copilot';
import { GENERIC_SUBSTAGES, getSubstagesForCategory, buildInitialSubstageState } from '../components/goals/engine/constants';

import {
    ChevronRight,
    ChevronLeft,
    Target,
    Shield,
    ShoppingBag,
    Activity,
    CheckCircle2,
    Brain,
    HelpCircle,
    X
} from 'lucide-react';
import OnboardingGuide from '../components/goals/OnboardingGuide';

const GoalEnginePage = () => {
  const navigate = useNavigate();
  const STORAGE_KEY = 'goal_engine_session_v1';
  
  const buildFreshGoalContext = () => ({
    session_id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  });
  
  const [currentStage, setCurrentStage] = useState(0);
  const [goalContext, setGoalContext] = useState(buildFreshGoalContext);
  const [submitting, setSubmitting] = useState(false);
  const [messages, setMessages] = useState([]);
  const [useRag, setUseRag] = useState(true);
  const [chatMode, setChatMode] = useState('agent');
  
  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [quickStartPrompt, setQuickStartPrompt] = useState(null);
  
  // Privacy control state
  const [userPrivacySettings, setUserPrivacySettings] = useState({ shareWithAI: true });
  const [allowAIDataSharing, setAllowAIDataSharing] = useState(true);
  
  // Privacy permission card state
  const [pendingQuery, setPendingQuery] = useState(null);
  const [showPermissionCard, setShowPermissionCard] = useState(false);
  const [requestedDataTypes, setRequestedDataTypes] = useState([]);
  const [selectedAllowlist, setSelectedAllowlist] = useState([]);
  
  // Resizable sidebar state
  const [leftWidth, setLeftWidth] = useState(window.innerWidth > 1440 ? 450 : 340); 
  const [isResizing, setIsResizing] = useState(false);
  const [collapsed, setCollapsed] = useState('none');
  
  const containerRef = useRef(null);

  // Track loading state for stage transitions
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  
  // Substage state machine with reversible data
  const [substageState, setSubstageState] = useState(buildInitialSubstageState);
  const [substageData, setSubstageData] = useState({});
  const [stageSummary, setStageSummary] = useState({});
  const [recalcFlags, setRecalcFlags] = useState({});
  const [cardExpanded, setCardExpanded] = useState({});
  const [isHydrated, setIsHydrated] = useState(false);

  const activeSubstages = {
      definition: getSubstagesForCategory(goalContext.category)
  };

  // Fetch user privacy settings on mount
  useEffect(() => {
    const fetchPrivacySettings = async () => {
      try {
        const profile = await getUserProfile();
        const shareWithAI = profile?.privacy?.shareWithAI !== false;
        setUserPrivacySettings({ shareWithAI });
        setAllowAIDataSharing(shareWithAI);
      } catch (error) {
        console.error('[Privacy] Failed to load privacy settings:', error);
        setUserPrivacySettings({ shareWithAI: true });
        setAllowAIDataSharing(true);
      }
    };
    fetchPrivacySettings();
  }, []);

  // Rebuild substages if category changes
  useEffect(() => {
    const newConfig = activeSubstages.definition;
    const newIds = newConfig.map(s => s.id);
    const currentOrder = substageState.definition?.order || [];
    if (JSON.stringify(currentOrder) === JSON.stringify(newIds)) return;
    setSubstageState(prev => ({
        ...prev,
        definition: {
            order: newIds,
            currentIndex: 0,
            statusById: newIds.reduce((acc, id) => ({
                ...acc,
                [id]: prev.definition?.statusById?.[id] || 'collecting'
            }), {})
        }
    }));
  }, [goalContext.category]);

  // Auto-close onboarding when AI generates data or user starts chatting
  useEffect(() => {
    if (!showOnboarding) return;
    
    if (goalContext.goal_name || goalContext.category) {
      setTimeout(() => setShowOnboarding(false), 300);
    }
    
    const hasUserMessage = messages.some(m => m.role === 'user');
    if (hasUserMessage) {
      setTimeout(() => setShowOnboarding(false), 500);
    }
  }, [showOnboarding, goalContext, messages]);

  const STAGES = [
      { id: 'definition', label: 'Definition', icon: Target },
      { id: 'strategy', label: 'Strategy', icon: Shield },
      { id: 'product', label: 'Product', icon: ShoppingBag },
      { id: 'simulation', label: 'Simulation', icon: Activity },
  ];

  // Allow Copilot or substages to update context while preserving AI payload
  const handleContextUpdate = useCallback((updates) => {
      if (!updates) return;

      const normalized = { ...updates };
      const normalizeDueDate = (value) => {
          if (!value) return value;
          if (value instanceof Date) return value.toISOString();
          if (typeof value === 'string') {
              const trimmed = value.trim();
              const iso = Date.parse(trimmed);
              if (!Number.isNaN(iso)) return new Date(iso).toISOString();
              const yearMatch = trimmed.match(/(\d+)\s*year/i);
              if (yearMatch) {
                  const years = Number(yearMatch[1]);
                  if (Number.isFinite(years) && years > 0) {
                      const d = new Date();
                      d.setFullYear(d.getFullYear() + years);
                      return d.toISOString();
                  }
              }
              const monthMatch = trimmed.match(/(\d+)\s*month/i);
              if (monthMatch) {
                  const months = Number(monthMatch[1]);
                  if (Number.isFinite(months) && months > 0) {
                      const d = new Date();
                      d.setMonth(d.getMonth() + months);
                      return d.toISOString();
                  }
              }
          }
          return value;
      };
      
      const isAiDecisionPayload = Boolean(
          normalized.strategy_recommendation ||
          normalized.thought_process ||
          normalized.rationale ||
          normalized.allocation ||
          normalized.funding_structure ||
          normalized.portfolio_options ||
          normalized.product_selection ||
          normalized.strategy_recommendation?.portfolio_options ||
          normalized.strategy_recommendation?.product_selection
      );
      
      if (normalized.category) {
          normalized.category = normalized.category.toLowerCase();
      }
      if (normalized.due_date) {
          normalized.due_date = normalizeDueDate(normalized.due_date);
      }

      if (normalized.retirement_age || normalized.living_expense_pa) {
           if (!normalized.category) normalized.category = 'retirement';
      }
      
      const detailFields = [
          'retirement_age', 'life_expectancy', 'living_expense_pa', 'lumpy_expenses', 'include_superannuation',
          'location', 'property_price_estimate', 'deposit_percentage', 'is_first_home',
          'study_country', 'institution_tier', 'living_situation', 'tuition_fees_pa', 'living_costs_pa',
          'tier', 'brand', 'model_id', 'model_name', 'condition', 'fuel_type', 'vehicle_type', 'trade_in_value',
          'destination', 'flight_class', 'accommodation_style', 'lifestyle_level', 'adults', 'children', 'duration_days', 'travelers_count',
          'primary_motivation', 'monthly_spend_est', 'target_months_rough',
          'target_passive_income', 'time_horizon_years', 'current_net_worth', 'growth_objective',
          'purchase_category', 'estimated_amount', 'description',
          'expected_return_pct', 'inflation_pct', 'risk_attitude', 'cashflow_flexibility',
          'mortgage_rate_pct', 'loan_term_years',
          'liquid_assets', 'investments', 'debts', 'monthly_income',
          'current_super_balance', 'annual_contribution', 'current_amount', 'region_policy'
      ];

      let detailsFound = false;
      const newDetails = {};

      detailFields.forEach(field => {
          if (normalized[field] !== undefined) {
              newDetails[field] = normalized[field];
              delete normalized[field];
              detailsFound = true;
          }
      });

      if (normalized.goal_details) {
          Object.keys(normalized.goal_details).forEach(field => {
              newDetails[field] = normalized.goal_details[field];
              detailsFound = true;
          });
          delete normalized.goal_details;
      }

      if (normalized.ai_decision) {
          const financialFields = ['liquid_assets', 'investments', 'debts', 'monthly_income', 'current_super_balance'];
          financialFields.forEach(field => {
              if (normalized.ai_decision[field] !== undefined) {
                  newDetails[field] = normalized.ai_decision[field];
                  detailsFound = true;
              }
          });
          
          const assumptionFields = [
              'expected_return_pct', 'inflation_pct', 'risk_attitude', 'cashflow_flexibility',
              'retirement_age', 'life_expectancy', 'include_superannuation',
              'mortgage_rate_pct', 'loan_term_years', 'property_appreciation_pct', 'stress_test_rate_pct'
          ];
          assumptionFields.forEach(field => {
              if (normalized.ai_decision[field] !== undefined) {
                  newDetails[field] = normalized.ai_decision[field];
                  detailsFound = true;
              }
          });
      }

      const updatedRootFields = Object.keys(normalized).filter(k => k !== 'ai_decision');

      setGoalContext(prev => {
          const nextState = { ...prev };

          if (isAiDecisionPayload) {
              nextState.ai_decision = {
                  ...prev.ai_decision,
                  ...normalized
              };
          }

          Object.assign(nextState, normalized);

          if (detailsFound) {
              nextState.goal_details = {
                  ...prev.goal_details,
                  ...newDetails
              };

              if (nextState.ai_decision && !isAiDecisionPayload) {
                  const aiDecision = { ...nextState.ai_decision };
                  Object.keys(newDetails).forEach(field => {
                      if (aiDecision[field] !== undefined) {
                          delete aiDecision[field];
                      }
                  });
                  nextState.ai_decision = aiDecision;
              }
          }

          if (nextState.ai_decision && !isAiDecisionPayload && updatedRootFields.length > 0) {
              const aiDecision = { ...nextState.ai_decision };
              let needsUpdate = false;
              updatedRootFields.forEach(field => {
                  if (aiDecision[field] !== undefined) {
                      delete aiDecision[field];
                      needsUpdate = true;
                  }
              });
              if (needsUpdate) {
                  nextState.ai_decision = aiDecision;
              }
          }
          
          if (normalized.ai_decision?.strategy_recommendation) {
             nextState.ai_decision = {
                 ...prev.ai_decision,
                 ...normalized.ai_decision
             }
          }

          return nextState;
      });
  }, []);

  const currentStageId = STAGES[currentStage].id;
  const currentSubstageConfig = activeSubstages[currentStageId];
  
  const computeCurrentSubstageId = () => {
      if (!currentSubstageConfig || currentSubstageConfig.length === 0) return null;
      
      const state = substageState?.[currentStageId];
      const order = state?.order || currentSubstageConfig.map(s => s.id);
      const firstPending = order.findIndex(id => state?.statusById?.[id] !== 'confirmed');
      if (firstPending === -1) return order.length > 0 ? order[order.length - 1] : 'goal_discovery';
      return order[firstPending];
  };
  
  const currentSubstageId = computeCurrentSubstageId();
  const currentSubstageIndex = currentSubstageConfig ? Math.max(0, currentSubstageConfig.findIndex(s => s.id === currentSubstageId)) : -1;

  const getSubstageGuidance = (subId) => {
      if (subId === 'goal_discovery') return "Let's capture the basics: goal name, target date, target amount, and any key details.";
      if (subId === 'assumptions') return "Now set your key assumptions (return, inflation, risk attitude, cashflow flexibility).";
    if (subId === 'gap_analysis') return "Let's quantify your gap: income, assets, debts, and policy notes.";
    return "Provide details to continue.";
  };

  const updateSubstageStatus = (stageId, subId, status) => {
      if (!activeSubstages[stageId]) return;
      setSubstageState(prev => {
          const stage = prev[stageId] || { order: activeSubstages[stageId].map(s => s.id), statusById: {} };
          return {
              ...prev,
              [stageId]: {
                  ...stage,
                  statusById: {
                      ...stage.statusById,
                      [subId]: status
                  }
              }
          };
      });
  };

  // Execute substage with user-granted permissions
  const executeSubstageWithPermission = async (nextSubId, allowlist) => {
      const stageId = 'definition';
      const config = activeSubstages[stageId];
      
      const nextIdx = config.findIndex(s => s.id === nextSubId);
      setSubstageState(prev => ({
          ...prev,
          [stageId]: {
              ...prev[stageId],
              currentIndex: nextIdx
          }
      }));
      
      setIsLoadingAI(true);
      
      const nextLabel = config.find(s => s.id === nextSubId)?.label || nextSubId;
      let aiMsgIndex = 0;
      setMessages(prev => {
          aiMsgIndex = prev.length;
          return [...prev, { 
              role: 'assistant', 
              text: `Preparing ${nextLabel}...`,
              isTyping: true,
              isStreaming: true
          }];
      });

      try {
          let accumulatedRaw = '';
          
          const data = await goalEngineService.generateDecisionStream({
              stage: 'definition',
              goalContext: {
                  ...goalContext,
                  substage: nextSubId
              },
              allowAIDataSharing: true,
              dataAllowlist: allowlist,
              userInput: { text: '' },
              substageData: substageData.definition || {},
              previousDecisions: [],
              useRag
          }, (chunk) => {
              accumulatedRaw += chunk;
              const streamingThought = extractField('thought_process', accumulatedRaw);
              const streamingRationale = extractField('rationale', accumulatedRaw);

              setMessages(prev => {
                  const newMessages = [...prev];
                  if (newMessages[aiMsgIndex]) {
                      const displayText = streamingRationale || streamingThought || `Analyzing ${nextLabel}...`;
                      
                      newMessages[aiMsgIndex] = {
                          ...newMessages[aiMsgIndex],
                          text: displayText,
                          thought_process: streamingThought,
                          isStreaming: true
                      };
                  }
                  return newMessages;
              });
          });

          setMessages(prev => {
              const updated = [...prev];
              if (updated[aiMsgIndex]) {
                  const aiDecision = data?.ai_decision;
                  const finalText = aiDecision?.rationale || accumulatedRaw || `${nextLabel} analysis complete.`;
                  
                  if (aiDecision) {
                      handleContextUpdate({ ai_decision: aiDecision });
                  }
                  
                  updated[aiMsgIndex] = {
                      ...updated[aiMsgIndex],
                      text: finalText,
                      thought_process: aiDecision?.thought_process,
                      isTyping: false,
                      isStreaming: false,
                      ai_decision: aiDecision
                  };
              }
              return updated;
          });
          
          setTimeout(() => {
              setIsLoadingAI(false);
          }, 400);
      } catch (err) {
          console.error('[Substage Execution] Error:', err);
          setMessages(prev => {
              const updated = [...prev];
              if (updated[aiMsgIndex]) {
                  updated[aiMsgIndex] = {
                      ...updated[aiMsgIndex],
                      text: `⚠️ Error executing ${nextSubId}. Please try again.`,
                      isTyping: false,
                      isStreaming: false
                  };
              }
              return updated;
          });
          
          setTimeout(() => {
              setIsLoadingAI(false);
          }, 400);
      }
  };

  // Execute substage - core logic extracted for permission flow
  const handleSubstageSubmit = async (stageId, subId, payload) => {
      handleContextUpdate(payload);
      
      const updatedSubstageData = {
          ...substageData,
          [stageId]: {
              ...(substageData[stageId] || {}),
              [subId]: { data: payload, dirty: false }
          }
      };
      setSubstageData(updatedSubstageData);
      setStageSummary(prev => ({ ...prev, [stageId]: { confirmed: false } }));
      
      setRecalcFlags(prev => ({
          ...prev,
          [stageId]: { ...(prev[stageId] || {}), [subId]: false }
      }));

      const config = activeSubstages[stageId];
      const currentState = substageState[stageId] || { 
          order: activeSubstages[stageId].map(s => s.id), 
          statusById: {} 
      };
      
      const newStatusById = {
          ...currentState.statusById,
          [subId]: 'confirmed'
      };
      
      let nextSubId = null;
      if (config) {
         const firstIncomplete = config.findIndex((item) => {
             return newStatusById[item.id] !== 'confirmed';
         });
         
         if (firstIncomplete !== -1) {
             nextSubId = config[firstIncomplete].id;
         }
      }
      
      setSubstageState(prev => {
          const stage = prev[stageId] || currentState;
          
          return {
              ...prev,
              [stageId]: {
                  ...stage,
                  statusById: newStatusById
              }
          };
      });

    if (stageId === 'definition') {
        if (!nextSubId) {
            setMessages(prev => [...prev, { 
                role: 'system', 
                text: "✓ All substages completed! Click 'Confirm & continue' below to proceed to Strategy stage." 
            }]);
            return;
        }
        
        if (nextSubId === 'summary') {
            const nextIdx = config.findIndex(s => s.id === nextSubId);
            setSubstageState(prev => ({
                ...prev,
                [stageId]: {
                    ...prev[stageId],
                    currentIndex: nextIdx
                }
            }));
            
            setMessages(prev => [...prev, { 
                role: 'system', 
                text: "Your plan is ready for review. Please check the summary and confirm to proceed." 
            }]);
            return;
        }

        const requiredTypes = getRequiredDataTypes(
            'definition', 
            nextSubId, 
            goalContext?.category
        );
        
        const needsPermission = shouldShowPermissionCard(
            'definition',
            nextSubId,
            goalContext?.category,
            allowAIDataSharing
        );
        
        if (needsPermission) {
            const confirmedLabel = config.find(s => s.id === subId)?.label || subId;
            setMessages(prev => [...prev, { 
                role: 'user', 
                text: `✓ ${confirmedLabel} confirmed` 
            }]);
            
            setPendingQuery(`auto_substage:${nextSubId}`);
            setRequestedDataTypes(requiredTypes);
            setSelectedAllowlist(requiredTypes);
            setShowPermissionCard(true);
            return;
        }
        
        const confirmedLabel = config.find(s => s.id === subId)?.label || subId;
        setMessages(prev => [...prev, { 
            role: 'user', 
            text: `✓ ${confirmedLabel} confirmed` 
        }]);
        
        const allowlist = allowAIDataSharing ? ['all'] : selectedAllowlist;
        await executeSubstageWithPermission(nextSubId, allowlist);
        return;
    }
  };

  const handleSubstageEdit = (stageId, subId) => {
      updateSubstageStatus(stageId, subId, 'collecting');
      
      setRecalcFlags(prev => ({
          ...prev,
          [stageId]: { ...(prev[stageId] || {}), [subId]: true }
      }));
      
      setStageSummary(prev => ({ ...prev, [stageId]: { confirmed: false } }));
      
      const config = activeSubstages[stageId];
      if (config) {
          const targetIdx = config.findIndex(s => s.id === subId);
          if (targetIdx !== -1) {
              setSubstageState(prev => ({
                  ...prev,
                  [stageId]: {
                      ...prev[stageId],
                      currentIndex: targetIdx
                  }
              }));
          }
      }
      
      const guidance = getSubstageGuidance(subId);
      setMessages(prev => [...prev, { 
          role: 'system', 
          text: `Editing ${subId.replace(/_/g, ' ')}. ${guidance}` 
      }]);
  };

  const isStageSubstagesConfirmed = (stageId) => {
      const cfg = activeSubstages[stageId];
      if (!cfg) return true;
      const statusById = substageState?.[stageId]?.statusById || {};
      return cfg.filter(s => s.required !== false).every(s => statusById[s.id] === 'confirmed');
  };

  const handleStageSummaryConfirm = (stageId) => {
      setStageSummary(prev => ({
          ...prev,
          [stageId]: { confirmed: true, timestamp: Date.now() }
      }));
  };

    const getGreeting = (stageIdx) => {
      const greetings = {
          0: "Let's define your target. I can help you calculate how much you need or check if your plan is feasible. Try one of the options below to get started:",
          1: "Now for the strategy. I'll analyze your goal timeline and suggest an asset allocation mix.",
          2: "I'm searching for investment products that match your strategy. This may take a moment...",
          3: "Final check. Ready to launch?"
      };
      return { role: 'system', text: greetings[stageIdx] || "How can I help?" };
    };

  // Restore session from localStorage
  useEffect(() => {
      try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (!raw) {
              setMessages([getGreeting(0)]);
              setIsHydrated(true);
              return;
          }
          const saved = JSON.parse(raw);
          if (saved?.goalContext) setGoalContext(saved.goalContext);
          if (typeof saved?.currentStage === 'number') setCurrentStage(saved.currentStage);
          if (Array.isArray(saved?.messages)) setMessages(saved.messages);
          if (typeof saved?.useRag === 'boolean') setUseRag(saved.useRag);
          if (saved?.chatMode) setChatMode(saved.chatMode);
          if (saved?.leftWidth) setLeftWidth(saved.leftWidth);
          if (saved?.collapsed) setCollapsed(saved.collapsed);
          if (saved?.substageState) setSubstageState(saved.substageState);
          if (saved?.substageData) setSubstageData(saved.substageData);
          if (saved?.stageSummary) setStageSummary(saved.stageSummary);
          if (saved?.recalcFlags) setRecalcFlags(saved.recalcFlags);
          if (saved?.cardExpanded) setCardExpanded(saved.cardExpanded);
          if (typeof saved?.showOnboarding === 'boolean') setShowOnboarding(saved.showOnboarding);
      } catch (err) {
          console.warn('Failed to restore local session:', err);
          setMessages([getGreeting(0)]);
      } finally {
          setIsHydrated(true);
      }
  }, []);

  // ESC key to close onboarding modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showOnboardingModal) {
        setShowOnboardingModal(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showOnboardingModal]);

  // Persist session to localStorage (lightweight)
  useEffect(() => {
      if (!isHydrated) return;
      const payload = {
          currentStage,
          goalContext,
          messages,
          useRag,
          chatMode,
          leftWidth,
          collapsed,
          substageState,
          substageData,
          stageSummary,
          recalcFlags,
          cardExpanded,
          showOnboarding
      };
      try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch (err) {
          console.warn('Failed to persist local session:', err);
      }
  }, [
      isHydrated,
      currentStage,
      goalContext,
      messages,
      useRag,
      chatMode,
      leftWidth,
      collapsed,
      substageState,
      substageData,
      stageSummary,
      recalcFlags,
      cardExpanded,
      showOnboarding
  ]);

  const handleClearLocalSession = () => {
      localStorage.removeItem(STORAGE_KEY);
      setCurrentStage(0);
      setGoalContext(buildFreshGoalContext());
      setMessages([getGreeting(0)]);
      setUseRag(true);
      setChatMode('agent');
      setCollapsed('none');
      setSubstageState(buildInitialSubstageState());
      setSubstageData({});
      setStageSummary({});
      setRecalcFlags({});
      setCardExpanded({});
      setShowOnboarding(true);
  };

  // Handle quick start from onboarding guide
  const handleQuickStart = (prompt) => {
      setQuickStartPrompt(prompt);
      setTimeout(() => setQuickStartPrompt(null), 100);
  };

  // Expand collapsed panel back to 50/50 split
  const handleExpand = () => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      setLeftWidth(containerRect.width / 2);
      setCollapsed('none');
  };

  // Fetch real goals for enrichment
  const [realGoals, setRealGoals] = useState([]);
  const [cashFlows, setCashFlows] = useState([]);

  useEffect(() => {
    const fetchRealData = async () => {
        try {
            const [goalsData, cfData] = await Promise.all([
                getGoals(),
                getCashFlows()
            ]);
            setRealGoals(goalsData || []);
            setCashFlows(cfData || []);
        } catch (err) {
            console.error('Failed to fetch real data for enrichment:', err);
        }
    };
    fetchRealData();
  }, []);

  // Derive monthly surplus from cashflows
  useEffect(() => {
    if (!cashFlows || cashFlows.length === 0) return;

    const TO_ANNUAL = { 'Weekly': 52, 'Fortnightly': 26, 'Monthly': 12, 'Yearly': 1, 'One-Off': 0 };
    const toAnnual = (amount, freq) => (Number(amount) || 0) * (TO_ANNUAL[freq] || 0);

    const incomes = cashFlows.filter(f => f.type === 'Income');
    const outflows = cashFlows.filter(f => f.type === 'Expense' || f.type === 'Subscription');

    const annualIncome = incomes.reduce((sum, f) => sum + toAnnual(f.amount, f.frequency), 0);
    const annualOutflow = outflows.reduce((sum, f) => sum + toAnnual(f.amount, f.frequency), 0);

    const monthlyIncome = annualIncome / 12;
    const monthlyOutflow = annualOutflow / 12;
    const monthlySurplus = Math.max(0, monthlyIncome - monthlyOutflow);

    setGoalContext(prev => {
      const existingFinancials = prev.simulation_data?.financials || {};
      const reservePct = existingFinancials.reserve_for_other_goals_pct ?? 25;
      const allocatable = Math.max(0, Math.round(monthlySurplus * (1 - reservePct / 100)));

      return {
        ...prev,
        simulation_data: {
          ...(prev.simulation_data || {}),
          financials: {
            ...existingFinancials,
            monthly_income: Math.round(monthlyIncome),
            monthly_outflow: Math.round(monthlyOutflow),
            monthly_surplus_total: Math.round(monthlySurplus),
            monthly_surplus_allocatable: Math.round(allocatable),
            reserve_for_other_goals_pct: reservePct
          },
          user_profile: {
            ...(prev.simulation_data?.user_profile || {}),
            monthly_surplus: Math.round(monthlySurplus)
          }
        }
      };
    });
  }, [cashFlows]);

  const stageAnalysisRunningRef = useRef(false);
  const runStageAnalysis = async (stageId, context, stageIdx) => {
      if (stageAnalysisRunningRef.current) return;
      stageAnalysisRunningRef.current = true;
      setIsLoadingAI(true);
      
      const greeting = getGreeting(stageIdx);
      const analyzingMsg = { 
          role: 'assistant', 
          text: 'Analyzing your goal...', 
          isTyping: true,
          isStreaming: true 
      };

      setMessages([greeting, analyzingMsg]);
      const aiMsgIndex = 1;

      try {
          let accumulatedRaw = "";
          
          const currentGoalId = context?._id || context?.goal_id;
          
          const TO_ANNUAL = { 'Weekly': 52, 'Fortnightly': 26, 'Monthly': 12, 'Yearly': 1, 'One-Off': 0 };
          const toMonthly = (amount, freq) => (amount * (TO_ANNUAL[freq] || 0)) / 12;

          const processedOtherGoals = stageId === 'simulation'
            ? realGoals
                .filter(g => g._id !== currentGoalId)
                .map(g => {
                    const cf = cashFlows.find(f => f.type === 'Investment' && f.name.includes(`(${g.goal_name})`));
                    return {
                        name: g.goal_name,
                        monthly_allocation: cf ? Math.round(toMonthly(cf.amount, cf.frequency)) : 0,
                        priority: g.priority || 'want'
                    };
                })
                .filter(g => g.monthly_allocation > 0)
            : [];

          let simulationSummary = {};
          if (stageId === 'simulation') {
            const hashStringToSeed = (str = 'simulation_default') => {
              let h = 5381;
              for (let i = 0; i < str.length; i++) {
                h = ((h << 5) + h) ^ str.charCodeAt(i);
              }
              return (h >>> 0) || 1;
            };
            const simSeed = hashStringToSeed(
              context?.session_id || context?.goal_id || context?._id || 'simulation_default',
            );

            const targetDate = context?.due_date
              ? new Date(context.due_date)
              : new Date(Date.now() + 10 * 365.25 * 24 * 60 * 60 * 1000);
            const horizonYears = Math.max(
              1,
              Math.round((targetDate - new Date()) / (365.25 * 24 * 60 * 60 * 1000)),
            );

            const exposure =
              context?.ai_decision?.strategy_recommendation?.economic_exposure || {
                growth: 60,
                defensive: 30,
                liquidity: 10,
              };
            const glidePath =
              context?.ai_decision?.strategy_recommendation?.glide_path ||
              context?.glide_path ||
              null;
            const contribution =
              context?.ai_decision?.strategy_recommendation?.contribution_strategy ||
              context?.contribution ||
              {};
            const monthlyContribution = contribution.monthly_amount || contribution.amount || 0;
            const lumpSum = contribution.lump_sum_amount || 0;
            const targetAmount = context?.target_amount || context?.goal_details?.target_amount || 0;
            const currentAmount = context?.current_amount || 0;

            try {
              const simParams = {
                initialCapital: currentAmount,
                lumpSum,
                monthlyContribution,
              };
              const mc = runMonteCarlo(simParams, exposure, horizonYears, glidePath, simSeed, targetAmount);
              const finalYear = mc.summaryData[mc.summaryData.length - 1] || {};
              
              const successProb = mc.realSuccessProbability !== null 
                ? mc.realSuccessProbability 
                : 0;

              simulationSummary = {
                horizon_years: horizonYears,
                expected_return_pct: Number((mc.expectedReturn).toFixed(1)),
                volatility_pct: Number((mc.volatility).toFixed(1)),
                monthly_contribution: monthlyContribution,
                lump_sum: lumpSum,
                target_amount: targetAmount,
                current_amount: currentAmount,
                p90_final: finalYear.high,
                p50_final: finalYear.median,
                p10_final: finalYear.low,
                contributions_final: finalYear.contributions,
                success_probability_pct: Math.round(successProb),
                glide_path_enabled: !!glidePath?.enabled,
              };
            } catch (err) {
              console.warn('Simulation summary build failed', err);
            }
          }

          const otherGoalsData = extractOtherGoalsMonthly(realGoals, currentGoalId);
          const otherGoalsMonthlyTotal = otherGoalsData.reduce((sum, g) => sum + (g.monthly_allocation || 0), 0);
          
          const financialsSnapshot = computeFinancialsFromCashFlows(cashFlows, {
            reservePct: context?.simulation_data?.financials?.reserve_for_other_goals_pct ?? 25,
            otherGoalsMonthly: otherGoalsMonthlyTotal
          });

          const reservePct = context?.simulation_data?.financials?.reserve_for_other_goals_pct ?? 25;
          const surplusTotal = financialsSnapshot.monthly_surplus_total || 0;
          const afterOtherGoals = Math.max(0, surplusTotal - otherGoalsMonthlyTotal);
          const surplusAllocatable = Math.round(afterOtherGoals * (1 - reservePct / 100));

          const contextWithOthers = {
            ...context,
            simulation_data: {
              ...(context?.simulation_data || {}),
              financials: {
                ...(context?.simulation_data?.financials || {}),
                ...financialsSnapshot,
                monthly_surplus_allocatable: surplusAllocatable,
                reserve_for_other_goals_pct: reservePct,
                locked_allocations: otherGoalsMonthlyTotal,
                available_for_goals: surplusAllocatable
              },
              other_goals: processedOtherGoals.length > 0 ? processedOtherGoals : otherGoalsData,
              projection_summary: Object.keys(simulationSummary).length > 0 ? simulationSummary : context?.simulation_data?.projection_summary
            }
          };

          if (stageId === 'simulation') {
            setGoalContext(prev => ({
              ...prev,
              simulation_data: {
                ...(prev.simulation_data || {}),
                other_goals: processedOtherGoals.length > 0 ? processedOtherGoals : prev.simulation_data?.other_goals
              }
            }));
          }

          const data = await goalEngineService.generateDecisionStream({
              stage: stageId,
              goalContext: contextWithOthers,
              useRag,
              allowAIDataSharing
          }, (chunk) => {
              accumulatedRaw += chunk;
              const streamingThought = extractField('thought_process', accumulatedRaw);
              const streamingRationale = extractField('rationale', accumulatedRaw);

              setMessages(prev => {
                  const newMessages = [...prev];
                  if (newMessages[aiMsgIndex]) {
                      newMessages[aiMsgIndex] = {
                          ...newMessages[aiMsgIndex],
                          text: streamingRationale || (streamingThought ? "Structuring strategy..." : "Analyzing..."),
                          thought_process: streamingThought,
                      };
                  }
                  return newMessages;
              });
          });
          
          if (data?.ai_decision) {
              handleContextUpdate(data.ai_decision);
              
              setMessages(prev => {
                  const newMessages = [...prev];
                  if (newMessages[aiMsgIndex]) {
                      newMessages[aiMsgIndex] = {
                          ...newMessages[aiMsgIndex],
                          text: data.text || data.ai_decision.rationale,
                          isTyping: false,
                          isStreaming: false,
                          thought_process: data.ai_decision.thought_process,
                          references: data.ai_decision.references,
                          rag_summary: data.ai_decision.rag_summary
                      };
                  }
                  return newMessages;
              });
          } else {
              console.warn('[Goal Engine] AI Decision missing during stage transition');
              const fallbackDecision = {
                  goal_name: extractField('goal_name', accumulatedRaw),
                  category: extractField('category', accumulatedRaw),
                  priority: extractField('priority', accumulatedRaw),
                  target_amount: Number(extractField('target_amount', accumulatedRaw)) || undefined,
                  due_date: extractField('due_date', accumulatedRaw)
              };

              Object.keys(fallbackDecision).forEach(key => fallbackDecision[key] === undefined && delete fallbackDecision[key]);

              if (Object.keys(fallbackDecision).length > 0) {
                  handleContextUpdate(fallbackDecision);
              }

              setMessages(prev => {
                  const newMessages = [...prev];
                  if (newMessages[aiMsgIndex]) {
                      newMessages[aiMsgIndex] = {
                          ...newMessages[aiMsgIndex],
                          text: extractField('rationale', accumulatedRaw) || "Analysis complete.",
                          isTyping: false,
                          isStreaming: false,
                          thought_process: extractField('thought_process', accumulatedRaw)
                      };
                  }
                  return newMessages;
              });
          }
      } catch (err) {
          console.error("Auto-Analysis Failed:", err);
          setMessages(prev => [...prev, { role: 'system', text: "Strategy analysis failed. You can continue manually." }]);
      } finally {
          setIsLoadingAI(false);
          stageAnalysisRunningRef.current = false;
      }
  };

  const runProductAnalysis = async (context, stageIdx) => {
      setIsLoadingAI(true);
      
      const greeting = getGreeting(stageIdx);
      const analyzingMsg = { 
          role: 'assistant', 
          text: 'Initializing product search...', 
          isTyping: true,
          isStreaming: true,
          thought_process: 'Preparing to search for investments matching your strategy...'
      };

      setMessages([greeting, analyzingMsg]);
      const aiMsgIndex = 1;

      try {
          let accumulatedThought = '';
          
          const data = await goalEngineService.generateDecisionStream({
              stage: 'product',
              goalContext: context,
              useRag,
              allowAIDataSharing
          }, (chunk) => {
              const thought = extractField('thought_process', chunk);
              const rationale = extractField('rationale', chunk);
              
              if (thought && thought !== accumulatedThought) {
                  accumulatedThought = thought;
                  setMessages(prev => {
                      const newMessages = [...prev];
                      if (newMessages[aiMsgIndex]) {
                          newMessages[aiMsgIndex] = {
                              ...newMessages[aiMsgIndex],
                              text: rationale || 'Searching for products...',
                              thought_process: thought,
                          };
                      }
                      return newMessages;
                  });
              }
              
              if (rationale) {
                  setMessages(prev => {
                      const newMessages = [...prev];
                      if (newMessages[aiMsgIndex]) {
                          newMessages[aiMsgIndex] = {
                              ...newMessages[aiMsgIndex],
                              text: rationale,
                          };
                      }
                      return newMessages;
                  });
              }
          });
          
          const aiDecision = data?.ai_decision;
          const displayText = data?.text || aiDecision?.rationale || "I've found some suitable products for your goal.";
          
          if (aiDecision) {
              handleContextUpdate(aiDecision);
              
              setMessages(prev => {
                  const newMessages = [...prev];
                  if (newMessages[aiMsgIndex]) {
                      newMessages[aiMsgIndex] = {
                          ...newMessages[aiMsgIndex],
                          text: displayText,
                          isTyping: false,
                          isStreaming: false,
                          thought_process: aiDecision.thought_process,
                          references: aiDecision.references,
                          rag_summary: aiDecision.rag_summary
                      };
                  }
                  return newMessages;
              });
          } else {
              console.warn('[Product Analysis] No ai_decision in response');
              setMessages(prev => {
                  const newMessages = [...prev];
                  if (newMessages[aiMsgIndex]) {
                      newMessages[aiMsgIndex] = {
                          ...newMessages[aiMsgIndex],
                          text: displayText || "Product search complete. Please review the options below.",
                          isTyping: false,
                          isStreaming: false
                      };
                  }
                  return newMessages;
              });
          }
      } catch (err) {
          console.error("Product Analysis Failed:", err);
          setMessages(prev => {
              const newMessages = [...prev];
              if (newMessages[aiMsgIndex]) {
                  newMessages[aiMsgIndex] = {
                      ...newMessages[aiMsgIndex],
                      text: "Product search encountered an issue. Please try again or select products manually.",
                      isTyping: false,
                      isStreaming: false
                  };
              }
              return newMessages;
          });
      } finally {
          setIsLoadingAI(false);
      }
  };

  const handleNext = async () => {
      if (currentStageId === 'definition') {
          const allConfirmed = isStageSubstagesConfirmed('definition');
          
          if (!allConfirmed) {
              const cfg = activeSubstages.definition;
              const statusById = substageState?.definition?.statusById || {};
              const missing = cfg?.filter(s => s.required !== false && statusById[s.id] !== 'confirmed')
                                 .map(s => s.label || s.id);
              alert(`Please complete and confirm all substages before continuing.\n\nMissing: ${missing.join(', ')}`);
              return;
          }
          if (!stageSummary.definition?.confirmed) {
              alert('Please confirm the stage summary before continuing.');
              return;
          }
      }

      if (currentStage < STAGES.length - 1) {
          const nextStageIndex = currentStage + 1;
          const nextStageId = STAGES[nextStageIndex].id;
          
          setCurrentStage(nextStageIndex);
          
          if (nextStageId === 'strategy') {
              runStageAnalysis(nextStageId, goalContext, nextStageIndex);
          } else if (nextStageId === 'product') {
              runProductAnalysis(goalContext, nextStageIndex);
          } else if (nextStageId === 'simulation') {
              setIsLoadingAI(true);
              
              setTimeout(() => {
                  setIsLoadingAI(false);
              }, 1000 + Math.random() * 500);
              
              runStageAnalysis(nextStageId, goalContext, nextStageIndex);
          } else {
              setMessages([getGreeting(nextStageIndex)]);
          }
      }
  };

  const handleBack = () => {
      if (currentStage > 0) {
          const prevStageIdx = currentStage - 1;
          setCurrentStage(prevStageIdx);
          setMessages([getGreeting(prevStageIdx)]);
      }
  };

  const handleFinalCommit = async () => {
      setSubmitting(true);
      try {
          const sessionId = goalContext.session_id || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          const result = await createGoalWithPlan({
              ...goalContext,
              session_id: sessionId,
              selectedPortfolio: goalContext.selectedPortfolio || 
                  goalContext.product ||
                  goalContext.ai_decision?.portfolio_options?.find(p => p.option_id === goalContext.selectedPortfolioId) ||
                  goalContext.ai_decision?.portfolio_options?.[0]
          });
          
          console.log('Goal created successfully:', result);
          navigate('/goals');
      } catch (error) {
          console.error('Failed to create goal:', error);
          alert('Failed to create goal. Please try again.');
      } finally {
          setSubmitting(false);
      }
  };

  const getSubstageStatus = (stageId, subId) => substageState?.[stageId]?.statusById?.[subId] || 'collecting';

  const buildDataLines = (stageId, subId) => {
      const payload = substageData?.[stageId]?.[subId]?.data || {};
      const fmt = (val) => val ? (typeof val === 'number' && val > 999 ? `$${val.toLocaleString()}` : val) : '—';
      
      if (subId === 'goal_discovery') {
          const lines = [
            { label: 'Goal', value: payload.goal_name || goalContext.goal_name || '—' },
            { label: 'Category', value: (payload.category || goalContext.category || '—').replace(/_/g, ' ') }
          ];
          
          if (goalContext.category === 'retirement') {
              lines.push(
                  { label: 'Annual Expense', value: fmt(payload.living_expense_pa || goalContext.goal_details?.living_expense_pa) },
                  { label: 'Location', value: payload.location || goalContext.goal_details?.location || '—' }
              );
          } else if (goalContext.category === 'home') {
              lines.push(
                  { label: 'Property Price', value: fmt(payload.property_price_estimate || goalContext.goal_details?.property_price_estimate) },
                  { label: 'Deposit %', value: payload.deposit_percentage || goalContext.goal_details?.deposit_percentage || '—' }
              );
          } else {
              lines.push(
                  { label: 'Target Amount', value: fmt(payload.target_amount || goalContext.target_amount) },
                  { label: 'Due Date', value: payload.due_date || goalContext.due_date || '—' }
              );
          }
          
          return lines;
      }
      
      if (subId === 'assumptions') {
          const lines = [
            { label: 'Expected Return', value: `${payload.expected_return_pct ?? goalContext.goal_details?.expected_return_pct ?? '—'}%` },
            { label: 'Inflation', value: `${payload.inflation_pct ?? goalContext.goal_details?.inflation_pct ?? '—'}%` },
            { label: 'Risk Attitude', value: (payload.risk_attitude || goalContext.goal_details?.risk_attitude || '—').replace(/_/g, ' ') }
          ];
          
          if (goalContext.category === 'retirement') {
              lines.push(
                  { label: 'Retirement Age', value: payload.retirement_age ?? goalContext.goal_details?.retirement_age ?? '—' },
                  { label: 'Planning Until', value: payload.life_expectancy ?? goalContext.goal_details?.life_expectancy ?? '—' }
              );
          }
          
          return lines;
      }
      
      if (subId === 'gap_analysis') {
          const lines = [
            { label: 'Liquid Savings', value: fmt(payload.liquid_assets) },
            { label: 'Investments', value: fmt(payload.investments) }
          ];
          
          if (goalContext.category === 'retirement') {
              lines.unshift({ label: 'KiwiSaver Balance', value: fmt(payload.current_super_balance || goalContext.goal_details?.current_super_balance) });
          }
          
          return lines;
      }
      
      return [];
  };

  const renderDefinitionSubstageBody = (subId, needsRecompute = false) => {
      const subData = substageData.definition?.[subId]?.data || {};
      
      const createSubmitHandler = (transformPayload) => (payload) => {
          const finalPayload = transformPayload ? transformPayload(payload) : payload;
          handleSubstageSubmit('definition', subId, finalPayload);
      };

      if (hasCustomForm(goalContext.category)) {
          const submitHandler = subId === 'gap_analysis' 
              ? createSubmitHandler((payload) => {
                  handleContextUpdate({ 
                      simulation_data: { 
                          financials: { 
                              ...goalContext.simulation_data?.financials, 
                              gap_inputs: payload 
                          } 
                      } 
                  });
                  return payload;
              })
              : createSubmitHandler();

          const customForm = renderGoalForm(goalContext.category, {
              activeSubstage: subId,
              substageData: subData,
              initialValues: goalContext,
              onChange: handleContextUpdate,
              onSubstageSubmit: submitHandler,
              needsRecompute
          });

          if (customForm) return customForm;
      }
      
      if (subId === 'goal_discovery') {
          return (
              <GoalDefinitionForm
                  onSubmit={createSubmitHandler()}
                  onChange={handleContextUpdate}
                  initialValues={goalContext}
                  submitLabel="Save & Continue"
              />
          );
      }

      if (subId === 'assumptions') {
          return (
              <AssumptionForm
                  initialValues={subData}
                  onSubmit={createSubmitHandler()}
              />
          );
      }

      if (subId === 'gap_analysis') {
          const gapMergeLogic = (payload) => {
              handleContextUpdate({ 
                  simulation_data: { 
                      financials: { 
                          ...goalContext.simulation_data?.financials, 
                          gap_inputs: payload 
                      } 
                  } 
              });
              return payload;
          };
          
        return (
            <GapAnalysisForm
                initialValues={subData}
                onSubmit={createSubmitHandler(gapMergeLogic)}
            />
        );
    }

    return null;
  };

  const allDefinitionConfirmed = isStageSubstagesConfirmed('definition');

  // Auto-collapse cards when all are confirmed
  useEffect(() => {
      if (allDefinitionConfirmed) {
          setCardExpanded({});
      }
  }, [allDefinitionConfirmed]);

  // Dragging Logic
  const startResizing = (e) => {
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing || !containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      let newWidth = e.clientX - containerRect.left;
      
      const minWidth = 320;
      const collapseThreshold = 100;
      const maxWidth = containerRect.width * 0.6;
      
      if (newWidth < collapseThreshold) {
        setCollapsed('left');
        return;
      }
      
      if (newWidth > containerRect.width - collapseThreshold) {
        setCollapsed('right');
        return;
      }
      
      if (collapsed !== 'none') setCollapsed('none');
      if (newWidth < minWidth) newWidth = minWidth;
      if (newWidth > maxWidth) newWidth = maxWidth;
      
      setLeftWidth(newWidth);
    };

    const stopResizing = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', stopResizing);
      document.body.style.cursor = 'col-resize';
    } else {
      document.body.style.cursor = 'default';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, collapsed]);

  // When entering a new collecting substage in Definition, append guidance to chat
  useEffect(() => {
      if (currentStageId !== 'definition' || !currentSubstageId) return;
      const status = getSubstageStatus('definition', currentSubstageId);
      if (status !== 'collecting') return;

      const guidance = getSubstageGuidance(currentSubstageId);
      setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last && last.role === 'system' && last.text === guidance) return prev;
          return [...prev, { role: 'system', text: guidance }];
      });
  }, [currentStageId, currentSubstageId, substageState]);

  return (
    <MainLayout>
      <div className="max-w-[2400px] mx-auto p-1.5 md:p-3 lg:p-4 h-[calc(100vh-64px)] flex flex-col animate-fade-in overflow-hidden">
        
        {/* Top Bar: Progress Stepper */}
        <div className="flex items-center justify-between mb-1.5 lg:mb-4 px-1 lg:px-2 shrink-0">
            <div className="flex items-center gap-2">
                <button onClick={() => navigate('/goals')} className="p-1 hover:bg-slate-100 rounded-lg lg:rounded-xl transition-colors">
                    <ChevronLeft className="text-slate-400" size={18} />
                </button>
                <h1 className="text-base lg:text-xl font-bold text-slate-900">Goal Engine</h1>
            </div>
            
            <div className="hidden md:flex items-center gap-1.5 lg:gap-2">
                {STAGES.map((stage, idx) => {
                    const Icon = stage.icon;
                    const isActive = idx === currentStage;
                    const isCompleted = idx < currentStage;
                    
                    return (
                        <div key={stage.id} className="flex items-center">
                            <div className={`
                                flex items-center gap-2 px-3 lg:px-4 py-1.5 lg:py-2 rounded-full text-xs lg:text-sm font-bold transition-all
                                ${isActive ? 'bg-slate-900 text-white shadow-lg' : 
                                  isCompleted ? 'bg-slate-100 text-slate-900' : 'text-slate-300'}
                            `}>
                                <Icon size={14} />
                                <span className={!isActive ? "hidden xl:inline" : ""}>{stage.label}</span>
                            </div>
                            {idx < STAGES.length - 1 && (
                                <div className="flex flex-col items-center">
                                    <div className={`w-10 lg:w-14 h-0.5 ${isCompleted ? 'bg-slate-200' : 'bg-slate-100'}`}></div>
                                    <div className={`w-2 h-2 rounded-full -mt-1 ${isCompleted ? 'bg-green-500' : 'bg-slate-200'}`}></div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => setShowOnboardingModal(true)}
                    className="hidden md:flex items-center justify-center w-8 h-8 rounded-full text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                    title="How to use Goal Engine"
                >
                    <HelpCircle size={18} />
                </button>
                
                <button
                    type="button"
                    onClick={handleClearLocalSession}
                    className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 hover:bg-slate-200 transition"
                    title="Clear local session"
                >
                    Clear local
                </button>
                <div className="w-4 md:w-6 lg:w-10"></div>
            </div>
        </div>

        {/* Main Split View - RESIZABLE LAYOUT */}
        <div 
            ref={containerRef}
            className={`flex-1 flex flex-col lg:flex-row gap-0 min-h-0 overflow-hidden relative ${isResizing ? 'select-none' : ''}`}
        >
            
            {/* LEFT COPILOT */}
            <div 
                className={`
                    order-2 lg:order-1
                    h-[280px] lg:h-full 
                    bg-white/50 border border-slate-100 rounded-xl lg:rounded-[2rem] backdrop-blur-sm 
                    flex flex-col overflow-hidden
                    transition-all duration-300
                    ${collapsed === 'left' ? 'lg:w-0 lg:p-0 lg:border-0 lg:opacity-0' : 'p-2 lg:p-4'}
                `}
                style={{ width: window.innerWidth >= 1024 && collapsed !== 'left' ? `${leftWidth}px` : (collapsed === 'left' && window.innerWidth >= 1024 ? '0px' : '100%') }}
            >
                {collapsed !== 'left' && (
                    <Copilot 
                        stage={currentStage} 
                        currentStageLabel={STAGES[currentStage].id}
                        goalContext={goalContext}
                        onUpdateContext={handleContextUpdate}
                        messages={messages}
                        setMessages={setMessages}
                        useRag={useRag}
                        setUseRag={setUseRag}
                        mode={chatMode}
                        setMode={setChatMode}
                        allowAIDataSharing={allowAIDataSharing}
                        setAllowAIDataSharing={setAllowAIDataSharing}
                        pendingQuery={pendingQuery}
                        setPendingQuery={setPendingQuery}
                        showPermissionCard={showPermissionCard}
                        setShowPermissionCard={setShowPermissionCard}
                        requestedDataTypes={requestedDataTypes}
                        setRequestedDataTypes={setRequestedDataTypes}
                        selectedAllowlist={selectedAllowlist}
                        setSelectedAllowlist={setSelectedAllowlist}
                        onExecuteSubstageWithPermission={executeSubstageWithPermission}
                        quickStartPrompt={quickStartPrompt}
                        isLoadingAI={isLoadingAI}
                        setIsLoadingAI={setIsLoadingAI}
                    />
                )}
            </div>

            {/* LEFT COLLAPSED EXPAND BUTTON */}
            {collapsed === 'left' && (
                <button
                    onClick={handleExpand}
                    className="
                        hidden lg:flex
                        absolute left-4 top-1/2 -translate-y-1/2 z-30
                        w-10 h-20 bg-white border-2 border-brand-500 rounded-r-xl
                        items-center justify-center
                        hover:w-12 hover:bg-brand-50 transition-all
                        shadow-lg
                        group
                    "
                    title="Expand Chat"
                >
                    <ChevronRight size={20} className="text-brand-600 group-hover:text-brand-700" />
                </button>
            )}

            {/* RESIZER HANDLE */}
            {collapsed === 'none' && (
                <div 
                    onMouseDown={startResizing}
                    className="
                        hidden lg:flex 
                        absolute top-0 bottom-0 z-20
                        w-2 cursor-col-resize items-center justify-center
                        transition-all hover:bg-brand-500/10
                    "
                    style={{ left: `${leftWidth - 4}px` }}
                >
                    <div className={`w-1 rounded-full transition-all ${isResizing ? 'bg-brand-500 h-24 w-1.5' : 'bg-slate-200 h-12 group-hover:bg-brand-300'}`}></div>
                </div>
            )}

            {/* RIGHT CANVAS */}
            <div 
                className={`
                    order-1 lg:order-2
                    flex-1 lg:h-full 
                    bg-white border border-slate-100 rounded-xl lg:rounded-[2rem] shadow-sm 
                    flex flex-col overflow-hidden min-w-0
                    transition-all duration-300
                    ${collapsed === 'right' ? 'lg:w-0 lg:p-0 lg:border-0 lg:opacity-0' : (showOnboarding && currentStage === 0 ? 'p-0' : 'p-3 md:p-4 lg:p-8')}
                `}
            >
                {collapsed !== 'right' && (
                <>
                {showOnboarding && currentStage === 0 ? (
                    <OnboardingGuide 
                        mode="page"
                        onClose={() => setShowOnboarding(false)}
                        onQuickStart={handleQuickStart}
                    />
                ) : (
                <>
               <div className="flex-1 overflow-y-auto pb-4 scrollbar-soft">
   {currentStage === 0 && (
       <div className={`max-w-3xl mx-auto py-1 ${currentSubstageId === 'summary' ? '' : 'space-y-4'}`}>
            {currentSubstageId !== 'summary' && (
               <>
                   <div className="flex items-center gap-3">
                       <h2 className="text-xl lg:text-2xl font-bold text-slate-900">
                           <span className="text-slate-900 mr-2">{goalContext.goal_name || (goalContext.category ? goalContext.category : 'Goal')} Plan:</span>
                           <span className="text-indigo-600">{currentSubstageConfig?.[currentSubstageIndex]?.label}</span>
                       </h2>
                       {recalcFlags.definition?.[currentSubstageId] && (
                           <span className="text-xs font-bold bg-amber-100 text-amber-700 px-3 py-1 rounded-full border border-amber-200 animate-pulse">
                               Update Required
                           </span>
                       )}
                   </div>
                   <p className="text-xs lg:text-sm text-slate-500">Complete each substage, confirm to lock as background, and edit anytime to recompute.</p>

                   <div className="mt-1">
                       <SubstageStepIndicator
                       config={activeSubstages.definition}
                       state={substageState.definition}
                       />
                   </div>
               </>
            )}

            <div className={currentSubstageId === 'summary' ? '' : 'space-y-3'}>
                                {(() => {
                                    const order = activeSubstages.definition.map(s => s.id);
                                    const state = substageState.definition;
                                    const currentIdx = state?.currentIndex ?? 0;

    return order.map((subId, idx) => {
        const status = getSubstageStatus('definition', subId);
        const config = activeSubstages.definition.find(s => s.id === subId);
        
        if (idx > currentIdx) return null;

        const isAtSummary = order[currentIdx] === 'summary';
        if (isAtSummary && subId !== 'summary') return null;

        if (status === 'confirmed') {
                                            const isExpanded = cardExpanded[subId];
                                            return (
                                                <ConfirmedCard
                                                    key={subId}
                                                    title={config?.label || subId}
                                                    dataLines={buildDataLines('definition', subId)}
                                                    onEdit={() => handleSubstageEdit('definition', subId)}
                                                    isExpanded={isExpanded}
                                                    onToggle={() => setCardExpanded(prev => ({ ...prev, [subId]: !prev[subId] }))}
                                                />
                                            );
                                        }

                                      if (status === 'collecting') {
                                          const hasAnyConfirmedSubstage = Object.values(state.statusById || {}).some(s => s === 'confirmed');
                                          
                                          if (isLoadingAI && idx === currentIdx) {
                                              if (!hasAnyConfirmedSubstage) {
                                                  return (
                                                      <div key={subId} className="animate-fade-in">
                                                          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                                                              <div className="flex flex-col items-center justify-center gap-4 py-12">
                                                                  <div className="relative">
                                                                      <div className="w-16 h-16 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                                                      <Brain className="absolute inset-0 m-auto text-indigo-600" size={24} />
                                                                  </div>
                                                                  <div className="text-center">
                                                                      <div className="text-lg font-bold text-slate-900 mb-1">AI is preparing {config?.label}...</div>
                                                                      <div className="text-sm text-slate-500">Analyzing your information and generating guidance</div>
                                                                  </div>
                                                                  <div className="flex gap-2 mt-2">
                                                                      <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                                                      <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                                                      <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                                                  </div>
                                                              </div>
                                                          </div>
                                                      </div>
                                                  );
                                              } else {
                                                  return (
                                                      <div key={subId} className="animate-fade-in">
                                                          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-2xl p-6 shadow-sm">
                                                              <div className="flex items-center gap-4">
                                                                  <div className="relative flex-shrink-0">
                                                                      <div className="w-12 h-12 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                                                      <Brain className="absolute inset-0 m-auto text-indigo-600" size={20} />
                                                                  </div>
                                                                  <div className="flex-1">
                                                                      <div className="text-base font-bold text-indigo-900 mb-1">
                                                                          Preparing {config?.label}...
                                                                      </div>
                                                                      <div className="text-sm text-indigo-700">
                                                                          AI is analyzing your previous answers to guide you through this section
                                                                      </div>
                                                                  </div>
                                                                  <div className="flex gap-1.5">
                                                                      <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                                                      <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                                                      <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                                                  </div>
                                                              </div>
                                                          </div>
                                                      </div>
                                                  );
                                              }
                                          }
                                          
                                          return (
                                              <div key={subId} className="animate-fade-in">
                                                  {renderDefinitionSubstageBody(subId, recalcFlags.definition?.[subId])}
                                              </div>
                                          );
                                      }

                                        return null;
                                    });
                                })()}
                             </div>

                             {allDefinitionConfirmed && currentSubstageId !== 'summary' && (
                                <div className="animate-fade-in">
                                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mt-6">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stage Summary</div>
                                                <div className="text-sm text-slate-600">All substages completed. Confirm to proceed to Strategy.</div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    handleStageSummaryConfirm('definition');
                                                    
                                                    if (currentStage < STAGES.length - 1) {
                                                        const nextStageIndex = currentStage + 1;
                                                        const nextStageId = STAGES[nextStageIndex].id;
                                                        
                                                        setCurrentStage(nextStageIndex);
                                                        
                                                        if (nextStageId === 'strategy') {
                                                            runStageAnalysis(nextStageId, goalContext, nextStageIndex);
                                                        }
                                                    }
                                                }}
                                                className={`px-4 py-2 rounded-full text-sm font-bold ${stageSummary.definition?.confirmed ? 'bg-green-600 text-white' : 'bg-slate-900 text-white'}`}
                                            >
                                                {stageSummary.definition?.confirmed ? 'Confirmed' : 'Confirm & continue'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                             )}
                       </div>
                   )}
                   {currentStage === 1 && (
                         <div className="max-w-3xl mx-auto py-2 animate-fade-in">
                            <h2 className="text-xl lg:text-2xl font-bold text-slate-900 mb-4 lg:mb-6">Choose your Strategy</h2>
                            <StageStrategy 
                                goalContext={goalContext} 
                                onChange={setGoalContext} 
                                isLoadingAI={isLoadingAI}
                                goalsSnapshot={realGoals}
                                cashFlowsSnapshot={cashFlows}
                            />
                        </div>
                    )}
                    {currentStage === 2 && (
                         <div className="max-w-3xl mx-auto py-2 animate-fade-in">
                            <h2 className="text-xl lg:text-2xl font-bold text-slate-900 mb-4 lg:mb-6">Select Investment Vehicle</h2>
                            <StageProduct 
                                goalContext={goalContext} 
                                isLoadingAI={isLoadingAI}
                                onSelect={(portfolio) => setGoalContext({
                                    ...goalContext, 
                                    product: portfolio,
                                    selectedPortfolio: portfolio,
                                    selectedPortfolioId: portfolio.option_id
                                })} 
                            />
                        </div>
                    )}
                    {currentStage === 3 && (
                         <div className="max-w-5xl mx-auto h-full py-2 animate-fade-in">
                            <h2 className="text-xl lg:text-2xl font-bold text-slate-900 mb-4 lg:mb-6">Simulation & Impact</h2>
                            <StageSimulation goalContext={goalContext} isLoadingAI={isLoadingAI} />
                        </div>
                    )}
                </div>

                {currentStage > 0 && (
                    <div className="pt-4 lg:pt-6 mt-2 lg:mt-4 border-t border-slate-50 flex justify-between items-center shrink-0">
                        <button 
                            onClick={handleBack}
                            className="px-4 lg:px-6 py-2 lg:py-3 rounded-full text-slate-500 text-sm font-bold hover:bg-slate-50 transition-colors"
                        >
                            Back
                        </button>
                        {currentStage < 3 ? (
                            <button 
                                onClick={handleNext}
                                className="btn-primary-rounded flex items-center gap-2 px-6 lg:px-8 py-2 lg:py-3 text-sm"
                            >
                                Continue <ChevronRight size={16} />
                            </button>
                        ) : (
                             <button 
                                onClick={handleFinalCommit}
                                disabled={submitting}
                                className="btn-primary-rounded bg-green-600 hover:bg-green-700 flex items-center gap-2 px-6 lg:px-8 py-2 lg:py-3 text-sm shadow-green-200"
                            >
                                {submitting ? 'Launching...' : 'Launch Goal Plan'} <CheckCircle2 size={16} />
                            </button>
                        )}
                    </div>
                )}
                </>
                )}
                </>
                )}
            </div>

            {/* RIGHT COLLAPSED EXPAND BUTTON */}
            {collapsed === 'right' && (
                <button
                    onClick={handleExpand}
                    className="
                        hidden lg:flex
                        absolute right-4 top-1/2 -translate-y-1/2 z-30
                        w-10 h-20 bg-white border-2 border-brand-500 rounded-l-xl
                        items-center justify-center
                        hover:w-12 hover:bg-brand-50 transition-all
                        shadow-lg
                        group
                    "
                    title="Expand Form"
                >
                    <ChevronLeft size={20} className="text-brand-600 group-hover:text-brand-700" />
                </button>
            )}

        </div>

      </div>

      {showOnboardingModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowOnboardingModal(false);
            }
          }}
        >
          <div className="relative max-w-2xl w-full mx-4 animate-in slide-in-from-bottom-4 duration-300">
            <button
              onClick={() => setShowOnboardingModal(false)}
              className="absolute -top-12 right-0 text-white hover:text-slate-200 transition-colors p-2 hover:bg-white/10 rounded-lg"
              title="Close"
            >
              <X size={24} />
            </button>
            <OnboardingGuide 
              mode="modal"
              onClose={() => setShowOnboardingModal(false)}
              onQuickStart={(prompt) => {
                setShowOnboardingModal(false);
                handleQuickStart(prompt);
              }}
            />
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default GoalEnginePage;
