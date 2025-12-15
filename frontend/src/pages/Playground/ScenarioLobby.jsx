import { useNavigate } from 'react-router-dom'; 
import React, { useState, useEffect } from 'react';
import { PlusCircle, Play, Copy, Trash2, CheckCircle, AlertTriangle, TrendingUp, Lock } from 'lucide-react';

// ============================================
// MOCK DATA (Ming's Phase 1)
// Replace this with Ray's service later
// ============================================
const MOCK_REAL_LIFE = {
  netWorth: 155400,
  monthlyContribution: 1800,
  retirementAge: 65,
  riskProfile: "Balanced",
  successProbability: 85,
  goals: [
    { name: "First Home", target: 120000, current: 108000 },
    { name: "Retirement", target: 800000, current: 42300 }
  ]
};


// // It will be:
// const response = await fetch('/api/playground/real-life');
// const realLife = await response.json();

const MOCK_SCENARIOS = [
  {
    id: "sim_1",
    name: "Early Retirement Plan",
    status: "safe",
    successProbability: 78,
    monthlyContribution: 2000,
    retirementAge: 55,
    created: "2025-12-01"
  },
  {
    id: "sim_2",
    name: "Buying a Bach",
    status: "risky",
    successProbability: 42,
    monthlyContribution: 1500,
    retirementAge: 65,
    created: "2025-12-05"
  },
  {
    id: "sim_3",
    name: "Aggressive Growth Strategy",
    status: "safe",
    successProbability: 92,
    monthlyContribution: 2500,
    retirementAge: 60,
    created: "2025-12-08"
  }
];

