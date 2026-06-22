# XIONCO AI Chatbot

AI-powered streaming chatbot for XIONCO furniture. Supports multiple LLM providers — switch via env var.

## Stack

- **Backend:** Node.js + Express
- **Templating:** EJS
- **Frontend:** Vanilla JS + CSS, Marked.js (markdown), Bootstrap Icons
- **AI Providers:** Gemini, OpenAI, Claude, Ollama (local)

## Quick Start

```bash
# Install
npm install

# Configure
cp .env.example .env
# Edit .env — set your API key and preferred provider

# Run (dev)
npm run dev

# Run (prod)
npm start
```

Server → `http://localhost:3001`

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server port | `3001` |
| `AI_PROVIDER` | `gemini` / `openai` / `claude` / `ollama` | `gemini` |
| `AI_MODEL` | Model name for chosen provider | `gemini-2.5-flash` |
| `GEMINI_API_KEY` | Google Gemini API key | — |
| `OPENAI_API_KEY` | OpenAI API key | — |
| `ANTHROPIC_API_KEY` | Anthropic API key | — |
| `OLLAMA_BASE_URL` | Ollama server URL | `http://localhost:11434` |
| `SYSTEM_PROMPT` | System prompt for the AI assistant | XIONCO furniture assistant (ID) |

## Supported Providers

| Provider | Default Model | Endpoint |
|---|---|---|
| Gemini | `gemini-2.5-flash` | `generativelanguage.googleapis.com` |
| OpenAI | `gpt-4o` | `api.openai.com` |
| Claude | `claude-3-5-sonnet-latest` | `api.anthropic.com` |
| Ollama | `llama3` | `localhost:11434` |

## Architecture

```
chat.ejs  →  public/chat.js  →  POST /api/chat (SSE)  →  services/ai.js  →  LLM API
                                                                  ↓
                                                           Stream chunks back
```

- **No database** — chat history lives in browser memory only
- Responses stream token-by-token via Server-Sent Events
- Markdown rendered client-side in real-time
