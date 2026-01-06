import { GoogleGenerativeAI } from '@google/generative-ai';
import { AppError } from '../utils/errors.js';
import vectaraClient from './vectaraClient.js';

// LLMService: thin abstraction over different LLM providers (Gemini, Bedrock, DeepSeek, etc.)
// Uses structured output when possible and always returns a unified shape.
// Now with Function Calling support for tool-based workflows.

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

  /**
   * Generate a streaming response.
   * @param {string} prompt 
   * @param {object} context 
   * @param {Function} onChunk - Callback for each text chunk
   */
  async *generateStream(prompt, context = {}) {
    this._ensureInitialized();
    
    if (this.provider === 'gemini') {
      yield* this.generateStreamWithGemini(prompt, context);
    } else if (this.provider === 'deepseek') {
      yield* this.generateStreamWithDeepSeek(prompt, context);
    } else {
      throw new AppError(`Streaming not supported for provider: ${this.provider}`, 501);
    }
  }

  // ==========================================
  // Function Calling Support (Tool-based AI)
  // ==========================================

  /**
   * Generate with Function Calling support.
   * AI can call tools, and we execute them locally, then continue the conversation.
   * 
   * @param {string} prompt - Main prompt
   * @param {object} context - Context (goalContext, responseSchema, etc.)
   * @param {Array} tools - Tool definitions (name, description, parameters)
   * @param {Function} toolExecutor - Function to execute tools: (toolName, args) => Promise<result>
   * @param {number} maxIterations - Max tool call iterations (default 5)
   * @returns {Promise<{ provider: string, text: string, json: any, toolCalls: Array }>}
   */
  async generateWithTools(prompt, context = {}, tools = [], toolExecutor, maxIterations = 5) {
    this._ensureInitialized();

    if (this.provider === 'gemini') {
      return this.generateWithToolsGemini(prompt, context, tools, toolExecutor, maxIterations);
    }

    // Fallback: For providers without native function calling, simulate with structured output
    console.warn(`[LLMService] Function Calling not natively supported for ${this.provider}, falling back to prompt-based approach`);
    return this.generateWithToolsFallback(prompt, context, tools, toolExecutor, maxIterations);
  }

  /**
   * Gemini Function Calling implementation
   */
  async generateWithToolsGemini(prompt, context, tools, toolExecutor, maxIterations) {
    console.log(`[LLMService] 🔧 Starting Function Calling flow with ${tools.length} tools...`);

    const { responseSchema, ...restContext } = context || {};
    const contextText = restContext && Object.keys(restContext).length > 0
      ? `\n\nContext (JSON):\n${JSON.stringify(restContext, null, 2)}`
      : '';
    const fullPrompt = `${prompt}${contextText}`;

    // Convert our tool definitions to Gemini's format
    const geminiTools = [{
      functionDeclarations: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: this._convertToGeminiSchema(tool.parameters)
      }))
    }];

    // Build generation config
    const generationConfig = responseSchema && Object.keys(responseSchema).length > 0
      ? { responseMimeType: 'application/json', responseSchema }
      : {};

    // Start chat session for multi-turn tool calling
    const chat = this.generativeModel.startChat({
      tools: geminiTools,
      generationConfig
    });

    let allToolCalls = [];
    let finalResponse = null;
    let iteration = 0;

    // Initial message
    let result = await chat.sendMessage(fullPrompt);
    let response = result.response;

    while (iteration < maxIterations) {
      iteration++;
      
      // Check if AI wants to call a function
      const functionCalls = response.functionCalls();
      
      if (!functionCalls || functionCalls.length === 0) {
        // No more function calls, we have the final response
        finalResponse = response;
        break;
      }

      console.log(`[LLMService] 🔧 Iteration ${iteration}: AI requested ${functionCalls.length} tool call(s)`);

      // Execute each function call
      const functionResponses = [];
      for (const call of functionCalls) {
        console.log(`[LLMService] → Calling: ${call.name}(${JSON.stringify(call.args)})`);
        
        try {
          const toolResult = await toolExecutor(call.name, call.args);
          allToolCalls.push({
            name: call.name,
            args: call.args,
            result: toolResult
          });

          functionResponses.push({
            name: call.name,
            response: { result: toolResult }
          });

          console.log(`[LLMService] ← Result: ${JSON.stringify(toolResult).slice(0, 200)}...`);
        } catch (err) {
          console.error(`[LLMService] Tool execution error:`, err);
          functionResponses.push({
            name: call.name,
            response: { error: err.message }
          });
        }
      }

      // Send tool results back to AI
      result = await chat.sendMessage(functionResponses.map(fr => ({
        functionResponse: fr
      })));
      response = result.response;
    }

    if (!finalResponse) {
      finalResponse = response;
    }

    // Parse final response
    const text = finalResponse.text();
    let parsedJson = null;
    try {
      parsedJson = JSON.parse(text);
    } catch {
      // Try to extract JSON from text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedJson = JSON.parse(jsonMatch[0]);
        } catch {}
      }
    }

    console.log(`[LLMService] ✅ Function Calling complete. ${allToolCalls.length} tool calls made.`);

    return {
      provider: 'gemini',
      text,
      json: parsedJson,
      toolCalls: allToolCalls,
      raw: finalResponse
    };
  }

  // ==========================================
  // RAG support (Vectara)
  // ==========================================

  /**
   * Fetch external knowledge from Vectara.
   * @param {object} params
   * @param {string} params.query - query text
   * @param {string} params.stage - goal engine stage
   * @param {object} params.goalContext - enriched context for hints
   */
  async fetchRagContext({ query, stage, goalContext }) {
    const useRag = process.env.ENABLE_VECTARA_RAG === 'true' || process.env.VECTARA_API_KEY;
    if (!useRag) {
      console.log('[LLMService] RAG disabled (ENABLE_VECTARA_RAG not true and no VECTARA_API_KEY).');
      return null;
    }

    const defaultQuery = this._buildRagQuery(stage, goalContext);
    const queryText = query || defaultQuery;
    try {
      const rag = await vectaraClient.searchAndSummarize(queryText);
      return {
        query: queryText,
        summary: rag.summary,
        passages: rag.passages,
        citations: rag.citations,
        provider: 'vectara',
      };
    } catch (err) {
      console.warn('[LLMService] Vectara RAG failed, continuing without RAG:', err.message);
      return null; // fail open
    }
  }

  /**
   * Generate with optional RAG enrichment (non-streaming).
   * If Vectara is disabled or fails, falls back to normal generate.
   */
  async generateWithRag(prompt, context = {}, ragOptions = {}) {
    const useRagEnv = process.env.ENABLE_VECTARA_RAG === 'true' || process.env.VECTARA_API_KEY;
    const useRag = ragOptions.useRag ?? useRagEnv;
    if (!useRag) return this.generate(prompt, context);

    const ragContext = await this.fetchRagContext({
      query: ragOptions.query,
      stage: context.stage,
      goalContext: context.goalContext,
    });

    const mergedContext = {
      ...context,
      external_knowledge: ragContext || context.external_knowledge,
    };

    const result = await this.generate(prompt, mergedContext);
    return { ...result, ragContext };
  }

  _buildRagQuery(stage, goalContext = {}) {
    const userGoal =
      goalContext.goal_name ||
      goalContext.goal_title ||
      goalContext.category ||
      'financial goal';
    const risk =
      goalContext?.riskTolerance ||
      goalContext?.risk_profile?.attitude ||
      goalContext?.ai_decision?.risk_profile?.attitude ||
      'balanced';
    const due = goalContext?.due_date || goalContext?.target_date || '';
    const base = `Contextual info for ${stage} stage. Goal: ${userGoal}. Risk: ${risk}. Due: ${due}.`;
    if (stage === 'definition') {
      return `${base} Provide NZ personal finance guidance, KiwiSaver rules, and typical target amounts/gap analysis references.`;
    }
    if (stage === 'strategy') {
      return `${base} Need economic exposure best practices, KiwiSaver vs managed fund trade-offs, NZ tax/fee considerations.`;
    }
    if (stage === 'product') {
      return `${base} Need product selection considerations, fee/return ranges, diversification patterns for KiwiSaver/ETFs in NZ.`;
    }
    if (stage === 'simulation') {
      return `${base} Need feasibility checks, common pitfalls, and NZ-specific assumptions for projections.`;
    }
    return `${base} General NZ personal finance references.`;
  }

  /**
   * Fallback for providers without native function calling
   * Uses a two-phase approach: 
   * Phase 1: Force AI to call tools to get real products
   * Phase 2: AI builds portfolio from tool results
   */
  async generateWithToolsFallback(prompt, context, tools, toolExecutor, maxIterations) {
    const toolDescriptions = tools.map(t => 
      `- ${t.name}: ${t.description}\n  Parameters: ${JSON.stringify(t.parameters.properties, null, 2)}`
    ).join('\n\n');

    // PHASE 1: Force AI to call the search tool first
    const phase1Prompt = `You are building an investment portfolio. Before you can recommend products, you MUST search the database.

Available Tools:
${toolDescriptions}

Your task: Analyze the strategy context and call search_portfolio_candidates to find real products.

Strategy Context:
${JSON.stringify(context.goalContext?.strategy_summary || context.goalContext?.ai_decision?.strategy_recommendation?.economic_exposure || { growth: 60, defensive: 30, liquidity: 10 }, null, 2)}

CRITICAL: You MUST respond with ONLY a tool_calls array. Example:
{
  "tool_calls": [
    { 
      "name": "search_portfolio_candidates", 
      "args": { 
        "target_growth_pct": 60, 
        "target_defensive_pct": 30, 
        "target_liquidity_pct": 10,
        "max_fees": 2.0,
        "is_retirement_goal": true,
        "products_per_category": 10
      } 
    }
  ]
}

DO NOT make up product IDs. You MUST call the tool first.`;

    let allToolCalls = [];
    let toolResults = null;

    // Execute Phase 1: Get tool calls
    console.log(`[LLMService] Fallback Phase 1: Requesting tool calls from AI...`);
    const phase1Result = await this.generate(phase1Prompt, { responseSchema: {
      type: 'object',
      properties: {
        tool_calls: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              args: { type: 'object' }
            }
          }
        }
      },
      required: ['tool_calls']
    }});

    if (phase1Result.json?.tool_calls && phase1Result.json.tool_calls.length > 0) {
      console.log(`[LLMService] Fallback Phase 1: AI requested ${phase1Result.json.tool_calls.length} tool call(s)`);
      
      toolResults = [];
      for (const call of phase1Result.json.tool_calls) {
        console.log(`[LLMService] → Calling: ${call.name}(${JSON.stringify(call.args)})`);
        try {
          const toolResult = await toolExecutor(call.name, call.args);
          allToolCalls.push({ name: call.name, args: call.args, result: toolResult });
          toolResults.push({ tool: call.name, result: toolResult });
          
          // 根据不同工具类型正确计算结果数量
          const resultCount = toolResult?.portfolio_options?.length 
            ? `${toolResult.portfolio_options.length} portfolios (${toolResult.summary?.candidates_searched || 0} products searched)`
            : toolResult?.summary?.total_candidates 
            ? `${toolResult.summary.total_candidates} products`
            : toolResult?.length 
            ? `${toolResult.length} products`
            : toolResult?.optimized_products?.length
            ? `${toolResult.optimized_products.length} optimized products`
            : '0 results';
          console.log(`[LLMService] ← Found ${resultCount}`);
        } catch (err) {
          console.error(`[LLMService] Tool error:`, err);
          toolResults.push({ tool: call.name, error: err.message });
        }
      }
    } else {
      // AI didn't call tools, force a default search
      console.warn(`[LLMService] Fallback: AI didn't request tools, forcing default search...`);
      const exposure = context.goalContext?.strategy_summary?.target_exposure || 
                      context.goalContext?.ai_decision?.strategy_recommendation?.economic_exposure ||
                      { growth: 60, defensive: 30, liquidity: 10 };
      
      const defaultArgs = {
        target_growth_pct: exposure.growth || 60,
        target_defensive_pct: exposure.defensive || 30,
        target_liquidity_pct: exposure.liquidity || 10,
        max_fees: 2.0,
        is_retirement_goal: context.goalContext?.category === 'retirement',
        products_per_category: 10
      };
      
      console.log(`[LLMService] → Forcing call: search_portfolio_candidates(${JSON.stringify(defaultArgs)})`);
      try {
        const toolResult = await toolExecutor('search_portfolio_candidates', defaultArgs);
        allToolCalls.push({ name: 'search_portfolio_candidates', args: defaultArgs, result: toolResult });
        toolResults = [{ tool: 'search_portfolio_candidates', result: toolResult }];
        console.log(`[LLMService] ← Found ${toolResult?.summary?.total_candidates || 0} products`);
      } catch (err) {
        console.error(`[LLMService] Forced tool call failed:`, err);
        toolResults = [{ tool: 'search_portfolio_candidates', error: err.message }];
      }
    }

    // PHASE 2: Build portfolio from tool results
    console.log(`[LLMService] Fallback Phase 2: Building portfolio from ${allToolCalls.length} tool results...`);
    
    const phase2Prompt = `${prompt}

REAL PRODUCTS FROM DATABASE (use these EXACT product IDs):
${JSON.stringify(toolResults, null, 2)}

CRITICAL INSTRUCTIONS:
1. You MUST use ONLY the product IDs from the search results above (they look like "69421fb6337142418749b75a")
2. DO NOT make up product IDs like "KS-GROWTH-LOWFEE" - these are INVALID
3. Build 2-3 portfolio options using ONLY the real products provided above
4. Each portfolio's weights must sum to 100%

Return your final answer as JSON with portfolio_options.`;

    const phase2Result = await this.generate(phase2Prompt, context);

    return {
      ...phase2Result,
      toolCalls: allToolCalls
    };
  }

  /**
   * Convert our schema format to Gemini's FunctionDeclarationSchema format
   */
  _convertToGeminiSchema(schema) {
    if (!schema) return undefined;
    
    // Gemini uses slightly different schema format
    const converted = {
      type: schema.type?.toUpperCase() || 'OBJECT',
      properties: {},
      required: schema.required || []
    };

    if (schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        converted.properties[key] = {
          type: prop.type?.toUpperCase() || 'STRING',
          description: prop.description || ''
        };

        if (prop.enum) {
          converted.properties[key].enum = prop.enum;
        }

        if (prop.items) {
          converted.properties[key].items = {
            type: prop.items.type?.toUpperCase() || 'STRING'
          };
        }
      }
    }

    return converted;
  }

  async *generateStreamWithGemini(prompt, context) {
    console.log("[LLMService] 🚀 Generating with Gemini (Stream Mode)...");
    const { responseSchema, ...restContext } = context || {};
    const contextText = restContext && Object.keys(restContext).length > 0
        ? `\n\nContext (JSON):\n${JSON.stringify(restContext, null, 2)}`
        : '';
    const fullPrompt = `${prompt}${contextText}`;

    const generationConfig = responseSchema && Object.keys(responseSchema).length > 0
        ? { responseMimeType: 'application/json', responseSchema }
        : {};

    const result = await this.generativeModel.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      generationConfig,
    });

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        yield { type: 'text', content: chunkText };
      }
    }
  }

  async *generateStreamWithDeepSeek(prompt, context) {
      console.log("[LLMService] 🚀 Generating with DeepSeek (Stream Mode)...");
      const apiKey = process.env.DEEPSEEK_API_KEY;
      const baseUrl = process.env.DEEPSEEK_BASE_URL?.replace(/\/$/, '') || 'https://api.deepseek.com';
      const apiUrl = `${baseUrl}/chat/completions`;
      const model = process.env.DEEPSEEK_MODEL_NAME || 'deepseek-chat';

      const { responseSchema, ...restContext } = context || {};
      const contextText = Object.keys(restContext).length > 0 
        ? `\n\nContext:\n${JSON.stringify(restContext, null, 2)}` 
        : '';

      let finalPrompt = prompt + contextText;
      if (responseSchema) {
          finalPrompt += "\n\nCRITICAL: Output MUST be valid JSON strictly adhering to the following schema:\n";
          finalPrompt += JSON.stringify(responseSchema, null, 2);
          finalPrompt += "\n\nDo NOT wrap the JSON in markdown code blocks. Return raw JSON.";
      }

      const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
              model: model,
              messages: [{ role: "user", content: finalPrompt }],
              stream: true,
              response_format: responseSchema ? { type: "json_object" } : undefined,
              temperature: 0.7
          })
      });

      if (!response.ok) throw new Error(`DeepSeek stream error: ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
              const cleanedLine = line.replace(/^data: /, '').trim();
              if (!cleanedLine || cleanedLine === '[DONE]') continue;

              try {
                  const json = JSON.parse(cleanedLine);
                  const content = json.choices?.[0]?.delta?.content;
                  if (content) {
                      yield { type: 'text', content };
                  }
              } catch (e) {
                  // Ignore partial JSON parse errors
              }
          }
      }
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
