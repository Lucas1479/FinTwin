import express from 'express';
import llmService from '../services/llmService.js';
import { HELP_SYSTEM_PROMPT } from '../services/helpPrompts.js';
import asyncHandler from 'express-async-handler';

// POST /api/help/chat
const chatWithHelp = asyncHandler(async (req, res) => {
  const { message, history } = req.body;

  if (!message) {
    res.status(400);
    throw new Error('Message is required');
  }

  // Construct context from conversation history (last 5 turns to keep context window manageable)
  // Format: "User: ... \n Assistant: ..."
  const recentHistory = history 
    ? history.slice(-5).map(msg => `${msg.role === 'user' ? 'User' : 'FinTwin'}: ${msg.content}`).join('\n')
    : '';

  const fullPrompt = `
${HELP_SYSTEM_PROMPT}

CONVERSATION HISTORY:
${recentHistory}

CURRENT USER QUESTION:
${message}

ANSWER:
`;

  // Set headers for streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const stream = llmService.generateStream(fullPrompt);

    for await (const chunk of stream) {
      if (chunk.content) {
        // SSE format: data: { "token": "..." }
        res.write(`data: ${JSON.stringify({ token: chunk.content })}\n\n`);
      }
    }
    
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error('Help Chat Error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Failed to generate response' })}\n\n`);
    res.end();
  }
});

const router = express.Router();
router.post('/chat', chatWithHelp);

export default router;

