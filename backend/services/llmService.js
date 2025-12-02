import { AppError } from '../utils/errors.js';

// LLMService: thin abstraction over different LLM providers (Gemini, Bedrock, etc.)
// Ensures a unified input/output contract for the rest of the app.

class LLMService {
  constructor(provider = process.env.LLM_PROVIDER || 'gemini') {
    this.provider = provider;
  }

  /**
   * Generate a model response with unified output format.
   * @param {string} prompt - Main user/system prompt.
   * @param {object} context - Optional structured context (e.g. GoalContext, stage, user_input).
   * @returns {Promise<{ provider: string, text: string, json: any, raw: any }>}
   */
  async generate(prompt, context = {}) {
    if (!prompt) {
      throw new AppError('Prompt is required for LLM generation.', 400, 'PROMPT_REQUIRED');
    }

    if (this.provider === 'gemini') {
      return this.callGemini(prompt, context);
    }

    if (this.provider === 'bedrock') {
      return this.callBedrock(prompt, context);
    }

    throw new AppError(`Unsupported LLM provider: ${this.provider}`, 500, 'LLM_PROVIDER_INVALID');
  }

  // --- Provider-specific implementations ---

  async callGemini(prompt, context) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new AppError('GEMINI_API_KEY is not configured.', 500, 'LLM_CONFIG_ERROR');
    }

    const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    // For now we just attach context as JSON below the prompt.
    // Later this can be extended to include system instructions / schema.
    const contextText =
      context && Object.keys(context).length > 0
        ? `\n\nContext (JSON):\n${JSON.stringify(context, null, 2)}`
        : '';

    const body = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `${prompt}${contextText}`,
            },
          ],
        },
      ],
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new AppError(
        `Gemini API error: ${response.status} ${response.statusText}`,
        response.status,
        'LLM_PROVIDER_ERROR'
      );
    }

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const text = parts.map((p) => p.text || '').join('').trim();

    let parsedJson = null;
    if (text) {
      try {
        parsedJson = JSON.parse(text);
      } catch {
        // Not strict JSON; leave parsedJson as null, caller can use raw text.
      }
    }

    return {
      provider: 'gemini',
      text,
      json: parsedJson,
      raw: data,
    };
  }

  async callBedrock(prompt, context) {
    // Placeholder for future AWS Bedrock integration.
    // Here we intentionally throw to make it explicit during local dev.
    throw new AppError(
      'Bedrock provider is not implemented yet in LLMService.',
      501,
      'BEDROCK_NOT_IMPLEMENTED'
    );
  }
}

const llmService = new LLMService();

export default llmService;


