import { useState } from 'react';
import { ArrowRight } from 'lucide-react';

const DEFAULT_FORM = {
  goal_name: '',
  category: 'custom',
  priority: 'need',
  riskTolerance: 'middle-risk',
  target_amount: '',
  due_date: '',
  notes: '',
};

const GoalDefinitionForm = ({
  initialValues = {},
  onSubmit,
  submitting = false,
  submitLabel = 'Create Goal',
}) => {
  const [form, setForm] = useState({ ...DEFAULT_FORM, ...initialValues });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.goal_name || !form.target_amount || !form.due_date) {
      setError('Please fill in goal name, target amount, and target date.');
      return;
    }

    const payload = {
      goal_name: form.goal_name,
      category: form.category,
      priority: form.priority,
      riskTolerance: form.riskTolerance,
      target_amount: Number(form.target_amount),
      due_date: form.due_date,
      notes: form.notes || undefined,
      // funding_mix, contribution_plan etc. can be added later in dedicated stages
    };

    try {
      await onSubmit(payload);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || 'Failed to create goal.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 mt-6">
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Goal name
          </label>
          <input
            type="text"
            name="goal_name"
            value={form.goal_name}
            onChange={handleChange}
            className="input-rounded w-full bg-slate-50"
            placeholder="Buy first home, Retirement, Travel to Japan..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Category
          </label>
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            className="input-rounded w-full bg-slate-50"
          >
            <option value="retirement">Retirement</option>
            <option value="home">Home</option>
            <option value="education">Education</option>
            <option value="wealth">Wealth</option>
            <option value="travel">Travel</option>
            <option value="vehicle">Vehicle</option>
            <option value="big_purchase">Big purchase</option>
            <option value="emergency">Emergency</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Priority
          </label>
          <select
            name="priority"
            value={form.priority}
            onChange={handleChange}
            className="input-rounded w-full bg-slate-50"
          >
            <option value="need">Need</option>
            <option value="want">Want</option>
            <option value="wish">Wish</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Risk tolerance
          </label>
          <select
            name="riskTolerance"
            value={form.riskTolerance}
            onChange={handleChange}
            className="input-rounded w-full bg-slate-50"
          >
            <option value="low-risk">Low risk</option>
            <option value="middle-risk">Middle risk</option>
            <option value="high-risk">High risk</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Target amount (NZD)
          </label>
          <input
            type="number"
            name="target_amount"
            value={form.target_amount}
            onChange={handleChange}
            min="0"
            className="input-rounded w-full bg-slate-50"
            placeholder="50000"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Target date
          </label>
          <input
            type="date"
            name="due_date"
            value={form.due_date}
            onChange={handleChange}
            className="input-rounded w-full bg-slate-50"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Notes (optional)
        </label>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          rows={3}
          className="input-rounded w-full bg-slate-50 resize-none"
          placeholder="Why is this goal important to you?"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary-rounded flex items-center gap-2 px-6"
        >
          {submitLabel}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
};

export default GoalDefinitionForm;


