const axios = require('axios');

// Dynamic helper to resolve the correct/latest model based on provider
function getModelName(provider) {
  const envModel = (process.env.AI_MODEL || '').trim().toLowerCase();
  
  if (provider === 'gemini') {
    return envModel.startsWith('gemini') ? process.env.AI_MODEL : 'gemini-2.5-flash';
  }
  if (provider === 'openai') {
    return (envModel.startsWith('gpt') || envModel.startsWith('o1') || envModel.startsWith('o3')) ? process.env.AI_MODEL : 'gpt-4o';
  }
  if (provider === 'claude') {
    return envModel.startsWith('claude') ? process.env.AI_MODEL : 'claude-3-5-sonnet-latest';
  }
  if (provider === 'ollama') {
    return process.env.AI_MODEL || 'llama3';
  }
  return process.env.AI_MODEL || '';
}

async function* streamAIResponse(messages) {
  const provider = process.env.AI_PROVIDER || 'gemini';

  try {
    if (provider === 'claude') {
      yield* streamClaude(messages);
    } else if (provider === 'openai') {
      yield* streamOpenAI(messages);
    } else if (provider === 'gemini') {
      yield* streamGemini(messages);
    } else if (provider === 'ollama') {
      yield* streamOllama(messages);
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
async function* streamClaude(messages) {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_anthropic_api_key_here') {
    throw new Error('ANTHROPIC_API_KEY belum dikonfigurasi di file .env.');
  }

  const model = getModelName('claude');

  const res = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model,
      max_tokens: 1024,
      system: process.env.SYSTEM_PROMPT || 'You are a helpful assistant.',
      messages,
      stream: true,
    },
    {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
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
async function* streamOpenAI(messages) {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
    throw new Error('OPENAI_API_KEY belum dikonfigurasi di file .env.');
  }

  const model = getModelName('openai');

  const res = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model,
      messages: [{ role: 'system', content: process.env.SYSTEM_PROMPT }, ...messages],
      stream: true,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
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
async function* streamGemini(messages) {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY belum dikonfigurasi di file .env.');
  }

  const model = getModelName('gemini');
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const res = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${process.env.GEMINI_API_KEY}&alt=sse`,
    {
      contents,
      systemInstruction: { parts: [{ text: process.env.SYSTEM_PROMPT }] },
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
async function* streamOllama(messages) {
  const model = getModelName('ollama');
  const res = await axios.post(
    `${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/api/chat`,
    {
      model,
      messages: [{ role: 'system', content: process.env.SYSTEM_PROMPT }, ...messages],
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

module.exports = { streamAIResponse };
