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
   * @param {string} [params.substage] - Current substage (for multi-step stages)
   * @param {Object} [params.substageData] - Data from completed substages
   * @param {boolean} [params.useRag] - Whether to use RAG enrichment
   * @returns {Promise<{ text: string, json: { ai_decision: Object, form_schema: Object } }>}
   */
  generateDecision: async ({ stage, goalContext, userInput, previousDecisions = [], substage, substageData, useRag, mode, askHistory }) => {
    try {
      const response = await api.post('/goals/engine/generate', {
        stage,
        goalContext,
        userInput,
        previousDecisions,
        substage,
        substageData,
        useRag,
        mode,
        askHistory
      });
      
      // Ensure we return a consistent structure even if backend varies
      return response.data;
    } catch (error) {
      console.error('GoalEngineService Error:', error);
      throw error;
    }
  },

  /**
   * Stream a prompt from the AI Goal Engine.
   * @param {Object} params
   * @param {string} params.substage - Current substage (for multi-step stages)
   * @param {Object} params.substageData - Data from completed substages
   * @param {Function} onChunk - Callback for each text chunk (for reasoning)
   * @returns {Promise<Object>} - The final complete JSON data
   */
  generateDecisionStream: async ({ stage, goalContext, userInput, previousDecisions = [], substage, substageData, useRag, mode, askHistory }, onChunk) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/goals/engine/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          // Note: Add auth header if needed, assuming the standard 'api' util handles it usually
          // But fetch needs it manually if not using the wrapper
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({
          stage,
          goalContext,
          userInput,
          previousDecisions,
          substage,
          substageData,
          useRag,
          mode,
          askHistory,
          stream: true
        })
      });

      if (!response.ok) throw new Error('Network response was not ok');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullJson = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.chunk && onChunk) {
              onChunk(data.chunk);
            }
            if (data.done) {
              fullJson = data.json;
            }
          }
        }
      }

      return fullJson;
    } catch (error) {
      console.error('GoalEngineService Stream Error:', error);
      throw error;
    }
  }
};

export default goalEngineService;

