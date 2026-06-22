---
name: express-ai-chatbot
description: >
  Panduan membangun chatbot AI dengan Node.js, Express.js, EJS, dan integrasi
  multi-provider AI (Claude, OpenAI, Gemini, Ollama). Gunakan skill ini ketika
  membangun aplikasi chat, AI assistant, atau chatbot berbasis web dengan Express.
  Trigger ketika ada request membuat chatbot, integrasi AI API, atau streaming
  response dari LLM ke browser.
---

# Express AI Chatbot — Skill Guide

## Stack
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **View Engine**: EJS
- **AI**: Claude / OpenAI / Gemini / Ollama (switch via `.env`)
- **Streaming**: Server-Sent Events (SSE)
- **Styling**: Tailwind CSS (CDN Play)

---

## Init Project

```bash
mkdir chatbot && cd chatbot
npm init -y
npm install express ejs dotenv axios
npm install --save-dev nodemon
```

`.env`:
```
PORT=3000
AI_PROVIDER=claude          # claude | openai | gemini | ollama
ANTHROPIC_API_KEY=sk-ant-xxx
# OPENAI_API_KEY=sk-xxx
# GEMINI_API_KEY=AIzaxxx
# OLLAMA_BASE_URL=http://localhost:11434
AI_MODEL=claude-sonnet-4-6
SYSTEM_PROMPT=Kamu adalah asisten AI yang membantu dan ramah. Jawab dalam Bahasa Indonesia.
```

---

## `app.js`

```js
require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', require('./routes/chat'));

app.listen(process.env.PORT || 3000, () =>
  console.log(`Chatbot running at http://localhost:${process.env.PORT || 3000}`)
);
```

---

## AI Service Abstraction (`services/ai.js`)

```js
const axios = require('axios');

async function* streamAIResponse(messages) {
  const provider = process.env.AI_PROVIDER || 'claude';

  if (provider === 'claude') {
    yield* streamClaude(messages);
  } else if (provider === 'openai') {
    yield* streamOpenAI(messages);
  } else if (provider === 'gemini') {
    yield* streamGemini(messages);
  } else if (provider === 'ollama') {
    yield* streamOllama(messages);
  }
}

// --- CLAUDE ---
async function* streamClaude(messages) {
  const res = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: process.env.AI_MODEL || 'claude-sonnet-4-6',
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
  const res = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: process.env.AI_MODEL || 'gpt-4o-mini',
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
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const res = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${process.env.AI_MODEL || 'gemini-1.5-flash'}:streamGenerateContent?key=${process.env.GEMINI_API_KEY}&alt=sse`,
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
  const res = await axios.post(
    `${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/api/chat`,
    {
      model: process.env.AI_MODEL || 'llama3',
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
```

---

## Route (`routes/chat.js`)

```js
const express = require('express');
const { streamAIResponse } = require('../services/ai');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('chat', { title: 'AI Chatbot' });
});

router.post('/api/chat', async (req, res) => {
  const { message, history = [] } = req.body;

  // Setup SSE
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
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  } finally {
    res.end();
  }
});

module.exports = router;
```

---

## View (`views/chat.ejs`)

```ejs
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AI Chatbot</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-900 text-white h-screen flex flex-col">
  <header class="bg-slate-800 p-4 flex justify-between items-center border-b border-slate-700">
    <h1 class="text-lg font-bold">🤖 AI Chatbot</h1>
    <button id="clearBtn" class="text-sm text-slate-400 hover:text-white">Hapus Chat</button>
  </header>

  <div id="chatBox" class="flex-1 overflow-y-auto p-4 space-y-4"></div>

  <div class="bg-slate-800 border-t border-slate-700 p-4">
    <div class="flex gap-2 max-w-4xl mx-auto">
      <textarea id="inputMsg" rows="1"
        class="flex-1 bg-slate-700 rounded-xl px-4 py-3 resize-none outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        placeholder="Ketik pesan..."></textarea>
      <button id="sendBtn"
        class="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-xl font-semibold text-sm transition">
        Kirim
      </button>
    </div>
  </div>

  <script src="/chat.js"></script>
</body>
</html>
```

---

## Frontend JS (`public/chat.js`)

```js
let chatHistory = [];

const chatBox = document.getElementById('chatBox');
const inputMsg = document.getElementById('inputMsg');
const sendBtn = document.getElementById('sendBtn');
const clearBtn = document.getElementById('clearBtn');

function addBubble(role, text = '') {
  const isUser = role === 'user';
  const wrapper = document.createElement('div');
  wrapper.className = `flex ${isUser ? 'justify-end' : 'justify-start'}`;

  const bubble = document.createElement('div');
  bubble.className = `max-w-xs lg:max-w-2xl px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
    isUser ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-100'
  }`;
  bubble.textContent = text;

  wrapper.appendChild(bubble);
  chatBox.appendChild(wrapper);
  chatBox.scrollTop = chatBox.scrollHeight;
  return bubble;
}

async function sendMessage() {
  const message = inputMsg.value.trim();
  if (!message) return;

  inputMsg.value = '';
  sendBtn.disabled = true;
  addBubble('user', message);

  const aiBubble = addBubble('assistant');
  let fullResponse = '';

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history: chatHistory }),
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const lines = decoder.decode(value).split('\n').filter(Boolean);
    for (const line of lines) {
      if (line === 'data: [DONE]') break;
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.chunk) {
            fullResponse += data.chunk;
            aiBubble.textContent = fullResponse;
            chatBox.scrollTop = chatBox.scrollHeight;
          }
        } catch {}
      }
    }
  }

  // Simpan ke history
  chatHistory.push({ role: 'user', content: message });
  chatHistory.push({ role: 'assistant', content: fullResponse });
  sendBtn.disabled = false;
}

sendBtn.addEventListener('click', sendMessage);
inputMsg.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
clearBtn.addEventListener('click', () => {
  chatHistory = [];
  chatBox.innerHTML = '';
});
```

---

## Checklist Development

- [ ] Setup `.env` dengan pilih satu provider
- [ ] Install dependencies
- [ ] Buat `services/ai.js` dengan provider yang dipilih
- [ ] Buat route SSE di `/api/chat`
- [ ] Buat UI di `views/chat.ejs`
- [ ] Buat frontend JS di `public/chat.js`
- [ ] Test streaming: pesan harus muncul bertahap
- [ ] Test multi-turn: AI harus ingat konteks percakapan sebelumnya

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Response tidak stream | Pastikan `res.flushHeaders()` dipanggil sebelum loop |
| AI tidak ingat context | Kirim `history` array lengkap tiap request |
| Error 401 | Cek API key di `.env`, pastikan tidak ada spasi |
| Ollama tidak connect | Pastikan Ollama running: `ollama serve` |
| Gemini error format | Mapping role: `assistant` → `model` untuk Gemini |