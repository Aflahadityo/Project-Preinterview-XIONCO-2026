const express = require('express');
const { streamAIResponse, loadAISettings } = require('../services/ai');
const db = require('../db/database');
const router = express.Router();

// Middleware to restrict access to super_admin role
const requireSuperAdmin = (req, res, next) => {
  if (req.session && req.session.isAdmin && req.session.role === 'super_admin') {
    return next();
  }
  res.redirect('/assistant?error=Akses ditolak. Pengaturan hanya untuk Super Admin.');
};

router.get('/', async (req, res) => {
  const config = await loadAISettings();
  res.render('assistant', { 
    title: 'AI Assistant',
    provider: config.provider,
    model: config.model || 'gemini-2.5-flash'
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

// GET AI Configuration Panel (Super Admin only)
router.get('/settings', requireSuperAdmin, async (req, res) => {
  const settings = await loadAISettings();
  res.render('assistant/settings', {
    title: 'Pengaturan Asisten AI',
    settings,
    query: req.query
  });
});

// POST Save AI Configurations (Super Admin only)
router.post('/settings', requireSuperAdmin, async (req, res) => {
  const { ai_provider, ai_model, gemini_api_key, openai_api_key, anthropic_api_key, system_prompt } = req.body;
  
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    const upsertSetting = async (key, val) => {
      await client.query(
        'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
        [key, (val || '').trim()]
      );
    };

    await upsertSetting('ai_provider', ai_provider);
    await upsertSetting('ai_model', ai_model);
    await upsertSetting('gemini_api_key', gemini_api_key);
    await upsertSetting('openai_api_key', openai_api_key);
    await upsertSetting('anthropic_api_key', anthropic_api_key);
    await upsertSetting('system_prompt', system_prompt);

    await client.query('COMMIT');
    res.redirect('/assistant/settings?success=Pengaturan AI berhasil diperbarui.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error saving AI settings:', err);
    res.redirect('/assistant/settings?error=Gagal menyimpan pengaturan AI: ' + err.message);
  } finally {
    client.release();
  }
});

module.exports = router;
