import React from 'react';
import RetirementGoalForm from './RetirementGoalForm';
import HomeGoalForm from './HomeGoalForm';
import EducationGoalForm from './EducationGoalForm';
import EmergencyGoalForm from './EmergencyGoalForm';
import VehicleGoalForm from './VehicleGoalForm';
import TravelGoalForm from './TravelGoalForm';
import MajorPurchaseGoalForm from './MajorPurchaseGoalForm';
import WealthGrowthGoalForm from './WealthGrowthGoalForm';
import DynamicFormRenderer from './DynamicFormRenderer';

// Registry Mapping
const FORM_REGISTRY = {
    retirement: RetirementGoalForm,
    home: HomeGoalForm,
    education: EducationGoalForm,
    emergency: EmergencyGoalForm,
    vehicle: VehicleGoalForm,
    travel: TravelGoalForm,
    big_purchase: MajorPurchaseGoalForm,  // Major Purchase / Event
    wealth: WealthGrowthGoalForm          // Wealth Growth
    // 'custom' will fall back to DynamicFormRenderer for truly custom goals
};

/**
 * Unified Renderer for Goal Forms
 * Handles the logic of selecting the correct component and passing props.
 * 
 * @param {string} category - The goal category (e.g., 'retirement')
 * @param {object} props - The standard props passed to all forms
 * @param {object} fallbackProps - Props for the dynamic fallback
 */
export const renderGoalForm = (category, props, fallbackSchema = null) => {
    const Component = FORM_REGISTRY[category];

    if (Component) {
        return <Component {...props} />;
    }

    // Fallback to Dynamic Renderer if no specific component exists
    // OR if the category is 'custom' or unknown
    if (fallbackSchema) {
        return (
            <DynamicFormRenderer 
                schema={fallbackSchema} 
                value={props.initialValues} 
                onChange={props.onChange} 
            />
        );
    }

    return null;
};

/**
 * Helper to check if a category has a custom form
 */
export const hasCustomForm = (category) => {
    return !!FORM_REGISTRY[category];
};

export default FORM_REGISTRY;