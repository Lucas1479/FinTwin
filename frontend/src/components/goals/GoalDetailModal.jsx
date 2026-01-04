import { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Target, 
  TrendingUp, 
  AlertCircle, 
  Save, 
  Trash2, 
  PieChart,
  Clock,
  Shield
} from 'lucide-react';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount || 0);
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toISOString().split('T')[0]; // YYYY-MM-DD for inputs
};

const GoalDetailModal = ({ goal, onClose, onSave, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(null);

  useEffect(() => {
    if (goal) {
      // Map backend data (Goal + Plan) to form state
      setFormData({
        _id: goal._id,
        goal_name: goal.goal_name || goal.title,
        category: goal.category,
        priority: goal.priority,
        status: goal.status,
        target_amount: goal.target_amount || 0,
        current_amount: goal.current_amount || 0,
        due_date: goal.due_date || goal.target_date || '',
        notes: goal.notes || '',
        riskTolerance: goal.riskTolerance || 'middle-risk',
        
        // Flatten Plan data for the form
        contribution: {
          amount: goal.plan?.contribution?.amount || 0,
          frequency: goal.plan?.contribution?.frequency || 'monthly'
        },
        strategy_profile: goal.plan?.strategy_profile || 'balanced',
        ai_rationale: goal.plan?.ai_rationale || goal.strategy?.ai_rationale // Fallback to old field if migration pending
      });
    }
  }, [goal]);

  if (!goal || !formData) return null;

  const progress = Math.min(100, Math.max(0, (formData.current_amount / formData.target_amount) * 100)) || 0;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
        ...prev,
        [name]: value
    }));
  };

  const handleContributionChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
        ...prev,
        contribution: {
            ...prev.contribution,
            [name]: value
        }
    }));
  };

  const handleSave = () => {
      // Prepare payload for updateGoal controller
      const payload = {
          _id: formData._id,
          goal_name: formData.goal_name,
          category: formData.category,
          priority: formData.priority,
          riskTolerance: formData.riskTolerance,
          target_amount: Number(formData.target_amount),
          due_date: formData.due_date,
          notes: formData.notes,
          
          // Plan updates
          contribution: {
              amount: Number(formData.contribution.amount),
              frequency: formData.contribution.frequency
          }
          // Note: strategy_profile isn't editable in this modal yet, usually requires re-running engine
      };
      onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 transition-opacity" 
        onClick={onClose}
      ></div>

      {/* Modal Window */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-white rounded-2xl border border-slate-100 flex items-center justify-center shadow-sm text-brand-500">
                <Target size={24} />
             </div>
             <div>
                {isEditing ? (
                    <input 
                        type="text"
                        name="goal_name"
                        value={formData.goal_name}
                        onChange={handleInputChange}
                        className="text-2xl font-bold text-slate-900 bg-transparent border-b border-slate-300 focus:border-brand-500 outline-none w-full"
                    />
                ) : (
                    <h2 className="text-2xl font-bold text-slate-900">{formData.goal_name}</h2>
                )}
                <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                    <span className="capitalize">{formData.category}</span>
                    <span>•</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                        formData.status === 'Not Started' ? 'bg-yellow-100 text-yellow-700' :
                        formData.status === 'Finished' ? 'bg-brand-100 text-brand-700' :
                        'bg-green-100 text-green-700'
                    }`}>
                        {formData.status || 'In Progress'}
                    </span>
                </div>
             </div>
          </div>
          
          <div className="flex items-center gap-2">
             <button 
                onClick={() => setIsEditing(!isEditing)}
                className="p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
             >
                {isEditing ? 'Cancel' : 'Edit'}
             </button>
             <button 
                onClick={onClose}
                className="p-2.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
             >
                <X size={24} />
             </button>
          </div>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Column: Main Stats & Progress */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* Progress Section */}
                    <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                        <div className="flex justify-between items-end mb-4">
                            <div>
                                <p className="text-sm font-medium text-slate-500 mb-1">Current Progress</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-bold text-slate-900">{formatCurrency(formData.current_amount)}</span>
                                    <span className="text-lg text-slate-400 font-medium">/ {formatCurrency(formData.target_amount)}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-bold text-brand-600">{Math.round(progress)}%</p>
                            </div>
                        </div>
                        
                        <div className="relative h-4 bg-slate-200 rounded-full overflow-hidden mb-2">
                             <div 
                                className="absolute top-0 left-0 h-full bg-brand-500 rounded-full transition-all duration-1000"
                                style={{ width: `${progress}%` }}
                             ></div>
                        </div>
                        <p className="text-xs text-slate-500 text-right">
                            {Math.max(0, formData.target_amount - formData.current_amount) > 0 
                              ? `${formatCurrency(formData.target_amount - formData.current_amount)} to go`
                              : 'Goal reached!'}
                        </p>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Target Date */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                <Calendar size={16} className="text-brand-500" /> Target Date
                            </label>
                            <div className="relative">
                                <input 
                                    type="date" 
                                    name="due_date"
                                    value={formatDate(formData.due_date)}
                                    disabled={!isEditing}
                                    onChange={handleInputChange}
                                    className={`w-full p-3 rounded-xl border ${isEditing ? 'bg-white border-slate-300' : 'bg-slate-50 border-transparent'} text-slate-900 font-medium transition-colors`}
                                />
                            </div>
                        </div>

                        {/* Monthly Contribution */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                <Clock size={16} className="text-brand-500" /> Contribution Plan
                            </label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                    <input 
                                        type="number"
                                        name="amount"
                                        value={formData.contribution?.amount}
                                        disabled={!isEditing}
                                        onChange={handleContributionChange}
                                        className={`w-full pl-7 p-3 rounded-xl border ${isEditing ? 'bg-white border-slate-300' : 'bg-slate-50 border-transparent'} text-slate-900 font-medium transition-colors`}
                                    />
                                </div>
                                <select 
                                    name="frequency"
                                    value={formData.contribution?.frequency}
                                    disabled={!isEditing}
                                    onChange={handleContributionChange}
                                    className={`p-3 rounded-xl border ${isEditing ? 'bg-white border-slate-300' : 'bg-slate-50 border-transparent'} text-slate-900 font-medium transition-colors`}
                                >
                                    <option value="weekly">Weekly</option>
                                    <option value="fortnightly">Fortnightly</option>
                                    <option value="monthly">Monthly</option>
                                </select>
                            </div>
                        </div>

                        {/* Priority */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                <AlertCircle size={16} className="text-brand-500" /> Priority
                            </label>
                            <select 
                                name="priority"
                                value={formData.priority}
                                disabled={!isEditing}
                                onChange={handleInputChange}
                                className={`w-full p-3 rounded-xl border ${isEditing ? 'bg-white border-slate-300' : 'bg-slate-50 border-transparent'} text-slate-900 font-medium transition-colors capitalize`}
                            >
                                <option value="need">Need</option>
                                <option value="want">Want</option>
                                <option value="wish">Wish</option>
                            </select>
                        </div>

                        {/* Risk Tolerance */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                <Shield size={16} className="text-brand-500" /> Risk Profile
                            </label>
                             <select 
                                name="riskTolerance"
                                value={formData.riskTolerance}
                                disabled={!isEditing}
                                onChange={handleInputChange}
                                className={`w-full p-3 rounded-xl border ${isEditing ? 'bg-white border-slate-300' : 'bg-slate-50 border-transparent'} text-slate-900 font-medium transition-colors`}
                            >
                                <option value="low-risk">Low Risk</option>
                                <option value="middle-risk">Middle Risk</option>
                                <option value="high-risk">High Risk</option>
                            </select>
                        </div>
                    </div>

                    {/* AI Strategy Insight */}
                    <div className="bg-indigo-50 rounded-3xl p-6 border border-indigo-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <TrendingUp size={100} />
                        </div>
                        <div className="relative z-10">
                            <h3 className="font-bold text-indigo-900 flex items-center gap-2 mb-2">
                                <span className="px-2 py-0.5 bg-indigo-200 text-indigo-800 text-[10px] uppercase tracking-wider rounded-md">AI Insight</span>
                                Strategy Analysis
                            </h3>
                            <p className="text-indigo-800 text-sm leading-relaxed">
                                {formData.ai_rationale || "AI hasn't generated a specific rationale for this goal yet. Based on your risk profile, we recommend regular contributions."}
                            </p>
                            <div className="mt-4 flex items-center gap-4">
                                <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Executed Strategy</div>
                                <div className="px-3 py-1 bg-white/60 rounded-lg text-indigo-900 text-sm font-bold capitalize">
                                    {formData.strategy_profile || 'Standard'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Funding Mix & Actions */}
                <div className="space-y-8">
                    
                    {/* Funding Mix (Mocked Visual) */}
                    <div>
                        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <PieChart size={18} className="text-slate-400" /> Funding Source
                        </h3>
                        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                            {/* Using mock visual representation for now */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                                        <span className="text-slate-600 font-medium">KiwiSaver</span>
                                    </div>
                                    <span className="font-bold text-slate-900">60%</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                                        <span className="text-slate-600 font-medium">Savings</span>
                                    </div>
                                    <span className="font-bold text-slate-900">25%</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                                        <span className="text-slate-400 font-medium">Gap</span>
                                    </div>
                                    <span className="font-bold text-slate-400">15%</span>
                                </div>
                                
                                {/* Visual Bar */}
                                <div className="flex h-3 rounded-full overflow-hidden w-full mt-2">
                                    <div className="bg-emerald-400 w-[60%]"></div>
                                    <div className="bg-blue-400 w-[25%]"></div>
                                    <div className="bg-slate-100 w-[15%]"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notes Field */}
                    <div>
                         <h3 className="font-bold text-slate-900 mb-4">Notes</h3>
                         <textarea 
                            name="notes"
                            value={formData.notes}
                            disabled={!isEditing}
                            onChange={handleInputChange}
                            className={`w-full p-4 rounded-3xl border ${isEditing ? 'bg-white border-slate-300' : 'bg-slate-50 border-slate-100'} text-sm text-slate-600 resize-none focus:outline-none`}
                            rows={5}
                            placeholder="Add personal notes about this goal..."
                         />
                    </div>

                    {/* Action Buttons */}
                    {isEditing && (
                        <div className="flex flex-col gap-3 pt-4">
                            <button 
                                onClick={handleSave}
                                className="w-full btn-primary-rounded flex items-center justify-center gap-2 py-3"
                            >
                                <Save size={18} /> Save Changes
                            </button>
                            <button 
                                onClick={() => onDelete(formData._id)}
                                className="w-full py-3 rounded-full border border-red-100 text-red-600 font-bold text-sm hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                            >
                                <Trash2 size={18} /> Delete Goal
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default GoalDetailModal;
