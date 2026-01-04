import React, { useState } from 'react';
import { X, Home, Coffee, DollarSign, TrendingUp, Plus, Calculator } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

// ============================================
// CALCULATOR MODAL COMPONENT
// ============================================
export const CalculatorModal = ({ isOpen, onClose, calculatorType, onAddToScenario }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            {calculatorType === 'mortgage' ? (
              <Home className="w-6 h-6 text-indigo-600" />
            ) : (
              <Coffee className="w-6 h-6 text-amber-600" />
            )}
            <h2 className="text-xl font-bold text-slate-900">
              {calculatorType === 'mortgage' ? 'Mortgage Calculator' : 'Latte Factor Calculator'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {calculatorType === 'mortgage' ? (
            <MortgageCalculator onAddToScenario={onAddToScenario} onClose={onClose} />
          ) : (
            <LatteFactorCalculator onAddToScenario={onAddToScenario} onClose={onClose} />
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// TOOL A: MORTGAGE CALCULATOR
// ============================================
const MortgageCalculator = ({ onAddToScenario, onClose }) => {
  const [housePrice, setHousePrice] = useState(800000);
  const [deposit, setDeposit] = useState(160000);
  const [interestRate, setInterestRate] = useState(6.5);
  const [term, setTerm] = useState(30);

  // Calculate mortgage details
  const loanAmount = housePrice - deposit;
  const monthlyRate = interestRate / 100 / 12;
  const numberOfPayments = term * 12;
  
  const monthlyPayment = loanAmount * 
    (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
    (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
  
  const totalPaid = monthlyPayment * numberOfPayments;
  const totalInterest = totalPaid - loanAmount;
  const totalCost = totalPaid + deposit;

  // Pie chart data
  const pieData = [
    { name: 'Principal', value: loanAmount, color: '#6366f1' },
    { name: 'Interest', value: totalInterest, color: '#ef4444' }
  ];

  const handleAddToScenario = () => {
    onAddToScenario({
      type: 'mortgage',
      name: 'House Purchase',
      cost: housePrice,
      deposit: deposit,
      monthlyPayment: Math.round(monthlyPayment),
      year: 5 // Default to 5 years from now
    });
    onClose();
  };

  return (
    <div className="space-y-6">
      
      {/* Inputs Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* House Price */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            House Price
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
            <input
              type="number"
              value={housePrice}
              onChange={(e) => setHousePrice(Number(e.target.value))}
              className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <input
            type="range"
            min="200000"
            max="2000000"
            step="50000"
            value={housePrice}
            onChange={(e) => setHousePrice(Number(e.target.value))}
            className="w-full mt-2 accent-indigo-600"
          />
        </div>

        {/* Deposit */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Deposit ({((deposit / housePrice) * 100).toFixed(0)}%)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
            <input
              type="number"
              value={deposit}
              onChange={(e) => setDeposit(Number(e.target.value))}
              className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <input
            type="range"
            min="0"
            max={housePrice * 0.5}
            step="10000"
            value={deposit}
            onChange={(e) => setDeposit(Number(e.target.value))}
            className="w-full mt-2 accent-emerald-600"
          />
        </div>

        {/* Interest Rate */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Interest Rate
          </label>
          <div className="relative">
            <input
              type="number"
              value={interestRate}
              onChange={(e) => setInterestRate(Number(e.target.value))}
              step="0.1"
              className="w-full pr-8 pl-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
          </div>
          <input
            type="range"
            min="2"
            max="12"
            step="0.1"
            value={interestRate}
            onChange={(e) => setInterestRate(Number(e.target.value))}
            className="w-full mt-2 accent-blue-600"
          />
        </div>

        {/* Term */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Loan Term
          </label>
          <div className="relative">
            <input
              type="number"
              value={term}
              onChange={(e) => setTerm(Number(e.target.value))}
              className="w-full pr-16 pl-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">years</span>
          </div>
          <input
            type="range"
            min="5"
            max="30"
            step="5"
            value={term}
            onChange={(e) => setTerm(Number(e.target.value))}
            className="w-full mt-2 accent-purple-600"
          />
        </div>
      </div>

      {/* Results Section */}
      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
        <h3 className="font-bold text-slate-900 mb-4">Loan Breakdown</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-slate-600">Loan Amount</p>
            <p className="text-2xl font-bold text-slate-900">${loanAmount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Monthly Payment</p>
            <p className="text-2xl font-bold text-indigo-600">${Math.round(monthlyPayment).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Total Interest</p>
            <p className="text-xl font-bold text-rose-600">${Math.round(totalInterest).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Total Cost</p>
            <p className="text-xl font-bold text-slate-900">${Math.round(totalCost).toLocaleString()}</p>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: $${(entry.value / 1000).toFixed(0)}k`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Warning if low deposit */}
      {(deposit / housePrice) < 0.2 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <div className="text-amber-600 mt-0.5">⚠️</div>
          <div>
            <p className="font-bold text-amber-900">Low Deposit Warning</p>
            <p className="text-sm text-amber-700">
              With less than 20% deposit, you may need to pay mortgage insurance, increasing your monthly costs.
            </p>
          </div>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={handleAddToScenario}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors"
      >
        <Plus className="w-5 h-5" />
        Add House Purchase to Scenario
      </button>
    </div>
  );
};

// ============================================
// TOOL B: LATTE FACTOR CALCULATOR
// ============================================
const LatteFactorCalculator = ({ onAddToScenario, onClose }) => {
  const [amount, setAmount] = useState(10);
  const [frequency, setFrequency] = useState('daily'); // daily, weekly, monthly
  const [years, setYears] = useState(30);
  const [returnRate, setReturnRate] = useState(7);

  // Calculate savings
  const getDailyAmount = () => {
    if (frequency === 'daily') return amount;
    if (frequency === 'weekly') return amount / 7;
    return amount / 30; // monthly
  };

  const monthlyAmount = getDailyAmount() * 30;
  const annualAmount = monthlyAmount * 12;
  
  // Future value calculation with compound interest
  const monthlyRate = returnRate / 100 / 12;
  const numberOfMonths = years * 12;
  
  const futureValue = monthlyAmount * 
    ((Math.pow(1 + monthlyRate, numberOfMonths) - 1) / monthlyRate) * 
    (1 + monthlyRate);

  // Generate bar chart data (5-year intervals)
  const chartData = [];
  for (let year = 5; year <= years; year += 5) {
    const months = year * 12;
    const value = monthlyAmount * 
      ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * 
      (1 + monthlyRate);
    chartData.push({
      year: `${year}y`,
      value: Math.round(value)
    });
  }

  const handleCommit = () => {
    onAddToScenario({
      type: 'savings_increase',
      monthlyIncrease: Math.round(monthlyAmount),
      source: 'Latte Factor',
      description: `Save $${amount} ${frequency} instead of buying coffee`
    });
    onClose();
  };

  const getFrequencyLabel = () => {
    if (frequency === 'daily') return 'per day';
    if (frequency === 'weekly') return 'per week';
    return 'per month';
  };

  return (
    <div className="space-y-6">
      
      {/* Input Section */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
        <div className="text-center mb-6">
          <Coffee className="w-12 h-12 text-amber-600 mx-auto mb-3" />
          <p className="text-lg text-slate-700">
            "If I save{' '}
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-20 px-2 py-1 border-b-2 border-amber-400 bg-transparent text-center font-bold text-amber-900 focus:outline-none focus:border-amber-600"
            />
            {' '}
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="px-3 py-1 border-b-2 border-amber-400 bg-transparent font-bold text-amber-900 focus:outline-none focus:border-amber-600 cursor-pointer"
            >
              <option value="daily">per day</option>
              <option value="weekly">per week</option>
              <option value="monthly">per month</option>
            </select>
            {' '}instead of buying coffee..."
          </p>
        </div>

        {/* Additional Controls */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Time Period
            </label>
            <select
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
            >
              <option value={10}>10 years</option>
              <option value={20}>20 years</option>
              <option value={30}>30 years</option>
              <option value={40}>40 years</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Expected Return
            </label>
            <select
              value={returnRate}
              onChange={(e) => setReturnRate(Number(e.target.value))}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
            >
              <option value={5}>5% (Conservative)</option>
              <option value={7}>7% (Moderate)</option>
              <option value={10}>10% (Aggressive)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Result Section */}
      <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-8 border-2 border-emerald-300 text-center">
        <div className="mb-4">
          <div className="text-6xl mb-4">💰</div>
          <p className="text-lg text-slate-700 mb-2">
            "...in <span className="font-bold text-emerald-900">{years} years</span>, I will have:"
          </p>
          <p className="text-5xl font-black text-emerald-600 mb-4">
            ${Math.round(futureValue).toLocaleString()}
          </p>
          <div className="inline-flex items-center gap-2 bg-white/50 px-4 py-2 rounded-lg">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-bold text-emerald-900">
              That's ${Math.round(monthlyAmount).toLocaleString()}/month
            </span>
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-50 rounded-lg p-4 text-center border border-slate-200">
          <p className="text-xs text-slate-500 mb-1">Daily Savings</p>
          <p className="text-xl font-bold text-slate-900">${getDailyAmount().toFixed(2)}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-4 text-center border border-slate-200">
          <p className="text-xs text-slate-500 mb-1">Monthly Total</p>
          <p className="text-xl font-bold text-slate-900">${Math.round(monthlyAmount)}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-4 text-center border border-slate-200">
          <p className="text-xs text-slate-500 mb-1">Annual Total</p>
          <p className="text-xl font-bold text-slate-900">${Math.round(annualAmount).toLocaleString()}</p>
        </div>
      </div>

      {/* Growth Chart */}
      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <h3 className="font-bold text-slate-900 mb-4">Growth Over Time</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="year" stroke="#64748b" />
              <YAxis 
                stroke="#64748b"
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                formatter={(value) => [`$${value.toLocaleString()}`, 'Savings']}
                contentStyle={{ 
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="value" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Fun Fact */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <div className="text-blue-600 text-2xl">💡</div>
        <div>
          <p className="font-bold text-blue-900 mb-1">The Power of Small Changes</p>
          <p className="text-sm text-blue-700">
            By cutting out just ${amount} {getFrequencyLabel()} and investing it, you're not just saving money—you're 
            building wealth through compound interest. That's ${Math.round(futureValue - (monthlyAmount * numberOfMonths)).toLocaleString()} 
            in investment gains alone!
          </p>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={handleCommit}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors"
      >
        <Plus className="w-5 h-5" />
        Commit to Saving ${Math.round(monthlyAmount)}/month
      </button>
    </div>
  );
};

// ============================================
// MAIN TOOLS BUTTON COMPONENT
// ============================================
const PlaygroundTools = ({ onAddToScenario }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [activeCalculator, setActiveCalculator] = useState(null);

  const tools = [
    {
      id: 'mortgage',
      name: 'Mortgage Calculator',
      description: 'Calculate house affordability',
      icon: Home,
      color: 'indigo'
    },
    {
      id: 'latte',
      name: 'Latte Factor',
      description: 'See the power of micro-savings',
      icon: Coffee,
      color: 'amber'
    }
  ];

  return (
    <>
      {/* Floating Tools Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-2xl flex items-center gap-3 font-bold transition-all hover:scale-105"
        >
          <Calculator className="w-6 h-6" />
          <span className="pr-2">Tools</span>
        </button>

        {/* Tools Menu */}
        {showMenu && (
          <div className="absolute bottom-20 right-0 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 w-72">
            <h3 className="font-bold text-slate-900 mb-3 px-2">Financial Calculators</h3>
            <div className="space-y-2">
              {tools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.id}
                    onClick={() => {
                      setActiveCalculator(tool.id);
                      setShowMenu(false);
                    }}
                    className={`w-full text-left p-4 rounded-xl border-2 hover:border-${tool.color}-300 hover:bg-${tool.color}-50 transition-all group`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`bg-${tool.color}-100 p-2 rounded-lg group-hover:scale-110 transition-transform`}>
                        <Icon className={`w-5 h-5 text-${tool.color}-600`} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{tool.name}</p>
                        <p className="text-sm text-slate-600">{tool.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Calculator Modal */}
      <CalculatorModal
        isOpen={activeCalculator !== null}
        onClose={() => setActiveCalculator(null)}
        calculatorType={activeCalculator}
        onAddToScenario={onAddToScenario}
      />
    </>
  );
};

export default PlaygroundTools;