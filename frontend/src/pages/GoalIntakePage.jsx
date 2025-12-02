import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import GoalDefinitionForm from '../components/goals/GoalDefinitionForm';
import { createGoal } from '../services/goalService';
import { MessageSquare, Send } from 'lucide-react';

const INITIAL_MESSAGES = [
  {
    role: 'assistant',
    text: 'Hi! Tell me about the financial goal you have in mind. For example: "I want to save for a house deposit in 5 years."',
  },
];

const GoalIntakePage = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSend = (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    setMessages((prev) => [
      ...prev,
      { role: 'user', text: trimmed },
      {
        role: 'assistant',
        text:
          'Thanks! For now this is a demo intake. Please use the form on the right to confirm the key numbers. Later this chat will dynamically generate forms.',
      },
    ]);
    setInput('');
  };

  const handleCreate = async (payload) => {
    setSubmitting(true);
    try {
      await createGoal(payload);
      navigate('/goals');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto pt-8 animate-fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left: Conversational intake mock */}
          <div className="lg:col-span-2 bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                <MessageSquare size={18} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Pathway A · AI Intake
                </p>
                <h2 className="text-lg font-bold text-slate-900">
                  Describe your goal in your own words
                </h2>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-4">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`max-w-[90%] text-sm px-3 py-2 rounded-2xl ${
                    m.role === 'assistant'
                      ? 'bg-slate-100 text-slate-800 self-start'
                      : 'bg-primary text-white self-end ml-auto'
                  }`}
                >
                  {m.text}
                </div>
              ))}
            </div>

            <form onSubmit={handleSend} className="mt-auto flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 input-rounded bg-slate-50 text-sm"
                placeholder='e.g. "I want to save $20k for a car in 2 years"'
              />
              <button
                type="submit"
                className="btn-primary-rounded flex items-center justify-center px-3 py-2"
              >
                <Send size={16} />
              </button>
            </form>
          </div>

          {/* Right: Stage 1 structured form */}
          <div className="lg:col-span-3 bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
                  Stage 1 · Definition & Diagnostics
                </p>
                <h2 className="text-lg md:text-xl font-bold text-slate-900">
                  Confirm the details of your goal
                </h2>
              </div>
            </div>
            <p className="text-sm text-slate-500">
              As the AI intake evolves, this form will be generated automatically from the
              conversation. For now, please fill in the key details manually.
            </p>

            <GoalDefinitionForm
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

export default GoalIntakePage;


