import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

import RetirementGoalForm from './forms/RetirementGoalForm';
import HomeGoalForm from './forms/HomeGoalForm';
import DynamicFormRenderer from './forms/DynamicFormRenderer';
import goalEngineService from '../../services/goalEngineService';
import api from '../../utils/api'; // Keep for other API calls if needed

/**
 * The Master Form Component (Stage 1)
 * Decides which specific form to render based on the Category.
 * Manages the connection to the backend LLM for form schema generation.
 */

const GoalDefinitionForm = ({ 
    initialValues = {}, 
    onSubmit, 
    onChange,
    submitting = false,
    submitLabel = "Continue to Strategy"
}) => {
    
    // 1. Central State for the entire form (Stage 1 Context)
    const [goalContext, setGoalContext] = useState(() => ({
        goal_name: '',
        category: 'custom', 
        priority: 'want',
        target_amount: 0,
        due_date: '',
        goal_details: {}, // Polymorphic details
        ...initialValues
    }));

    const [formSchema, setFormSchema] = useState(null);
    const [loadingSchema, setLoadingSchema] = useState(false);
    const [aiError, setAiError] = useState('');

    // Track child form updates to prevent loops
    const isChildUpdateRef = useRef(false);
    const lastReceivedDataRef = useRef('');

    // SYNC: Update internal state when parent props change (e.g. Copilot updates context)
    useEffect(() => {
        // Skip if this was triggered by child form update
        if (isChildUpdateRef.current) {
            isChildUpdateRef.current = false;
            return;
        }
        
        if (!initialValues) return;

        // Create a stable comparison key from incoming data
        const incomingKey = JSON.stringify({
            goal_name: initialValues.goal_name,
            category: initialValues.category,
            priority: initialValues.priority,
            target_amount: initialValues.target_amount,
            due_date: initialValues.due_date,
            inflationAdjust: initialValues.inflationAdjust,
            // Flatten goal_details for stable comparison
            retirement_age: initialValues.goal_details?.retirement_age,
            life_expectancy: initialValues.goal_details?.life_expectancy,
            living_expense_pa: initialValues.goal_details?.living_expense_pa
        });

        // Skip if data hasn't changed
        if (incomingKey === lastReceivedDataRef.current) {
            return;
        }
        lastReceivedDataRef.current = incomingKey;

        console.log('[GoalDefinitionForm] Syncing from parent:', initialValues.goal_details);
        
        setGoalContext(prev => ({
            ...prev,
            ...initialValues,
            // Ensure goal_details is merged carefully, preferring new values
            goal_details: {
                ...prev.goal_details,
                ...(initialValues.goal_details || {})
            }
        }));
    }, [initialValues]);

    // 2. Fetch Schema when Category Changes (or on Mount)
    useEffect(() => {
        const fetchSchema = async () => {
            // Only fetch dynamic schema for non-hardcoded types or if we want AI defaults
            // For MVP, we use hardcoded components for 'retirement' and 'home'
            // and DynamicFormRenderer for others.
            
            const category = goalContext.category;

            // Known hardcoded types don't need a schema fetch (frontend handles UI)
            if (['retirement', 'home'].includes(category)) {
                setFormSchema(null);
                return;
            }

            // For other types, ask backend for the schema
            setLoadingSchema(true);
            try {
                // Call Real API via Service
                const data = await goalEngineService.generateDecision({ 
                    stage: 'definition',
                    goalContext: { category }
                });
                
                if (data && data.json && data.json.form_schema) {
                    setFormSchema(data.json.form_schema);
                    setAiError('');
                } else {
                    throw new Error("Invalid response format from AI");
                }

            } catch (err) {
                console.error("Failed to fetch form schema", err);
                setAiError("Could not load form. Using default.");
                // Fallback basic schema if API fails entirely
                setFormSchema({
                    fields: [
                        { name: 'goal_name', label: 'Goal Name', type: 'text', required: true },
                        { name: 'target_amount', label: 'Target Amount ($)', type: 'currency', required: true },
                        { name: 'due_date', label: 'Target Date', type: 'date', required: true }
                    ]
                });
            } finally {
                setLoadingSchema(false);
            }
        };

        fetchSchema();
    }, [goalContext.category]);


    // 3. Handlers
    const handleFormChange = useCallback((newValues) => {
        isChildUpdateRef.current = true; // Mark that child is updating
        setGoalContext(prev => ({ ...prev, ...newValues }));
        
        // Report back to parent immediately to keep state in sync
        if (onChange) {
            onChange(newValues);
        }
    }, [onChange]);

    const handleCategoryChange = (e) => {
        const newCategory = e.target.value;
        
        // Only reset details if actually changing category manually
        if (newCategory !== goalContext.category) {
             setGoalContext(prev => ({ 
                ...prev, 
                category: newCategory,
                goal_details: {} // Reset details on category switch
            }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(goalContext);
    };

    // 4. Render Logic
    const renderSpecificForm = () => {
        switch (goalContext.category) {
            case 'retirement':
                return (
                    <RetirementGoalForm 
                        initialValues={goalContext} 
                        onChange={handleFormChange} 
                    />
                );
            case 'home':
                return (
                    <HomeGoalForm 
                        initialValues={goalContext} 
                        onChange={handleFormChange} 
                    />
                );
            default:
                // Fallback to Dynamic Renderer
                if (loadingSchema) return <div className="p-8 text-center text-slate-400">Loading AI Form...</div>;
                return (
                    <DynamicFormRenderer 
                        schema={formSchema} 
                        value={goalContext} 
                        onChange={handleFormChange} 
                    />
                );
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 mt-6">
            
            {/* Category Switcher (Always Visible) */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Goal Category
                </label>
                <select 
                    value={goalContext.category} 
                    onChange={handleCategoryChange}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:ring-2 focus:ring-slate-900 outline-none"
                >
                    <option value="custom">Custom Goal</option>
                    <option value="retirement">Retirement</option>
                    <option value="home">Home Ownership</option>
                    <option value="vehicle">Vehicle</option>
                    <option value="travel">Travel</option>
                    <option value="emergency">Emergency Fund</option>
                    <option value="education">Education</option>
                    <option value="wealth">Wealth Growth</option>
                </select>
            </div>

            {/* The Specific Form Area */}
            <div className="min-h-[300px]">
                {renderSpecificForm()}
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end pt-6 border-t border-slate-100">
                <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary-rounded flex items-center gap-2 px-8 py-4 text-lg shadow-xl shadow-brand-200 hover:shadow-2xl hover:shadow-brand-300 transition-all"
                >
                    {submitting ? 'Analyzing...' : submitLabel}
                    {!submitting && <ArrowRight className="w-5 h-5" />}
                </button>
            </div>

        </form>
    );
};

export default GoalDefinitionForm;
