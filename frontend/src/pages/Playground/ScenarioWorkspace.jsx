import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, TrendingUp, DollarSign, Calendar, Zap, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import PlaygroundTools from './PlaygroundTools';

// ============================================
// MOCK DATA - Initial Scenario
// ============================================
const MOCK_INITIAL_SCENARIO = {
  id: "sim_1",
  name: "Early Retirement Plan",
  parameters: {
    monthlyContribution: 2000,
    expectedReturn: 7.5,
    retirementAge: 55,
    lifeExpectancy: 90,
    currentAge: 30,
    currentNetWorth: 155400,
    bigExpenses: [
      { id: 1, name: "New Car", cost: 45000, year: 5 },
      { id: 2, name: "World Trip", cost: 30000, year: 10 }
    ]
  }
};

const EXPENSE_TEMPLATES = [
  { name: "Buy House", cost: 800000 },
  { name: "New Car", cost: 45000 },
  { name: "Wedding", cost: 50000 },
  { name: "World Trip", cost: 30000 },
  { name: "MBA Degree", cost: 120000 },
  { name: "Home Renovation", cost: 150000 }
];

// ============================================
// CALCULATION ENGINE (Client-Side for Speed)
// ============================================
const calculateProjection = (params) => {
  const {
    monthlyContribution,
    expectedReturn,
    retirementAge,
    lifeExpectancy,
    currentAge,
    currentNetWorth,
    bigExpenses
  } = params;

  const data = [];
  let balance = currentNetWorth;
  const annualReturn = expectedReturn / 100;
  const annualContribution = monthlyContribution * 12;
  
  const expensesByYear = {};
  bigExpenses.forEach(exp => {
    expensesByYear[exp.year] = (expensesByYear[exp.year] || 0) + exp.cost;
  });

  for (let year = 0; year <= (lifeExpectancy - currentAge); year++) {
    const age = currentAge + year;
    
    if (age < retirementAge) {
      balance += annualContribution;
    }
    
    if (expensesByYear[year]) {
      balance -= expensesByYear[year];
    }
    
    balance *= (1 + annualReturn);
    
    if (age >= retirementAge) {
      const withdrawal = balance * 0.04;
      balance -= withdrawal;
    }
    
    data.push({
      year,
      age,
      balance: Math.round(balance),
      phase: age < retirementAge ? 'Accumulation' : 'Retirement'
    });
    
    if (balance <= 0) break;
  }
  
  return data;
};

const calculateSuccessProbability = (projectionData, lifeExpectancy, currentAge) => {
  if (!projectionData || projectionData.length === 0) return 0;
  
  const finalAge = projectionData[projectionData.length - 1].age;
  const finalBalance = projectionData[projectionData.length - 1].balance;
  
  if (finalAge < lifeExpectancy) {
    const yearsShort = lifeExpectancy - finalAge;
    const totalYears = lifeExpectancy - currentAge;
    return Math.max(0, Math.round((1 - yearsShort / totalYears) * 100));
  }
  
  if (finalBalance > 0) {
    return 100;
  }
  
  return 50;
};

