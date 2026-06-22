# PRD — Chatbot Sederhana dengan AI Integration

## Overview
Aplikasi chatbot berbasis web yang terintegrasi dengan AI (Claude/OpenAI/Gemini) menggunakan Express.js sebagai backend dan EJS untuk tampilan. User bisa chat real-time dengan AI melalui browser.

---

## Tech Stack
| Layer | Tech |
|-------|------|
| Runtime | Node.js |
| Framework | Express.js |
| View Engine | EJS |
| AI Provider | Claude (Anthropic) — bisa swap ke OpenAI/Gemini |
| HTTP Client | node-fetch / axios |
| Realtime | Server-Sent Events (SSE) untuk streaming |
| Styling | Tailwind CSS (CDN Play) |

---

## Goals
- User bisa chat dengan AI melalui UI browser
- Mendukung streaming response (teks muncul bertahap)
- Riwayat chat tersimpan di session (in-memory, bukan DB)
- Mudah ganti AI provider via `.env`
- UI clean, chat bubble style

---

## AI Provider Options

### Primary: Anthropic Claude
```
ANTHROPIC_API_KEY=sk-ant-...
AI_PROVIDER=claude
AI_MODEL=claude-sonnet-4-6
```

### Alternatif: OpenAI
```
OPENAI_API_KEY=sk-...
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
```

### Alternatif: Google Gemini
```
GEMINI_API_KEY=AIza...
AI_PROVIDER=gemini
AI_MODEL=gemini-1.5-flash
```

### Alternatif: Ollama (local, gratis)
```
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
AI_MODEL=llama3
```

---

## Fitur

### Core
- Chat bubble UI (user kanan, AI kiri)
- Streaming response dari AI (karakter per karakter)
- Multi-turn conversation (AI ingat konteks dalam satu session)
- Clear chat / reset session
- System prompt yang bisa dikonfigurasi via `.env`

### Nice to Have (optional)
- Pilihan model/provider dari UI
- Copy response ke clipboard
- Markdown rendering di response AI
- Loading indicator saat AI mengetik

---

## API Endpoint

### `GET /`
Render halaman chat utama.

### `POST /api/chat`
Input:
```json
{
  "message": "Halo, siapa kamu?",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

Output (SSE streaming):
```
data: {"chunk": "Halo"}
data: {"chunk": "! Saya"}
data: {"chunk": " adalah AI asisten."}
data: [DONE]
```

### `POST /api/clear`
Reset riwayat chat di session.

---

## Conversation Flow

```
User input → POST /api/chat
         → Kirim history + message ke AI API
         → Stream response balik ke browser via SSE
         → Browser render chunk per chunk ke chat bubble
         → Simpan [user msg + ai response] ke client-side state
```

---

## Project Structure
```
project2-chatbot/
├── app.js
├── services/
│   └── ai.js              # abstraksi AI provider
├── routes/
│   └── chat.js
├── views/
│   ├── layout.ejs
│   └── chat.ejs
├── public/
│   └── chat.js            # frontend JS untuk SSE & UI
├── .env
├── .env.example
└── package.json
```

---

## UI Design Brief
- Background: dark/slate
- Chat container: rounded card, full height
- User bubble: kanan, warna accent (blue/purple)
- AI bubble: kiri, warna netral (gray/dark)
- Input bar: sticky bottom, textarea + send button
- Animasi: fade in per bubble, typing indicator (dots)

---

## Non-Goals
- Autentikasi user
- Simpan history ke database
- Multiple chat session / conversation history
- File upload ke AI
- Voice input/output