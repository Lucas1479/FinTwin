import express from 'express';
import llmService from '../services/llmService.js';
import { HELP_SYSTEM_PROMPT } from '../services/helpPrompts.js';
import asyncHandler from 'express-async-handler';
import { AppError } from '../utils/errors.js';

// Response schema to force references in help chat
const HELP_CHAT_SCHEMA = {
  type: 'object',
  properties: {
    text: { type: 'string', description: 'Main assistant reply in Markdown' },
    thought_process: { type: 'string', description: 'Short internal reasoning (optional)' },
    references: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          url: { type: 'string' },
          source: { type: 'string' }
        },
        required: ['title']
      }
    }
  },
  required: ['text']
};

// POST /api/help/chat
const chatWithHelp = asyncHandler(async (req, res) => {
  const { message, history, context } = req.body || {}; // Extract context (anchor)

  if (!message) {
    throw new AppError('Message is required', 400, 'HELP_MESSAGE_REQUIRED');
  }

  // Construct compact history (last 5 turns)
  const recentHistory = (history || [])
    .slice(-5)
    .map((msg) => `${msg.role === 'user' ? 'User' : 'FinTwin'}: ${msg.content}`)
    .join('\n');

  try {
    const log = (evt, extra = {}) => {
      if (process.env.DEBUG_HELP_LOG === 'false') return;
      console.log(`[HelpChat] ${evt}`, {
        messageExcerpt: message?.slice(0, 120),
        ...extra,
      });
    };

    // Construct Metadata Filter if anchor is present
    // anchor_id was stored in part metadata during ingestion
    let filter = undefined;
    if (context && context.contextTag) {
        // Vectara V2 Filter syntax: part.metadata.key = 'value'
        // We use part.metadata because our script attached metadata to Sections (which become parts)
        filter = `part.metadata.anchor_id = '${context.contextTag}'`;
        log('rag_filter_applied', { filter });
    }

    // Fetch RAG context first (non-stream), then stream LLM text using that knowledge.
    const ragContext = await llmService.fetchRagContext({
      query: message,
      stage: 'help',
      goalContext: {},
      filter: filter // Pass the filter
    });

    log('rag_lookup', {
      hasRag: !!ragContext,
      passages: ragContext?.passages?.length || 0,
      summary: ragContext?.summary ? ragContext.summary.slice(0, 80) : null,
    });

    const availableRefs = ragContext?.passages?.length || 0;

    const fullPrompt = `
${HELP_SYSTEM_PROMPT}

You will receive external_knowledge (summary + passages). When citing facts from it:
- Use inline markers like [1], [2] that correspond to passages order.
- You must not use more markers than available passages (available: ${availableRefs}).
- Do NOT invent URLs; keep citations grounded in provided passages.
- Keep Markdown concise, Kiwi-friendly tone.

CONVERSATION HISTORY:
${recentHistory}

CURRENT USER QUESTION:
${message}

ANSWER:
`.trim();

    // Stream raw text; collect it for final assembly if needed.
    let accumulated = '';
    const stream = llmService.generateStream(fullPrompt, {
      stage: 'help',
      external_knowledge: ragContext || undefined
    });

    for await (const chunk of stream) {
      if (chunk.type === 'text' && chunk.content) {
        accumulated += chunk.content;
        res.write(`data: ${JSON.stringify({ token: chunk.content })}\n\n`);
      }
    }

    // Build references from RAG context (if available)
    const references = (ragContext?.passages || []).slice(0, 5).map((p, idx) => {
      const url = p.url && p.url.trim() ? p.url.trim() : '';
      const marker = `[${idx + 1}]`;
      const title = p.title || p.source || 'Reference';
      const source = p.source || (url ? (() => { try { return new URL(url).hostname; } catch { return 'Vectara'; } })() : 'Vectara');
      const snippet = p.text;
      return { marker, title, url, source, snippet };
    });

    log('done', { refs: references.length, hadRag: !!ragContext, tokens: accumulated.length });

    res.write(`data: ${JSON.stringify({ done: true, references })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Help Chat Error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Failed to generate response' })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

const router = express.Router();
router.post('/chat', chatWithHelp);

export default router;

