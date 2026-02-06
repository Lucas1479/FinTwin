import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import GoalDefinitionForm from '../components/goals/GoalDefinitionForm';
import { createGoal } from '../services/goalService';

const PRESETS = [
  {
    id: 'retirement',
    label: 'Retirement',
    defaultName: 'Retirement',
    description: 'Plan for long-term retirement income and lifestyle.',
    category: 'retirement',
    priority: 'need',
  },
  {
    id: 'home',
    label: 'First Home',
    defaultName: 'First home',
    description: 'Save for a deposit on your first home.',
    category: 'home',
    priority: 'need',
  },
  {
    id: 'emergency',
    label: 'Emergency Fund',
    defaultName: 'Emergency fund',
    description: 'Build a safety buffer for unexpected events.',
    category: 'emergency',
    priority: 'need',
  },
  {
    id: 'education',
    label: 'Education',
    defaultName: 'Education',
    description: 'Fund university or upskilling for yourself or family.',
    category: 'education',
    priority: 'want',
  },
  {
    id: 'travel',
    label: 'Travel',
    defaultName: 'Travel goal',
    description: 'Plan for a future trip or holiday experience.',
    category: 'travel',
    priority: 'wish',
  },
  {
    id: 'vehicle',
    label: 'Vehicle',
    defaultName: 'Vehicle purchase',
    description: 'Save for your next car or vehicle upgrade.',
    category: 'vehicle',
    priority: 'want',
  },
  {
    id: 'wealth',
    label: 'Wealth Growth',
    defaultName: 'Wealth growth',
    description: 'Build passive income and grow your investment portfolio.',
    category: 'wealth',
    priority: 'want',
  },
  {
    id: 'big_purchase',
    label: 'Major Purchase / Event',
    defaultName: 'Major purchase',
    description: 'Save for a wedding, luxury item, or significant event.',
    category: 'big_purchase',
    priority: 'want',
  },
  {
    id: 'custom',
    label: 'Custom Goal',
    defaultName: '',
    description: 'Start from a blank template and define everything yourself.',
    category: 'custom',
    priority: 'want',
  },
];

const GoalGalleryPage = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(PRESETS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null); // Added local error state

  const handleCreate = async (payload) => {
    setSubmitting(true);
    setError(null);
    try {
      await createGoal(payload);
      navigate('/goals');
    } catch (err) {
      // ✅ Fixes the unhandled rejection in Vitest
      console.error('Goal Creation Error:', err);
      setError('Failed to create goal. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Simplified initialValues logic
  const initialValues = {
    goal_name: selected.defaultName,
    category: selected.category,
    priority: selected.priority,
  };

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto pt-8 animate-fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          
          {/* Left: Gallery Selection */}
          <div className="lg:col-span-2 space-y-4">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-1">
              Choose a goal template
            </h1>
            <p className="text-slate-500 text-sm md:text-base mb-4">
              Start from a preset configuration and then refine the numbers on the right.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PRESETS.map((preset) => {
                const isActive = selected.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelected(preset)}
                    className={`text-left rounded-2xl border p-4 transition-all duration-200 ${
                      isActive
                        ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/10'
                        : 'border-slate-200 hover:border-blue-200 hover:bg-blue-50/40'
                    }`}
                  >
                    <h3 className="text-sm font-bold text-slate-900 mb-1">
                      {preset.label}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{preset.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Definition Form */}
          <div className="lg:col-span-3 bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
                Stage 1 · Definition & Diagnostics
              </p>
              <h2 className="text-lg md:text-xl font-bold text-slate-900">
                Define your goal basics
              </h2>
              {error && (
                <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
                  {error}
                </div>
              )}
            </div>

            <GoalDefinitionForm
              key={selected.id} // Forces form reset when template changes
              initialValues={initialValues}
              onSubmit={handleCreate}
              submitting={submitting}
              submitLabel="Create goal"
            />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default GoalGalleryPage;