const express = require('express');
const { streamAIResponse } = require('../services/ai');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('assistant', { 
    title: 'AI Assistant',
    provider: process.env.AI_PROVIDER || 'gemini',
    model: process.env.AI_MODEL || 'gemini-2.5-flash'
  });
});

router.post('/chat', async (req, res) => {
  const { message, history = [] } = req.body;

  // Setup Server-Sent Events headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const messages = [...history, { role: 'user', content: message }];

  try {
    for await (const chunk of streamAIResponse(messages)) {
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }
    res.write('data: [DONE]\n\n');
  } catch (err) {
    console.error('Error in assistant chat streaming:', err);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  } finally {
    res.end();
  }
});

router.post('/clear', (req, res) => {
  res.json({ success: true, message: 'Chat history cleared' });
});

module.exports = router;