// ============================================
// MAIN COMPONENT
// ============================================
const ScenarioWorkspace = () => {
  const [scenario, setScenario] = useState(null);
  const [params, setParams] = useState(null);
  const [projectionData, setProjectionData] = useState([]);
  const [successProbability, setSuccessProbability] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const loadScenario = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setScenario(MOCK_INITIAL_SCENARIO);
      setParams(MOCK_INITIAL_SCENARIO.parameters);
      setLoading(false);
    };
    
    loadScenario();
  }, []);

  useEffect(() => {
    if (!params) return;
    
    const data = calculateProjection(params);
    setProjectionData(data);
    
    const probability = calculateSuccessProbability(
      data,
      params.lifeExpectancy,
      params.currentAge
    );
    setSuccessProbability(probability);
  }, [params]);

  const updateParam = (key, value) => {
    setParams(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const addExpense = (template) => {
    const newExpense = {
      id: Date.now(),
      name: template.name,
      cost: template.cost,
      year: 5
    };
    
    setParams(prev => ({
      ...prev,
      bigExpenses: [...prev.bigExpenses, newExpense]
    }));
  };

  const updateExpense = (id, field, value) => {
    setParams(prev => ({
      ...prev,
      bigExpenses: prev.bigExpenses.map(exp =>
        exp.id === id ? { ...exp, [field]: value } : exp
      )
    }));
  };

  const removeExpense = (id) => {
    setParams(prev => ({
      ...prev,
      bigExpenses: prev.bigExpenses.filter(exp => exp.id !== id)
    }));
  };

  const handleSave = () => {
    alert("💾 Scenario saved! (Backend integration pending)");
  };

  const handlePromoteToRealPlan = () => {
    const confirmed = window.confirm(
      `🎯 Make "${scenario.name}" Your Real Plan?\n\n` +
      `This will update your actual financial plan with:\n` +
      `• Monthly Savings: $${params.monthlyContribution.toLocaleString()}\n` +
      `• Retirement Age: ${params.retirementAge}\n` +
      `• Expected Return: ${params.expectedReturn}%\n` +
      `• ${params.bigExpenses.length} planned expenses\n\n` +
      `Are you sure you want to continue?`
    );

    if (!confirmed) return;

    setTimeout(() => {
      triggerConfetti();
      
      setTimeout(() => {
        alert(
          `🎉 Success!\n\n` +
          `"${scenario.name}" is now your active plan!\n\n` +
          `Redirecting to Dashboard...`
        );
        
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);
      }, 2000);
      
    }, 500);
  };

  const triggerConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    function randomInRange(min, max) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      createConfettiParticles(
        Object.assign({}, defaults, {
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        })
      );
      createConfettiParticles(
        Object.assign({}, defaults, {
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        })
      );
    }, 250);
  };

  const createConfettiParticles = (config) => {
    const colors = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6'];
    const container = document.body;
    
    for (let i = 0; i < config.particleCount; i++) {
      const particle = document.createElement('div');
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.random() * 10 + 5;
      const startX = config.origin.x * window.innerWidth;
      const startY = config.origin.y * window.innerHeight;
      const endX = startX + (Math.random() - 0.5) * 500;
      const endY = startY + Math.random() * 600 + 300;
      const rotation = Math.random() * 720;
      
      particle.style.cssText = `
        position: fixed;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        left: ${startX}px;
        top: ${startY}px;
        border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
        pointer-events: none;
        z-index: 9999;
        animation: confetti-fall 3s ease-out forwards;
        transform: rotate(${rotation}deg);
      `;
      
      if (!document.getElementById('confetti-style')) {
        const style = document.createElement('style');
        style.id = 'confetti-style';
        style.textContent = `
          @keyframes confetti-fall {
            0% {
              transform: translateY(0) rotate(0deg);
              opacity: 1;
            }
            100% {
              transform: translateY(${endY - startY}px) translateX(${endX - startX}px) rotate(${rotation}deg);
              opacity: 0;
            }
          }
        `;
        document.head.appendChild(style);
      }
      
      container.appendChild(particle);
      
      setTimeout(() => particle.remove(), 3000);
    }
  };

  const handleAddFromCalculator = (data) => {
    if (data.type === 'mortgage') {
      const newExpense = {
        id: Date.now(),
        name: data.name,
        cost: data.cost,
        year: data.year
      };
      
      setParams(prev => ({
        ...prev,
        bigExpenses: [...prev.bigExpenses, newExpense]
      }));
      
      alert(`✅ Added ${data.name} ($${data.cost.toLocaleString()}) to your scenario at Year ${data.year}!`);
      
    } else if (data.type === 'savings_increase') {
      const newContribution = params.monthlyContribution + data.monthlyIncrease;
      
      setParams(prev => ({
        ...prev,
        monthlyContribution: newContribution
      }));
      
      alert(`✅ ${data.source}: Increased monthly savings by $${data.monthlyIncrease}!\nNew monthly savings: $${newContribution}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading Scenario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => window.history.back()}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{scenario.name}</h1>
              <p className="text-sm text-slate-500">Simulation Workspace</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-lg">
              <span className="text-sm text-slate-600 font-medium">Success Rate:</span>
              <span className={`text-xl font-bold ${
                successProbability >= 70 ? 'text-emerald-600' : 
                successProbability >= 40 ? 'text-amber-600' : 'text-rose-600'
              }`}>
                {successProbability}%
              </span>
            </div>
            
            {successProbability >= 70 && (
              <button
                onClick={handlePromoteToRealPlan}
                className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold px-6 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg shadow-emerald-200 hover:scale-105"
              >
                <TrendingUp className="w-5 h-5" />
                Make This My Real Plan
              </button>
            )}
            
            <button
              onClick={handleSave}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2 rounded-lg transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <div className="space-y-6">
            
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-6">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-bold text-slate-900">Income Levers</h2>
              </div>
              
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-medium text-slate-700">Monthly Savings</label>
                  <span className="text-xl font-bold text-emerald-600">
                    ${params.monthlyContribution.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5000"
                  step="100"
                  value={params.monthlyContribution}
                  onChange={(e) => updateParam('monthlyContribution', parseInt(e.target.value))}
                  onMouseDown={() => setIsDragging(true)}
                  onMouseUp={() => setIsDragging(false)}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>$0</span>
                  <span>$5,000</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-medium text-slate-700">Expected Return Rate</label>
                  <span className="text-xl font-bold text-blue-600">{params.expectedReturn}%</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="10"
                  step="0.5"
                  value={params.expectedReturn}
                  onChange={(e) => updateParam('expectedReturn', parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>3% (Conservative)</span>
                  <span>10% (Aggressive)</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-6">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-slate-900">Timeline Levers</h2>
              </div>
              
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-medium text-slate-700">Retirement Age</label>
                  <span className="text-xl font-bold text-indigo-600">Age {params.retirementAge}</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="80"
                  step="1"
                  value={params.retirementAge}
                  onChange={(e) => updateParam('retirementAge', parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>Age 40</span>
                  <span>Age 80</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-medium text-slate-700">Life Expectancy</label>
                  <span className="text-xl font-bold text-purple-600">Age {params.lifeExpectancy}</span>
                </div>
                <input
                  type="range"
                  min="80"
                  max="100"
                  step="1"
                  value={params.lifeExpectancy}
                  onChange={(e) => updateParam('lifeExpectancy', parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>Age 80</span>
                  <span>Age 100</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-600" />
                  <h2 className="text-lg font-bold text-slate-900">Big Expenses</h2>
                </div>
                
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      const template = EXPENSE_TEMPLATES.find(t => t.name === e.target.value);
                      addExpense(template);
                      e.target.value = '';
                    }
                  }}
                  className="text-sm border border-slate-200 rounded-lg px-3 py-2 cursor-pointer hover:border-indigo-400 transition-colors"
                >
                  <option value="">+ Add Event</option>
                  {EXPENSE_TEMPLATES.map(template => (
                    <option key={template.name} value={template.name}>
                      {template.name} (${template.cost.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                {params.bigExpenses.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <p className="text-sm">No big expenses planned</p>
                    <p className="text-xs mt-1">Use the dropdown above to add one</p>
                  </div>
                ) : (
                  params.bigExpenses.map(expense => (
                    <div key={expense.id} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={expense.name}
                            onChange={(e) => updateExpense(expense.id, 'name', e.target.value)}
                            className="font-medium text-slate-900 bg-transparent border-none outline-none focus:ring-2 focus:ring-indigo-300 rounded px-2 py-1 w-full"
                          />
                        </div>
                        <button
                          onClick={() => removeExpense(expense.id)}
                          className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-slate-500 mb-1 block">Cost</label>
                          <input
                            type="number"
                            value={expense.cost}
                            onChange={(e) => updateExpense(expense.id, 'cost', parseInt(e.target.value))}
                            className="w-full text-sm font-bold bg-white border border-slate-200 rounded-lg px-3 py-2"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 mb-1 block">Year</label>
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={expense.year}
                            onChange={(e) => updateExpense(expense.id, 'year', parseInt(e.target.value))}
                            className="w-full text-sm font-bold bg-white border border-slate-200 rounded-lg px-3 py-2"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 mb-6">Success Probability</h2>
              
              <div className="relative h-48 mb-6">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`text-6xl font-bold ${
                    successProbability >= 70 ? 'text-emerald-600' : 
                    successProbability >= 40 ? 'text-amber-600' : 'text-rose-600'
                  }`}>
                    {successProbability}%
                  </div>
                </div>
                
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="50%"
                    cy="50%"
                    r="80"
                    stroke="#e2e8f0"
                    strokeWidth="12"
                    fill="none"
                  />
                  <circle
                    cx="50%"
                    cy="50%"
                    r="80"
                    stroke={successProbability >= 70 ? '#10b981' : successProbability >= 40 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 80}`}
                    strokeDashoffset={`${2 * Math.PI * 80 * (1 - successProbability / 100)}`}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </svg>
              </div>

              <div className={`p-4 rounded-xl ${
                successProbability >= 70 ? 'bg-emerald-50 border border-emerald-200' :
                successProbability >= 40 ? 'bg-amber-50 border border-amber-200' :
                'bg-rose-50 border border-rose-200'
              }`}>
                <div className="flex items-start gap-3">
                  {successProbability >= 70 ? (
                    <TrendingUp className="w-5 h-5 text-emerald-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                  )}
                  <div>
                    <p className={`font-bold mb-1 ${
                      successProbability >= 70 ? 'text-emerald-900' :
                      successProbability >= 40 ? 'text-amber-900' :
                      'text-rose-900'
                    }`}>
                      {successProbability >= 70 ? 'Looking Good!' :
                       successProbability >= 40 ? 'Moderate Risk' :
                       'High Risk - Adjustments Needed'}
                    </p>
                    <p className="text-sm text-slate-600">
                      {successProbability >= 70 ? 
                        'Your plan is likely to succeed. Keep it up!' :
                        successProbability >= 40 ?
                        'Consider increasing savings or reducing expenses.' :
                        'You may run out of money. Try adjusting your parameters.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 mb-6">Wealth Projection</h2>
              
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={projectionData}>
                    <defs>
                      <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="age" 
                      label={{ value: 'Age', position: 'insideBottom', offset: -5 }}
                      stroke="#64748b"
                    />
                    <YAxis 
                      label={{ value: 'Net Worth ($)', angle: -90, position: 'insideLeft' }}
                      stroke="#64748b"
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      formatter={(value) => [`$${value.toLocaleString()}`, 'Balance']}
                      labelFormatter={(label) => `Age ${label}`}
                      contentStyle={{ 
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '8px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="balance" 
                      stroke="#6366f1" 
                      strokeWidth={3}
                      fill="url(#colorBalance)"
                      animationDuration={isDragging ? 0 : 500}
                    />
                    
                    {projectionData.length > 0 && (
                      <Line 
                        type="monotone"
                        dataKey={() => null}
                        stroke="#f59e0b"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>
                  <span className="text-slate-600">Projected Balance</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-amber-600"></div>
                  <span className="text-slate-600">Retirement Age</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <PlaygroundTools onAddToScenario={handleAddFromCalculator} />
    </div>
  );
};

export default ScenarioWorkspace;