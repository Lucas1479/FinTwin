/**
 * Privacy Data Types Configuration
 * 
 * Defines:
 * 1. All available data types with user-friendly labels
 * 2. Which data types each Goal Engine stage requires
 * 3. Helper functions to determine if a request needs privacy permission
 */

// Data type definitions with icons and descriptions
export const DATA_TYPES = [
    { 
        value: 'financial_assets', 
        label: 'Financial Assets', 
        description: 'Bank accounts, investments, KiwiSaver, debts',
        icon: '💰',
        sensitive: true
    },
    { 
        value: 'cash_flows', 
        label: 'Cash Flows', 
        description: 'Income, expenses, subscriptions',
        icon: '💸',
        sensitive: true
    },
    { 
        value: 'goals', 
        label: 'Goals', 
        description: 'Your financial objectives',
        icon: '🎯',
        sensitive: false // Goals are user-created, less sensitive
    },
    { 
        value: 'plans', 
        label: 'Plans', 
        description: 'Allocation strategies',
        icon: '📋',
        sensitive: false
    },
    { 
        value: 'user_profile', 
        label: 'Personal Info', 
        description: 'Age, household, risk tolerance',
        icon: '👤',
        sensitive: true
    }
];

// Stage-specific data requirements
// Maps Goal Engine stages to required data types
export const STAGE_DATA_REQUIREMENTS = {
    // DEFINITION Stage
    'definition': {
        'gap_analysis': ['financial_assets', 'cash_flows'],
        'assumptions': {
            'emergency': ['cash_flows', 'user_profile', 'financial_assets'],
            'default': [] // Most assumptions don't need sensitive data
        },
        'default': [] // Other substages don't need sensitive data
    },
    
    // STRATEGY Stage
    'strategy': ['financial_assets', 'cash_flows', 'user_profile', 'goals', 'plans'],
    
    // PRODUCT Stage
    'product': ['goals', 'plans'], // Less sensitive
    
    // SIMULATION Stage
    'simulation': ['goals', 'plans', 'financial_assets', 'cash_flows']
};

/**
 * Get required data types for a specific request
 * @param {string} stage - Goal Engine stage
 * @param {string} substage - Substage (for DEFINITION stage)
 * @param {string} category - Goal category (e.g., 'emergency')
 * @returns {Array<string>} - Array of required data type values
 */
export const getRequiredDataTypes = (stage, substage = null, category = null) => {
    // Handle DEFINITION stage with substages
    if (stage === 'definition' && substage) {
        const substageReqs = STAGE_DATA_REQUIREMENTS.definition[substage];
        
        // Handle category-specific requirements (e.g., emergency fund)
        if (substageReqs && typeof substageReqs === 'object' && !Array.isArray(substageReqs)) {
            return substageReqs[category] || substageReqs.default || [];
        }
        
        return substageReqs || STAGE_DATA_REQUIREMENTS.definition.default;
    }
    
    // Handle other stages
    return STAGE_DATA_REQUIREMENTS[stage] || [];
};

/**
 * Check if a request requires sensitive data
 * @param {Array<string>} requiredTypes - Required data types
 * @returns {boolean} - True if any required type is sensitive
 */
export const requiresSensitiveData = (requiredTypes) => {
    return requiredTypes.some(type => {
        const dataType = DATA_TYPES.find(dt => dt.value === type);
        return dataType?.sensitive === true;
    });
};

/**
 * Get user-friendly labels for data types
 * @param {Array<string>} dataTypeValues - Array of data type values
 * @returns {Array<Object>} - Array of data type objects with labels
 */
export const getDataTypeLabels = (dataTypeValues) => {
    return dataTypeValues
        .map(value => DATA_TYPES.find(dt => dt.value === value))
        .filter(Boolean); // Remove undefined entries
};

/**
 * Check if permission card should be shown
 * @param {string} stage - Current stage
 * @param {string} substage - Current substage
 * @param {string} category - Goal category
 * @param {boolean} currentPrivacySetting - Current privacy setting (allowAIDataSharing)
 * @returns {boolean} - True if card should be shown
 * 
 * Logic:
 * - Privacy ENABLED (true): User trusts AI globally → Don't show card
 * - Privacy DISABLED (false): User wants control → Show card for temp permission
 */
export const shouldShowPermissionCard = (stage, substage, category, currentPrivacySetting) => {
    // ✅ If privacy is ENABLED, don't show card (user already trusts AI globally)
    if (currentPrivacySetting === true) {
        return false;
    }
    
    // ✅ Privacy is DISABLED → Check if this request needs sensitive data
    const requiredTypes = getRequiredDataTypes(stage, substage, category);
    
    // Show card only if sensitive data is required
    return requiredTypes.length > 0 && requiresSensitiveData(requiredTypes);
};

export default {
    DATA_TYPES,
    STAGE_DATA_REQUIREMENTS,
    getRequiredDataTypes,
    requiresSensitiveData,
    getDataTypeLabels,
    shouldShowPermissionCard
};
