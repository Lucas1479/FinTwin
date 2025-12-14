import api from '../utils/api';

/**
 * Service for interacting with the AI Goal Engine.
 * Handles generation requests, context management, and decision logging.
 */
const goalEngineService = {
  /**
   * Send a prompt to the AI Goal Engine.
   * @param {Object} params
   * @param {string} params.stage - Current stage ('definition', 'strategy', etc.)
   * @param {Object} params.goalContext - The current state of the goal
   * @param {Object} [params.userInput] - User's chat message or form input
   * @param {Array} [params.previousDecisions] - History of decisions (optional)
   * @returns {Promise<{ text: string, json: { ai_decision: Object, form_schema: Object } }>}
   */
  generateDecision: async ({ stage, goalContext, userInput, previousDecisions = [] }) => {
    try {
      const response = await api.post('/goals/engine/generate', {
        stage,
        goalContext,
        userInput,
        previousDecisions
      });
      
      // Ensure we return a consistent structure even if backend varies
      return response.data;
    } catch (error) {
      console.error('GoalEngineService Error:', error);
      throw error;
    }
  },
};

export default goalEngineService;

