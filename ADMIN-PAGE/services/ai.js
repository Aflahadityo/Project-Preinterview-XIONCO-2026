const axios = require('axios');
const db = require('../db/database');

// Dynamic helper to resolve the correct/latest model based on provider
function resolveModelName(provider, model) {
  const m = (model || '').trim().toLowerCase();
  
  if (provider === 'gemini') {
    return m.startsWith('gemini') ? model : 'gemini-2.5-flash';
  }
  if (provider === 'openai') {
    return (m.startsWith('gpt') || m.startsWith('o1') || m.startsWith('o3')) ? model : 'gpt-4o';
  }
  if (provider === 'claude') {
    return m.startsWith('claude') ? model : 'claude-3-5-sonnet-latest';
  }
  if (provider === 'ollama') {
    return model || 'llama3';
  }
  return model || '';
}

// Loads AI configurations dynamically from the settings table, falling back to process.env
async function loadAISettings() {
  const settings = {
    provider: process.env.AI_PROVIDER || 'gemini',
    model: process.env.AI_MODEL || '',
    geminiKey: process.env.GEMINI_API_KEY || '',
    openaiKey: process.env.OPENAI_API_KEY || '',
    claudeKey: process.env.ANTHROPIC_API_KEY || '',
    systemPrompt: process.env.SYSTEM_PROMPT || 'Kamu adalah asisten AI dari XIONCO yang ramah, sopan, dan profesional. Bantu menjawab pertanyaan pengguna tentang furnitur atau topik umum lainnya dalam Bahasa Indonesia secara ringkas dan informatif.'
  };

  try {
    const res = await db.query('SELECT * FROM settings');
    for (const row of res.rows) {
      if (row.key === 'ai_provider' && row.value) settings.provider = row.value;
      if (row.key === 'ai_model' && row.value) settings.model = row.value;
      if (row.key === 'gemini_api_key' && row.value) settings.geminiKey = row.value;
      if (row.key === 'openai_api_key' && row.value) settings.openaiKey = row.value;
      if (row.key === 'anthropic_api_key' && row.value) settings.claudeKey = row.value;
      if (row.key === 'system_prompt' && row.value) settings.systemPrompt = row.value;
    }
  } catch (err) {
    console.error('Error loading AI settings from DB, using env fallback:', err.message);
  }
  return settings;
}

async function* streamAIResponse(messages) {
  const config = await loadAISettings();
  const provider = config.provider;

  try {
    if (provider === 'claude') {
      yield* streamClaude(messages, config);
    } else if (provider === 'openai') {
      yield* streamOpenAI(messages, config);
    } else if (provider === 'gemini') {
      yield* streamGemini(messages, config);
    } else if (provider === 'ollama') {
      yield* streamOllama(messages, config);
    } else {
      throw new Error(`Provider AI "${provider}" tidak didukung.`);
    }
  } catch (err) {
    console.error(`Error in streamAIResponse for provider ${provider}:`, err.message);
    let friendlyError = `Terjadi kesalahan saat menghubungi ${provider.toUpperCase()}. `;
    if (err.response && err.response.data) {
      try {
        if (typeof err.response.data.pipe === 'function') {
          friendlyError += `API Error (Status ${err.response.status}). Pastikan API Key Anda valid.`;
        } else {
          friendlyError += JSON.stringify(err.response.data);
        }
      } catch {
        friendlyError += `Status: ${err.response.status}`;
      }
    } else {
      friendlyError += err.message;
    }
    yield `[ERROR: ${friendlyError}]`;
  }
}

// --- CLAUDE ---
async function* streamClaude(messages, config) {
  if (!config.claudeKey || config.claudeKey === 'your_anthropic_api_key_here') {
    throw new Error('ANTHROPIC_API_KEY belum dikonfigurasi di pengaturan / file .env.');
  }

  const model = resolveModelName('claude', config.model);

  const res = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model,
      max_tokens: 1024,
      system: config.systemPrompt,
      messages,
      stream: true,
    },
    {
      headers: {
        'x-api-key': config.claudeKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      responseType: 'stream',
    }
  );

  for await (const chunk of res.data) {
    const lines = chunk.toString().split('\n').filter(Boolean);
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'content_block_delta' && data.delta?.text) {
            yield data.delta.text;
          }
        } catch {}
      }
    }
  }
}

// --- OPENAI ---
async function* streamOpenAI(messages, config) {
  if (!config.openaiKey || config.openaiKey === 'your_openai_api_key_here') {
    throw new Error('OPENAI_API_KEY belum dikonfigurasi di pengaturan / file .env.');
  }

  const model = resolveModelName('openai', config.model);

  const res = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model,
      messages: [{ role: 'system', content: config.systemPrompt }, ...messages],
      stream: true,
    },
    {
      headers: {
        Authorization: `Bearer ${config.openaiKey}`,
        'content-type': 'application/json',
      },
      responseType: 'stream',
    }
  );

  for await (const chunk of res.data) {
    const lines = chunk.toString().split('\n').filter(Boolean);
    for (const line of lines) {
      if (line.startsWith('data: ') && line !== 'data: [DONE]') {
        try {
          const data = JSON.parse(line.slice(6));
          const text = data.choices?.[0]?.delta?.content;
          if (text) yield text;
        } catch {}
      }
    }
  }
}

// --- GEMINI ---
async function* streamGemini(messages, config) {
  if (!config.geminiKey || config.geminiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY belum dikonfigurasi di pengaturan / file .env.');
  }

  const model = resolveModelName('gemini', config.model);
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const res = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${config.geminiKey}&alt=sse`,
    {
      contents,
      systemInstruction: { parts: [{ text: config.systemPrompt }] },
    },
    { responseType: 'stream' }
  );

  for await (const chunk of res.data) {
    const lines = chunk.toString().split('\n').filter(Boolean);
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) yield text;
        } catch {}
      }
    }
  }
}

// --- OLLAMA (local) ---
async function* streamOllama(messages, config) {
  const model = resolveModelName('ollama', config.model);
  const res = await axios.post(
    `${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/api/chat`,
    {
      model,
      messages: [{ role: 'system', content: config.systemPrompt }, ...messages],
      stream: true,
    },
    { responseType: 'stream' }
  );

  for await (const chunk of res.data) {
    const lines = chunk.toString().split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        if (data.message?.content) yield data.message.content;
      } catch {}
    }
  }
}

module.exports = { streamAIResponse, loadAISettings };
