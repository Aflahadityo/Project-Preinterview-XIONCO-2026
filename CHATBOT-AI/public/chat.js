let chatHistory = [];

const chatBox = document.getElementById('chatBox');
const inputMsg = document.getElementById('inputMsg');
const sendBtn = document.getElementById('sendBtn');
const clearBtn = document.getElementById('clearBtn');
const welcomeCard = document.getElementById('welcomeCard');
const typingTemplate = document.getElementById('typingTemplate');

// Auto-grow textarea height
inputMsg.addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = (this.scrollHeight - 16) + 'px';
});

// Send quick message from recommendations
function quickMessage(text) {
  inputMsg.value = text;
  sendMessage();
}

// Add chat bubble helper
function addBubble(role, text = '') {
  const isUser = role === 'user';
  
  // Wrapper
  const wrapper = document.createElement('div');
  wrapper.className = `flex gap-3 bubble-anim ${isUser ? 'justify-end' : 'justify-start items-start'}`;

  // Avatar for AI
  if (!isUser) {
    const avatar = document.createElement('div');
    avatar.className = 'w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 mt-1';
    avatar.innerHTML = '<i class="bi bi-robot text-xs text-indigo-400"></i>';
    wrapper.appendChild(avatar);
  }

  // Bubble
  const container = document.createElement('div');
  container.className = 'relative group max-w-[85%] sm:max-w-2xl';

  const bubble = document.createElement('div');
  bubble.className = `px-4 py-3 rounded-2xl text-sm leading-relaxed ${
    isUser 
      ? 'bg-indigo-600 text-white rounded-tr-none' 
      : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-none prose-ai'
  }`;

  if (isUser) {
    bubble.textContent = text;
  } else {
    bubble.innerHTML = text ? marked.parse(text) : '<span class="text-slate-500 italic">Berpikir...</span>';
  }

  container.appendChild(bubble);

  // Copy button for AI bubble
  if (!isUser) {
    const actions = document.createElement('div');
    actions.className = 'absolute -bottom-6 left-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-10';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'text-[10px] font-semibold text-slate-500 hover:text-slate-300 flex items-center gap-1 bg-slate-950 border border-slate-850 rounded px-2 py-0.5 transition';
    copyBtn.innerHTML = '<i class="bi bi-clipboard"></i> Salin';
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.innerHTML = '<i class="bi bi-check-lg text-emerald-400"></i> Tersalin!';
        setTimeout(() => {
          copyBtn.innerHTML = '<i class="bi bi-clipboard"></i> Salin';
        }, 2000);
      });
    });

    actions.appendChild(copyBtn);
    container.appendChild(actions);
  }

  wrapper.appendChild(container);
  chatBox.appendChild(wrapper);
  chatBox.scrollTop = chatBox.scrollHeight;

  return { bubble, wrapper };
}

// Show typing loading indicator
function showTypingIndicator() {
  const clone = typingTemplate.content.cloneNode(true);
  chatBox.appendChild(clone);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Remove typing loading indicator
function removeTypingIndicator() {
  const indicator = document.getElementById('typingIndicator');
  if (indicator) {
    indicator.remove();
  }
}

// Send Message Flow
async function sendMessage() {
  const message = inputMsg.value.trim();
  if (!message) return;

  // Clear input area
  inputMsg.value = '';
  inputMsg.style.height = 'auto';
  sendBtn.disabled = true;
  sendBtn.style.opacity = '0.5';

  // Hide welcome card if present
  if (welcomeCard) {
    welcomeCard.remove();
  }

  // Render User Bubble
  addBubble('user', message);

  // Render Typing Indicator
  showTypingIndicator();

  // Create AI Bubble container
  const { bubble: aiBubble } = addBubble('assistant', '');
  let fullResponse = '';

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history: chatHistory }),
    });

    removeTypingIndicator();

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
              
              // Handle custom error response wrapped inside [ERROR: ...]
              if (fullResponse.startsWith('[ERROR:')) {
                aiBubble.innerHTML = `<span class="text-rose-400 font-semibold flex items-center gap-1.5"><i class="bi bi-exclamation-triangle-fill"></i> ${fullResponse.slice(8, -1)}</span>`;
              } else {
                aiBubble.innerHTML = marked.parse(fullResponse);
              }
              
              chatBox.scrollTop = chatBox.scrollHeight;
            } else if (data.error) {
              aiBubble.innerHTML = `<span class="text-rose-400 font-semibold flex items-center gap-1.5"><i class="bi bi-exclamation-triangle-fill"></i> Error: ${data.error}</span>`;
            }
          } catch (e) {
            console.error('Error parsing line:', e);
          }
        }
      }
    }

    // Only add to history if it wasn't an API error
    if (!fullResponse.startsWith('[ERROR:')) {
      chatHistory.push({ role: 'user', content: message });
      chatHistory.push({ role: 'assistant', content: fullResponse });
    }
  } catch (error) {
    removeTypingIndicator();
    aiBubble.innerHTML = `<span class="text-rose-400 font-semibold flex items-center gap-1.5"><i class="bi bi-exclamation-triangle-fill"></i> Gagal terhubung ke server.</span>`;
    console.error('Chat error:', error);
  } finally {
    sendBtn.disabled = false;
    sendBtn.style.opacity = '1';
  }
}

// Event Listeners
sendBtn.addEventListener('click', sendMessage);
inputMsg.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Clear Chat Action
clearBtn.addEventListener('click', async () => {
  chatHistory = [];
  chatBox.innerHTML = '';
  
  // Restore Welcome Card
  chatBox.appendChild(welcomeCard);
  
  // Call clear history API
  try {
    await fetch('/api/clear', { method: 'POST' });
  } catch (e) {
    console.error('Clear chat error:', e);
  }
});
