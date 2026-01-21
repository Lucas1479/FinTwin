import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  TrendingUp, 
  Lock, 
  Unlock,
  AlertCircle,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import GoalOptimizationPanel from '../components/goals/GoalOptimizationPanel';
import goalService from '../services/goalService';
import { fetchCashFlowsForUser } from '../services/cashFlowService';
import { computeFinancialsFromCashFlows } from '../utils/financialCalculations';

/**
 * 全局目标优化页面
 * 
 * 功能：
 * 1. 展示所有用户的goals
 * 2. 识别locked vs flexible goals
 * 3. 提供多目标优化（solver/LP）
 * 4. 生成可执行的action items
 * 
 * 与单goal创建流程的区别：
 * - 单goal创建：增量式，保护现有allocations，只计算"分配后盈余"
 * - 全局优化：全局式，可以重新平衡所有goals（包括locked的提示）
 */
const GlobalOptimizePage = () => {
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);
  const [cashFlows, setCashFlows] = useState([]);
  const [financials, setFinancials] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGoals, setSelectedGoals] = useState(new Set());
  const [mode, setMode] = useState('review'); // 'review' | 'optimize'

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [goalsData, cashFlowsData] = await Promise.all([
        goalService.getAllGoals(),
        fetchCashFlowsForUser()
      ]);
      
      setGoals(goalsData || []);
      setCashFlows(cashFlowsData || []);
      
      // 计算财务快照
      const financialsSnapshot = computeFinancialsFromCashFlows(cashFlowsData || []);
      setFinancials(financialsSnapshot);
      
      // 默认选中所有flexible goals
      const flexibleGoalIds = new Set(
        (goalsData || [])
          .filter(g => !isGoalLocked(g))
          .map(g => g._id)
      );
      setSelectedGoals(flexibleGoalIds);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const isGoalLocked = (goal) => {
    // 检查goal是否"locked"（不可轻易调整）
    // 例如：KiwiSaver, 已签约的保险, 正在还款的房贷等
    if (goal.category === 'retirement' && goal.goal_details?.current_super_balance > 0) {
      return true; // KiwiSaver通常锁定
    }
    if (goal.status === 'completed') {
      return true; // 已完成的goal
    }
    // 可以根据其他条件扩展...
    return false;
  };

  const toggleGoalSelection = (goalId) => {
    const newSet = new Set(selectedGoals);
    if (newSet.has(goalId)) {
      newSet.delete(goalId);
    } else {
      newSet.add(goalId);
    }
    setSelectedGoals(newSet);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your goals...</p>
        </div>
      </div>
    );
  }

  const lockedGoals = goals.filter(isGoalLocked);
  const flexibleGoals = goals.filter(g => !isGoalLocked(g));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <Sparkles className="text-indigo-600" size={32} />
                Global Goals Optimizer
              </h1>
              <p className="text-slate-600 mt-2">
                Review and rebalance all your financial goals to maximize your wealth potential
              </p>
            </div>
            <button
              onClick={() => navigate('/goals')}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              Back to Goals
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-indigo-50 rounded-xl p-4">
              <div className="text-sm text-indigo-600 mb-1">Total Goals</div>
              <div className="text-2xl font-bold text-indigo-900">{goals.length}</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4">
              <div className="text-sm text-green-600 mb-1">Flexible Goals</div>
              <div className="text-2xl font-bold text-green-900">{flexibleGoals.length}</div>
            </div>
            <div className="bg-amber-50 rounded-xl p-4">
              <div className="text-sm text-amber-600 mb-1">Locked Goals</div>
              <div className="text-2xl font-bold text-amber-900">{lockedGoals.length}</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="text-sm text-blue-600 mb-1">Monthly Surplus</div>
              <div className="text-2xl font-bold text-blue-900">${financials.monthly_surplus_total?.toLocaleString() || 0}</div>
            </div>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex gap-4">
            <button
              onClick={() => setMode('review')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                mode === 'review'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              1. Review Goals
            </button>
            <button
              onClick={() => setMode('optimize')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                mode === 'optimize'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              disabled={selectedGoals.size === 0}
            >
              2. Run Optimization
            </button>
          </div>
        </div>

        {/* Review Mode */}
        {mode === 'review' && (
          <div className="space-y-6">
            {/* Flexible Goals */}
            {flexibleGoals.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Unlock className="text-green-600" size={20} />
                  Flexible Goals ({flexibleGoals.length})
                </h2>
                <div className="space-y-3">
                  {flexibleGoals.map(goal => (
                    <div
                      key={goal._id}
                      className={`border-2 rounded-xl p-4 transition-all cursor-pointer ${
                        selectedGoals.has(goal._id)
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      onClick={() => toggleGoalSelection(goal._id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            selectedGoals.has(goal._id)
                              ? 'border-indigo-600 bg-indigo-600'
                              : 'border-slate-300'
                          }`}>
                            {selectedGoals.has(goal._id) && <CheckCircle2 className="text-white" size={16} />}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{goal.goal_name}</div>
                            <div className="text-sm text-slate-600">
                              Target: ${goal.target_amount?.toLocaleString() || goal.goal_details?.target_amount?.toLocaleString() || 'N/A'}
                              {goal.due_date && ` • Due: ${new Date(goal.due_date).getFullYear()}`}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="text-slate-400" size={20} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Locked Goals */}
            {lockedGoals.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Lock className="text-amber-600" size={20} />
                  Locked Goals ({lockedGoals.length})
                </h2>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="text-amber-600 mt-0.5" size={18} />
                    <div className="text-sm text-amber-800">
                      These goals have locked allocations (e.g., KiwiSaver, existing commitments).
                      They will be included in calculations but cannot be automatically adjusted.
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  {lockedGoals.map(goal => (
                    <div
                      key={goal._id}
                      className="border-2 border-amber-200 bg-amber-50 rounded-xl p-4 opacity-75"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Lock className="text-amber-600" size={18} />
                          <div>
                            <div className="font-semibold text-slate-900">{goal.goal_name}</div>
                            <div className="text-sm text-slate-600">
                              Target: ${goal.target_amount?.toLocaleString() || goal.goal_details?.target_amount?.toLocaleString() || 'N/A'}
                              {goal.due_date && ` • Due: ${new Date(goal.due_date).getFullYear()}`}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Continue Button */}
            <div className="text-center">
              <button
                onClick={() => setMode('optimize')}
                disabled={selectedGoals.size === 0}
                className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all ${
                  selectedGoals.size > 0
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg hover:shadow-xl'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
              >
                Continue to Optimization ({selectedGoals.size} {selectedGoals.size === 1 ? 'goal' : 'goals'} selected)
              </button>
            </div>
          </div>
        )}

        {/* Optimize Mode */}
        {mode === 'optimize' && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <TrendingUp className="text-indigo-600" size={20} />
              Multi-Goal Optimization
            </h2>
            
            {/* 使用现有的GoalOptimizationPanel组件 */}
            <GoalOptimizationPanel
              goalContext={{}} // 全局优化没有单一的goalContext
              goalsSnapshot={goals.filter(g => selectedGoals.has(g._id))}
              cashFlowsSnapshot={cashFlows}
              financialsSnapshot={financials}
              onApplyRecommendation={(allocations) => {
                console.log('Apply recommendations:', allocations);
                // TODO: 实现应用优化结果的逻辑
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalOptimizePage;
