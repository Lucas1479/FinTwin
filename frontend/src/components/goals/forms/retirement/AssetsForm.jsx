import React, { useState, useEffect } from 'react';
import { Shield, TrendingUp, Wallet } from 'lucide-react';

const AssetsForm = ({ initialValues, onSubmit, onChange }) => {
    const [formData, setFormData] = useState({
        current_super_balance: initialValues.goal_details?.current_super_balance || 0,
        kiwisaver_contribution_rate: initialValues.goal_details?.kiwisaver_contribution_rate || 3, // 3, 4, 6, 8, 10
        include_superannuation: initialValues.goal_details?.include_superannuation ?? true,
        other_dedicated_funds: initialValues.goal_details?.other_dedicated_funds || 0
    });

    // Propagate
    useEffect(() => {
        onChange?.({
            goal_details: {
                ...initialValues.goal_details,
                ...formData
            }
        });
    }, [formData]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit?.(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800 flex gap-3">
                <Shield className="shrink-0 text-blue-600" size={20} />
                <div>
                    <strong>Dedicated Assets Only:</strong> Please only include assets strictly locked or earmarked for retirement here. General savings should go in the next "Gap Analysis" stage.
                </div>
            </div>

            {/* KiwiSaver Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900 uppercase tracking-wider">
                    <TrendingUp size={16} /> KiwiSaver
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Current Balance</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                            <input 
                                type="number"
                                value={formData.current_super_balance}
                                onChange={(e) => setFormData(prev => ({ ...prev, current_super_balance: Number(e.target.value) }))}
                                className="w-full pl-7 input-base"
                                placeholder="0"
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Your Contribution Rate</label>
                        <div className="flex bg-slate-100 rounded-xl p-1">
                            {[3, 4, 6, 8, 10].map(rate => (
                                <button
                                    key={rate}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, kiwisaver_contribution_rate: rate }))}
                                    className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all ${
                                        formData.kiwisaver_contribution_rate === rate
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    {rate}%
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* NZ Super Toggle */}
            <div 
                onClick={() => setFormData(prev => ({ ...prev, include_superannuation: !prev.include_superannuation }))}
                className={`cursor-pointer border rounded-2xl p-4 transition-all flex items-start gap-4 ${
                    formData.include_superannuation ? 'border-green-200 bg-green-50/50' : 'border-slate-200 hover:bg-slate-50'
                }`}
            >
                <div className={`p-2 rounded-full shrink-0 ${formData.include_superannuation ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                    <Shield size={20} />
                </div>
                <div className="flex-1">
                    <div className="flex items-center justify-between">
                        <div className="font-bold text-slate-900">Include NZ Superannuation</div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${formData.include_superannuation ? 'bg-green-500 border-green-500' : 'border-slate-300'}`}>
                            {formData.include_superannuation && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        Government pension (~$27k/yr for singles). We deduct this from your required income target.
                    </p>
                </div>
            </div>

            {/* Other Dedicated Funds */}
            <div>
                 <div className="flex items-center gap-2 text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
                    <Wallet size={16} /> Other Locked Funds
                </div>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input 
                        type="number"
                        value={formData.other_dedicated_funds}
                        onChange={(e) => setFormData(prev => ({ ...prev, other_dedicated_funds: Number(e.target.value) }))}
                        className="w-full pl-7 input-base"
                        placeholder="e.g. Private Super schemes"
                    />
                </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
                <button type="submit" className="btn-primary-rounded px-6 py-2.5">
                    Confirm Assets
                </button>
            </div>
        </form>
    );
};

export default AssetsForm;
