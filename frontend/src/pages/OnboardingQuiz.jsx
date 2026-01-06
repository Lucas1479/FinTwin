import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateProfile } from '../services/userService';
import { CheckCircle, ChevronRight, ChevronLeft, Shield, TrendingUp, Clock, AlertTriangle, BookOpen, Landmark } from 'lucide-react';

const OnboardingQuiz = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState({
    experienceLevel: '',
    riskReaction: '',
    timeHorizon: '',
    nzMarketKnowledge: '',
    kiwiSaverStatus: '',
  });

  // Derived state for the summary form
  const [summaryData, setSummaryData] = useState({
    riskTolerance: 'Moderate',
    investmentExperience: 'Intermediate',
    investmentHorizon: '5-10 years',
    kiwiSaverContribution: 0.03, // Default to 3%
    taxResidency: 'New Zealand', // Default
  });

  const questions = [
    {
      id: 'experienceLevel',
      title: 'What is your investment experience?',
      subtitle: 'This helps us recommend suitable complex investment products for you.',
      icon: <TrendingUp className="w-8 h-8 text-indigo-500" />,
      options: [
        { value: 'novice', label: 'Novice', desc: 'I have little to no experience, mostly savings.' },
        { value: 'intermediate', label: 'Intermediate', desc: 'I have bought funds or stocks and understand basic concepts.' },
        { value: 'expert', label: 'Expert', desc: 'I have years of trading experience and know derivatives.' },
      ]
    },
    {
      id: 'riskReaction',
      title: 'If the market drops 20%, what would you do?',
      subtitle: 'This tests your true risk tolerance.',
      icon: <AlertTriangle className="w-8 h-8 text-orange-500" />,
      options: [
        { value: 'sell_all', label: 'Sell Everything', desc: 'I cannot tolerate loss; capital preservation is key.' },
        { value: 'sell_some', label: 'Sell Some', desc: 'I would reduce my position to lower risk.' },
        { value: 'hold', label: 'Do Nothing', desc: 'I believe it will bounce back; hold for the long term.' },
        { value: 'buy_more', label: 'Buy More', desc: "It's a buying opportunity; I'll buy more." },
      ]
    },
    {
      id: 'timeHorizon',
      title: 'How long do you plan to invest?',
      subtitle: 'Time horizon determines your capacity for short-term volatility.',
      icon: <Clock className="w-8 h-8 text-blue-500" />,
      options: [
        { value: 'short', label: 'Short Term (0-3 years)', desc: 'I need this money soon.' },
        { value: 'medium', label: 'Medium Term (3-10 years)', desc: 'For mid-term goals like buying a home or education.' },
        { value: 'long', label: 'Long Term (10+ years)', desc: 'Mainly for retirement or wealth transfer.' },
      ]
    },
    {
      id: 'nzMarketKnowledge',
      title: 'How familiar are you with the NZ market?',
      subtitle: 'Understanding local context helps us tailor regional advice.',
      icon: <BookOpen className="w-8 h-8 text-emerald-500" />,
      options: [
        { value: 'low', label: 'Not Familiar', desc: 'I am new to the New Zealand financial system.' },
        { value: 'medium', label: 'Somewhat Familiar', desc: 'I know about major NZX companies and basic tax rules.' },
        { value: 'high', label: 'Very Familiar', desc: 'I actively follow the NZ economy and market trends.' },
      ]
    },
    {
      id: 'kiwiSaverStatus',
      title: 'Are you currently contributing to KiwiSaver?',
      subtitle: 'KiwiSaver is a key component of long-term wealth in NZ.',
      icon: <Landmark className="w-8 h-8 text-purple-500" />,
      options: [
        { value: 'none', label: 'No / Not Eligible', desc: 'I do not have a KiwiSaver account.' },
        { value: 'minimum', label: 'Minimum (3%)', desc: 'I contribute the minimum to get the employer match.' },
        { value: 'active', label: 'Active (4-10%)', desc: 'I contribute a higher percentage for my future.' },
      ]
    }
  ];

  const handleSelect = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleNext = () => {
    if (step < questions.length - 1) {
      setStep(prev => prev + 1);
    } else {
      // Calculate initial summary based on answers
      calculateSummary();
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(prev => prev - 1);
    }
  };

  const calculateSummary = () => {
    // Simple logic to map quiz answers to profile fields
    let risk = 'Moderate';
    let exp = 'Intermediate';
    let horizon = '5-10 years';
    let ksRate = 0.03;

    // Map Experience
    if (answers.experienceLevel === 'novice') exp = 'Novice';
    if (answers.experienceLevel === 'expert') exp = 'Advanced';

    // Map Risk
    if (answers.riskReaction === 'sell_all') risk = 'Conservative';
    if (answers.riskReaction === 'sell_some') risk = 'Moderately Conservative';
    if (answers.riskReaction === 'buy_more') risk = 'Aggressive';
    
    // Map Horizon
    if (answers.timeHorizon === 'short') horizon = '0-3 years';
    if (answers.timeHorizon === 'long') horizon = '10+ years';

    // Map KiwiSaver
    if (answers.kiwiSaverStatus === 'none') ksRate = 0;
    if (answers.kiwiSaverStatus === 'active') ksRate = 0.08; // Assumption for "Active"

    setSummaryData({
      riskTolerance: risk,
      investmentExperience: exp,
      investmentHorizon: horizon,
      kiwiSaverContribution: ksRate,
      taxResidency: 'New Zealand'
    });
  };

  const handleSummaryChange = (e) => {
    const { name, value } = e.target;
    setSummaryData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        riskProfile: {
          riskTolerance: summaryData.riskTolerance,
          investmentHorizon: summaryData.investmentHorizon,
          investmentExperience: summaryData.investmentExperience,
          nzMarketKnowledge: answers.nzMarketKnowledge === 'low' ? 'Low' : answers.nzMarketKnowledge === 'high' ? 'High' : 'Medium' 
        },
        compliance: {
          kiwiSaverContribution: Number(summaryData.kiwiSaverContribution),
          taxResidency: summaryData.taxResidency
        },
        settings: {
          onboardingCompleted: true,
          quizAnswers: answers
        }
      };

      await updateProfile(payload);
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 800);
    } catch (error) {
      console.error('Failed to update profile:', error);
      setLoading(false);
    }
  };

  // Render Logic
  const currentQuestion = questions[step];
  const progress = ((step + 1) / (questions.length + 1)) * 100;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 font-sans text-slate-900">
      
      {/* Progress Bar */}
      <div className="w-full max-w-2xl fixed top-0 left-0 right-0 h-1.5 bg-slate-200">
        <div 
          className="h-full bg-indigo-600 transition-all duration-500 ease-out"
          style={{ width: `${step === 5 ? 100 : progress}%` }}
        />
      </div>

      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden transition-all duration-300">
        
        {/* Header Area */}
        <div className="bg-indigo-600 p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Shield size={120} />
          </div>
          
          <div className="absolute top-6 right-6 z-20">
            <button 
              onClick={() => navigate('/dashboard')}
              className="text-white/60 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-1"
            >
              Skip for now <ChevronRight size={14} />
            </button>
          </div>

          <h1 className="text-2xl font-bold mb-2 z-10 relative">
            {step === questions.length ? 'Confirm Your Profile' : 'Personalization'}
          </h1>
          <p className="text-indigo-100 z-10 relative">
            {step === questions.length 
              ? 'Based on your answers, we generated this profile. Please confirm or edit.' 
              : 'Help us tailor your financial twin to your local needs.'}
          </p>
        </div>

        <div className="p-8">
          
          {/* Quiz Steps */}
          {step < questions.length && (
            <div className="animate-fade-in-up">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-indigo-50 rounded-full">
                  {currentQuestion.icon}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{currentQuestion.title}</h2>
                  <p className="text-slate-500 text-sm">{currentQuestion.subtitle}</p>
                </div>
              </div>

              <div className="space-y-3">
                {currentQuestion.options.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSelect(currentQuestion.id, option.value)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between group
                      ${answers[currentQuestion.id] === option.value 
                        ? 'border-indigo-600 bg-indigo-50' 
                        : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50'
                      }`}
                  >
                    <div>
                      <span className={`block font-semibold ${answers[currentQuestion.id] === option.value ? 'text-indigo-700' : 'text-slate-700'}`}>
                        {option.label}
                      </span>
                      <span className="text-xs text-slate-500 mt-1 block">
                        {option.desc}
                      </span>
                    </div>
                    {answers[currentQuestion.id] === option.value && (
                      <CheckCircle className="text-indigo-600 w-5 h-5" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Summary Step */}
          {step === questions.length && (
            <div className="animate-fade-in-up">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-sm text-amber-800 flex items-start gap-3">
                <div className="mt-0.5"><AlertTriangle size={16} /></div>
                <p>We've calibrated your profile based on your inputs. Please verify these settings before we finalize your dashboard.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                   <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Risk Strategy</h3>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Risk Tolerance</label>
                  <select 
                    name="riskTolerance"
                    value={summaryData.riskTolerance}
                    onChange={handleSummaryChange}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                  >
                    <option value="Conservative">Conservative</option>
                    <option value="Moderately Conservative">Moderately Conservative</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Aggressive">Aggressive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Investment Horizon</label>
                  <select 
                    name="investmentHorizon"
                    value={summaryData.investmentHorizon}
                    onChange={handleSummaryChange}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                  >
                    <option value="0-3 years">Short Term (0-3 yr)</option>
                    <option value="3-5 years">Medium Term (3-5 yr)</option>
                    <option value="5-10 years">Long Term (5-10 yr)</option>
                    <option value="10+ years">Retirement (10+ yr)</option>
                  </select>
                </div>

                <div className="md:col-span-2 mt-2">
                   <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Compliance & Regional</h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">KiwiSaver Contribution</label>
                  <select 
                    name="kiwiSaverContribution"
                    value={summaryData.kiwiSaverContribution}
                    onChange={handleSummaryChange}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                  >
                    <option value={0}>No Contribution (0%)</option>
                    <option value={0.03}>Minimum (3%)</option>
                    <option value={0.04}>Basic (4%)</option>
                    <option value={0.06}>Enhanced (6%)</option>
                    <option value={0.08}>High (8%)</option>
                    <option value={0.10}>Max (10%)</option>
                  </select>
                </div>

                 <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tax Residency</label>
                  <select 
                    name="taxResidency"
                    value={summaryData.taxResidency}
                    onChange={handleSummaryChange}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                  >
                    <option value="New Zealand">New Zealand</option>
                    <option value="Australia">Australia</option>
                    <option value="UK">United Kingdom</option>
                    <option value="USA">United States</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Actions */}
          <div className="mt-8 flex justify-between items-center pt-6 border-t border-slate-100">
            <button
              onClick={handleBack}
              disabled={step === 0 || loading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-slate-600 hover:text-slate-900 transition-colors ${step === 0 ? 'invisible' : ''}`}
            >
              <ChevronLeft size={20} /> Back
            </button>

            {step < questions.length ? (
              <button
                onClick={handleNext}
                disabled={!answers[currentQuestion.id]}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-medium shadow-md shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Next <ChevronRight size={20} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-8 py-2.5 rounded-lg bg-emerald-500 text-white font-medium shadow-md shadow-emerald-200 transition-all hover:bg-emerald-600 hover:shadow-lg disabled:opacity-70"
              >
                {loading ? 'Finalizing...' : 'Complete Setup'} 
                {!loading && <CheckCircle size={18} />}
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default OnboardingQuiz;