// ============================================
// MAIN COMPONENT
// ============================================
const ScenarioLobby = () => {
  const [realLife, setRealLife] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const navigate = useNavigate(); 

  // ============================================
  // SIMULATE DATA LOADING (Ming's Mock Pattern)
  // ============================================
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Load mock data
        setRealLife(MOCK_REAL_LIFE);
        setScenarios(MOCK_SCENARIOS);
      } catch (error) {
        console.error("Error loading scenarios:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // ============================================
  // ACTIONS (Will be connected to backend later)
  // ============================================
  const handleCloneToSimulator = () => {
    const newScenario = {
      id: `sim_${Date.now()}`,
      name: "My New Plan",
      status: "safe",
      successProbability: realLife.successProbability,
      monthlyContribution: realLife.monthlyContribution,
      retirementAge: realLife.retirementAge,
      created: new Date().toISOString()
    };
    setScenarios([newScenario, ...scenarios]);
    alert(" Cloned to simulator! Click 'Edit' to customize.");
  };

  const handleCreateNew = () => {
    const newScenario = {
      id: `sim_${Date.now()}`,
      name: "Untitled Scenario",
      status: "safe",
      successProbability: 50,
      monthlyContribution: 1000,
      retirementAge: 65,
      created: new Date().toISOString()
    };
    setScenarios([newScenario, ...scenarios]);
    alert(" Created new scenario! Click 'Edit' to customize.");
  };

  const handleEdit = (id) => {
    navigate(`/playground/scenario/${id}`); //  Navigate to workspace
  };


  const handleDelete = (id) => {
    setScenarios(scenarios.filter(s => s.id !== id));
    setShowDeleteConfirm(null);
    alert("🗑️ Scenario deleted!");
  };

  const handleApplyToMain = (scenario) => {
    if (confirm(` This will overwrite your current plan with "${scenario.name}". Continue?`)) {
      alert(" Applied to main plan! (Backend integration pending)");
    }
  };

  // ============================================
  // LOADING STATE
  // ============================================
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading Playground...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* ============================================ */}
        {/* HEADER */}
        {/* ============================================ */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                The Playground 🎮
              </h1>
              <p className="text-slate-600">
                Create parallel universes to test different life decisions
              </p>
            </div>
            <div className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg text-sm font-bold">
              SIMULATION MODE
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* "REAL LIFE" CARD (Reference) */}
        {/* ============================================ */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center">
            <Lock className="w-5 h-5 mr-2" />
            Your Current Reality
          </h2>
          
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl border-2 border-slate-700 relative overflow-hidden">
            {/* Locked Badge */}
            <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold flex items-center">
              <Lock className="w-3 h-3 mr-1" />
              READ ONLY
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Net Worth */}
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Net Worth</p>
                <p className="text-3xl font-bold">${realLife.netWorth.toLocaleString()}</p>
              </div>

              {/* Monthly Savings */}
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Monthly Savings</p>
                <p className="text-2xl font-bold">${realLife.monthlyContribution}</p>
                <p className="text-slate-400 text-xs">{realLife.riskProfile} Strategy</p>
              </div>

              {/* Retirement Age */}
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Target Retirement</p>
                <p className="text-2xl font-bold">Age {realLife.retirementAge}</p>
              </div>

              {/* Success Rate */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-slate-400 text-xs uppercase tracking-wider">Success Rate</p>
                  <span className="text-emerald-400 font-bold text-2xl">{realLife.successProbability}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${realLife.successProbability}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Clone Button */}
            <div className="mt-6 pt-6 border-t border-slate-700">
              <button
                onClick={handleCloneToSimulator}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105"
              >
                <Copy className="w-5 h-5 mr-2" />
                Clone to Simulator
              </button>
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* SIMULATED SCENARIOS GRID */}
        {/* ============================================ */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-700 flex items-center">
              <Play className="w-5 h-5 mr-2" />
              Your Simulations ({scenarios.length})
            </h2>
            <button
              onClick={handleCreateNew}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg flex items-center transition-colors"
            >
              <PlusCircle className="w-5 h-5 mr-2" />
              New Scenario
            </button>
          </div>

          {/* Scenario Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {scenarios.map((scenario) => (
              <div
                key={scenario.id}
                className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-200 hover:border-indigo-300 relative"
              >
                {/* Status Badge */}
                <div className="absolute top-4 right-4">
                  {scenario.status === 'safe' ? (
                    <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold flex items-center">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      SAFE
                    </div>
                  ) : (
                    <div className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-xs font-bold flex items-center">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      RISKY
                    </div>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-slate-900 mb-3 pr-20">
                  {scenario.name}
                </h3>

                {/* Stats */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">Success Rate</span>
                    <span className={`font-bold ${scenario.successProbability >= 70 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {scenario.successProbability}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${scenario.successProbability >= 70 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                      style={{ width: `${scenario.successProbability}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <p className="text-slate-500 text-xs">Savings/Mo</p>
                      <p className="font-bold text-slate-900">${scenario.monthlyContribution}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Retirement</p>
                      <p className="font-bold text-slate-900">Age {scenario.retirementAge}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <button
                    onClick={() => handleEdit(scenario.id)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                  >
                    Edit Scenario
                  </button>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApplyToMain(scenario)}
                      className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold py-2 px-4 rounded-lg transition-colors text-sm flex items-center justify-center"
                    >
                      <TrendingUp className="w-4 h-4 mr-1" />
                      Apply
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(scenario.id)}
                      className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold py-2 px-4 rounded-lg transition-colors text-sm flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </button>
                  </div>
                </div>

                {/* Delete Confirmation */}
                {showDeleteConfirm === scenario.id && (
                  <div className="absolute inset-0 bg-slate-900/95 rounded-2xl flex items-center justify-center p-6">
                    <div className="text-center">
                      <p className="text-white font-bold mb-4">Delete this scenario?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDelete(scenario.id)}
                          className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-4 rounded-lg"
                        >
                          Yes, Delete
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(null)}
                          className="flex-1 bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Empty State */}
            {scenarios.length === 0 && (
              <div className="col-span-full text-center py-16">
                <Play className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-400 mb-2">No simulations yet</h3>
                <p className="text-slate-500 mb-6">Clone your current plan or create a new scenario</p>
                <button
                  onClick={handleCreateNew}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg inline-flex items-center"
                >
                  <PlusCircle className="w-5 h-5 mr-2" />
                  Create First Scenario
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ScenarioLobby;