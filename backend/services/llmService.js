import { GoogleGenerativeAI } from '@google/generative-ai';
import { AppError } from '../utils/errors.js';

// LLMService: thin abstraction over different LLM providers (Gemini, Bedrock, etc.)
// Uses structured output when possible and always returns a unified shape.

class LLMService {
  constructor(provider = process.env.LLM_PROVIDER || 'gemini') {
    this.provider = provider;

    this.apiKey = process.env.GEMINI_API_KEY;
    this.model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

    if (this.provider === 'gemini' && this.apiKey && this.apiKey !== 'your_gemini_api_key_here') {
      try {
        this.genAI = new GoogleGenerativeAI(this.apiKey);
        this.generativeModel = this.genAI.getGenerativeModel({ model: this.model });
        // console.log('LLMService: GoogleGenerativeAI initialized');
      } catch (error) {
        console.error('LLMService: failed to initialize GoogleGenerativeAI', error);
      }
    }
  }

  /**
   * Generate a model response with unified output format.
   * @param {string} prompt - Main user/system prompt.
   * @param {object} context - Optional structured context (e.g. GoalContext, stage, user_input, responseSchema).
   * @returns {Promise<{ provider: string, text: string, json: any, raw: any }>}
   */
  async generate(prompt, context = {}) {
    if (!prompt) {
      throw new AppError('Prompt is required for LLM generation.', 400, 'PROMPT_REQUIRED');
    }

    if (this.provider === 'gemini') {
      return this.generateWithGemini(prompt, context);
    }

    if (this.provider === 'bedrock') {
      return this.callBedrock(prompt, context);
    }

    throw new AppError(`Unsupported LLM provider: ${this.provider}`, 500, 'LLM_PROVIDER_INVALID');
  }

  isConfigured() {
    return !!this.generativeModel;
  }

  // --- Gemini structured output (similar style to aiService.js) ---
  async generateWithGemini(prompt, context) {
    if (!this.generativeModel) {
      throw new AppError('Gemini model is not configured.', 500, 'LLM_CONFIG_ERROR');
    }

    const { responseSchema, ...restContext } = context || {};

    // 默认行为：将 context 作为 JSON 附加在 prompt 下方，调用方仍需在 prompt 中要求 "Return JSON only"。
    const contextText =
      restContext && Object.keys(restContext).length > 0
        ? `\n\nContext (JSON):\n${JSON.stringify(restContext, null, 2)}`
        : '';

    const fullPrompt = `${prompt}${contextText}`;

    const generationConfig =
      responseSchema && Object.keys(responseSchema).length > 0
        ? {
            responseMimeType: 'application/json',
            responseSchema,
          }
        : {};

    try {
      const result = await this.generativeModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        generationConfig,
      });

      const response = await result.response;
      const text = response.text();

      let parsedJson = null;
      if (text) {
        try {
          parsedJson = JSON.parse(text);
        } catch {
          // If the model did not return strict JSON, parsedJson stays null.
        }
      }

      return {
        provider: 'gemini',
        text,
        json: parsedJson,
        raw: response,
      };
    } catch (error) {
      console.error('LLMService: Gemini generate error', error);
      throw new AppError('Gemini generation failed', 502, 'LLM_PROVIDER_ERROR');
    }
  }

  async callBedrock(prompt, context) {
    // Placeholder for future AWS Bedrock integration.
    throw new AppError(
      'Bedrock provider is not implemented yet in LLMService.',
      501,
      'BEDROCK_NOT_IMPLEMENTED'
    );
  }
}

const llmService = new LLMService();

export default llmService;

