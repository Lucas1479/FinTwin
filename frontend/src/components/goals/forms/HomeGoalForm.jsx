import React from 'react';
import HomeVisionForm from './home/HomeVisionForm';
import HomePlanningParametersForm from './home/HomePlanningParametersForm';
import HomeGapFeasibilityForm from './home/HomeGapFeasibilityForm';

const HomeGoalForm = ({ initialValues, onChange, activeSubstage = 'goal_discovery', substageData = {}, onSubstageSubmit, needsRecompute = false }) => {
    
    // Substage Router
    if (activeSubstage === 'goal_discovery') {
        return (
            <HomeVisionForm 
                initialValues={initialValues} 
                onChange={onChange} 
                onSubstageSubmit={onSubstageSubmit} 
                needsRecompute={needsRecompute} 
            />
        );
    }

    if (activeSubstage === 'assumptions') {
        return (
            <HomePlanningParametersForm 
                initialValues={initialValues} 
                onChange={onChange} 
                onSubstageSubmit={onSubstageSubmit} 
            />
        );
    }

    if (activeSubstage === 'gap_analysis') {
        return (
            <HomeGapFeasibilityForm 
                initialValues={initialValues} 
                onSubstageSubmit={onSubstageSubmit} 
            />
        );
    }

    // Fallback
    return <div className="text-center text-slate-500 py-8">Unknown Substage: {activeSubstage}</div>;
};

export default HomeGoalForm;