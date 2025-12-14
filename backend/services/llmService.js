import { GoogleGenerativeAI } from '@google/generative-ai';
import { AppError } from '../utils/errors.js';

// LLMService: thin abstraction over different LLM providers (Gemini, Bedrock, DeepSeek, etc.)
// Uses structured output when possible and always returns a unified shape.

class LLMService {
  constructor() {
    this.generativeModel = null;
    this.provider = null;
  }

  // Lazy initialize to ensure environment variables are loaded
  _ensureInitialized() {
    this.provider = process.env.LLM_PROVIDER || 'gemini';
    
    // DEBUG LOG: Verify what provider is actually being selected
    console.log(`[LLMService] Current Provider: ${this.provider}, Env LLM_PROVIDER: ${process.env.LLM_PROVIDER}`);

    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

    if (this.provider === 'gemini') {
        if (!this.generativeModel) {
            if (!apiKey) {
                console.error('LLMService Error: GEMINI_API_KEY is missing in environment variables.');
                throw new AppError('Gemini API Key missing', 500, 'LLM_CONFIG_ERROR');
            } 
            
            try {
                const genAI = new GoogleGenerativeAI(apiKey);
                this.generativeModel = genAI.getGenerativeModel({ model: model });
                console.log(`LLMService: Initialized Gemini with model ${model}`);
            } catch (error) {
                console.error('LLMService: failed to initialize GoogleGenerativeAI', error);
                throw new AppError('Gemini initialization failed', 500, 'LLM_CONFIG_ERROR');
            }
        }
    } else if (this.provider === 'deepseek') {
        if (!process.env.DEEPSEEK_API_KEY) {
            throw new AppError('DeepSeek API Key missing', 500, 'LLM_CONFIG_ERROR');
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
    this._ensureInitialized(); // Ensure config is loaded before use

    if (!prompt) {
      throw new AppError('Prompt is required for LLM generation.', 400, 'PROMPT_REQUIRED');
    }

    if (this.provider === 'gemini') {
      return this.generateWithGemini(prompt, context);
    }

    if (this.provider === 'deepseek') {
      return this.generateWithDeepSeek(prompt, context);
    }

    if (this.provider === 'bedrock') {
      return this.callBedrock(prompt, context);
    }

    throw new AppError(`Unsupported LLM provider: ${this.provider}`, 500, 'LLM_PROVIDER_INVALID');
  }

  isConfigured() {
    try {
        this._ensureInitialized();
        if (this.provider === 'gemini') return !!this.generativeModel;
        if (this.provider === 'deepseek') return !!process.env.DEEPSEEK_API_KEY;
        return false;
    } catch {
        return false;
    }
  }

  // --- DeepSeek Implementation (OpenAI Compatible) ---
  async generateWithDeepSeek(prompt, context) {
      console.log("[LLMService] Generating with DeepSeek...");
      const apiKey = process.env.DEEPSEEK_API_KEY;
      // Handle trailing slash just in case
      const baseUrl = process.env.DEEPSEEK_BASE_URL?.replace(/\/$/, '') || 'https://api.deepseek.com';
      const apiUrl = `${baseUrl}/chat/completions`;
      const model = process.env.DEEPSEEK_MODEL_NAME || 'deepseek-chat';

      const { responseSchema, ...restContext } = context || {};
      
      const contextText = Object.keys(restContext).length > 0 
        ? `\n\nContext:\n${JSON.stringify(restContext, null, 2)}` 
        : '';

      let finalPrompt = prompt + contextText;
      
      // DeepSeek JSON Mode instructions
      if (responseSchema) {
          finalPrompt += "\n\nCRITICAL: Output MUST be valid JSON strictly adhering to the following schema:\n";
          // Inject the schema structure directly into the prompt so DeepSeek knows WHAT to generate
          finalPrompt += JSON.stringify(responseSchema, null, 2);
          finalPrompt += "\n\nDo NOT wrap the JSON in markdown code blocks. Return raw JSON.";
      }

      const messages = [
          { role: "system", content: "You are a helpful financial assistant." },
          { role: "user", content: finalPrompt }
      ];

      try {
          const response = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${apiKey}`
              },
              body: JSON.stringify({
                  model: model,
                  messages: messages,
                  // Enable JSON mode if schema is requested
                  response_format: responseSchema ? { type: "json_object" } : undefined, 
                  temperature: 0.7
              })
          });

          if (!response.ok) {
              const errText = await response.text();
              throw new Error(`DeepSeek API Error: ${response.status} ${errText}`);
          }

          const data = await response.json();
          const text = data.choices?.[0]?.message?.content || "";
          
          let parsedJson = null;
          try {
              // 1. Try direct parse
              parsedJson = JSON.parse(text);
          } catch {
              // 2. Try cleaning markdown blocks ```json ... ```
              const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
              if (jsonMatch) {
                  try {
                      parsedJson = JSON.parse(jsonMatch[1]);
                  } catch (e) {
                      console.warn("DeepSeek output cleanup failed", e);
                  }
              }
          }

          // Note: We removed the hardcoded "responseSchema" unwrapping logic here 
          // to keep the service generic. The Prompt Injection above should solve the structural issue.

          return {
              provider: 'deepseek',
              text: text, 
              json: parsedJson,
              raw: data
          };

      } catch (error) {
          console.error('LLMService: DeepSeek generate error', error);
          throw new AppError(`DeepSeek generation failed: ${error.message}`, 502, 'LLM_PROVIDER_ERROR');
      }
  }

  // --- Gemini structured output ---
  async generateWithGemini(prompt, context) {
    if (!this.generativeModel) {
      throw new AppError('Gemini model is not configured.', 500, 'LLM_CONFIG_ERROR');
    }

    const { responseSchema, ...restContext } = context || {};

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
