import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import GoalDefinitionForm from '../components/goals/GoalDefinitionForm';
import { createGoal } from '../services/goalService';

const PRESETS = [
  {
    id: 'retirement',
    label: 'Retirement',
    description: 'Plan for long-term retirement income and lifestyle.',
    category: 'retirement',
    priority: 'need',
  },
  {
    id: 'home',
    label: 'First Home',
    description: 'Save for a deposit on your first home.',
    category: 'home',
    priority: 'need',
  },
  {
    id: 'emergency',
    label: 'Emergency Fund',
    description: 'Build a safety buffer for unexpected events.',
    category: 'emergency',
    priority: 'need',
  },
  {
    id: 'education',
    label: 'Education',
    description: 'Fund university or upskilling for yourself or family.',
    category: 'education',
    priority: 'want',
  },
  {
    id: 'travel',
    label: 'Travel',
    description: 'Plan for a future trip or holiday experience.',
    category: 'travel',
    priority: 'wish',
  },
  {
    id: 'vehicle',
    label: 'Vehicle',
    description: 'Save for your next car or vehicle upgrade.',
    category: 'vehicle',
    priority: 'want',
  },
  {
    id: 'wealth',
    label: 'Wealth Growth',
    description: 'Build passive income and grow your investment portfolio.',
    category: 'wealth',
    priority: 'want',
  },
  {
    id: 'big_purchase',
    label: 'Major Purchase / Event',
    description: 'Save for a wedding, luxury item, or significant event.',
    category: 'big_purchase',
    priority: 'want',
  },
  {
    id: 'custom',
    label: 'Custom Goal',
    description: 'Start from a blank template and define everything yourself.',
    category: 'custom',
    priority: 'want',
  },
];

const GoalGalleryPage = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(PRESETS[0]);
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (payload) => {
    setSubmitting(true);
    try {
      await createGoal(payload);
      navigate('/goals');
    } finally {
      setSubmitting(false);
    }
  };

  const initialValues = {
    goal_name:
      selected.id === 'retirement'
        ? 'Retirement'
        : selected.id === 'home'
        ? 'First home'
        : selected.id === 'emergency'
        ? 'Emergency fund'
        : selected.id === 'education'
        ? 'Education'
        : selected.id === 'travel'
        ? 'Travel goal'
        : selected.id === 'vehicle'
        ? 'Vehicle purchase'
        : selected.id === 'wealth'
        ? 'Wealth growth'
        : selected.id === 'big_purchase'
        ? 'Major purchase'
        : '',
    category: selected.category,
    priority: selected.priority,
  };

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto pt-8 animate-fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left: Gallery */}
          <div className="lg:col-span-2 space-y-4">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-1">
              Choose a goal template
            </h1>
            <p className="text-slate-500 text-sm md:text-base mb-4">
              Start from a preset configuration and then refine the numbers on the right. You can always adjust later.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PRESETS.map((preset) => {
                const isActive = selected.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelected(preset)}
                    className={`text-left rounded-2xl border p-4 transition-colors ${
                      isActive
                        ? 'border-blue-500 bg-blue-50/60'
                        : 'border-slate-200 hover:border-blue-200 hover:bg-blue-50/40'
                    }`}
                  >
                    <h3 className="text-sm font-bold text-slate-900 mb-1">
                      {preset.label}
                    </h3>
                    <p className="text-xs text-slate-600">{preset.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Definition form */}
          <div className="lg:col-span-3 bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
                  Stage 1 · Definition & Diagnostics
                </p>
                <h2 className="text-lg md:text-xl font-bold text-slate-900">
                  Define your goal basics
                </h2>
              </div>
            </div>
            <p className="text-sm text-slate-500">
              Tell FinTwin what you&apos;re working towards. We&apos;ll use this to run projections and design the strategy in the next steps.
            </p>

            <GoalDefinitionForm
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


