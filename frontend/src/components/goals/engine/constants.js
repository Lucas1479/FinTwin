/**
 * Goal Engine Constants
 * 
 * Substage configurations and utility functions
 */

// Substage configuration (Stage 1: Definition)
export const GENERIC_SUBSTAGES = [
    { id: 'goal_discovery', label: 'Goal Discovery', required: true, description: 'Details, timeline, constraints' },
    { id: 'assumptions', label: 'Key Assumptions', required: false, description: 'Return, inflation, risk, cashflow flexibility' },
    { id: 'gap_analysis', label: 'GAP Analysis', required: true, description: 'Income/assets/debts/policy for gap sizing' }
];

/**
 * Get substage configuration based on goal category
 * @param {string} category - Goal category
 * @returns {Array} Array of substage configurations
 */
export const getSubstagesForCategory = (category) => {
    return GENERIC_SUBSTAGES;
};

/**
 * Build initial substage state
 * @returns {Object} Initial state object
 */
export const buildInitialSubstageState = () => ({
    definition: {
        order: GENERIC_SUBSTAGES.map(s => s.id),
        currentIndex: 0,
        statusById: GENERIC_SUBSTAGES.reduce((acc, s) => ({ ...acc, [s.id]: 'collecting' }), {})
    }
});
