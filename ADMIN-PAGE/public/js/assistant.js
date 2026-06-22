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
  this.style.height = (this.scrollHeight - 8) + 'px';
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
  wrapper.className = `d-flex gap-2.5 bubble-anim ${isUser ? 'justify-end' : 'justify-start items-start'}`;

  // Avatar for AI
  if (!isUser) {
    const avatar = document.createElement('div');
    avatar.className = 'avatar shrink-0';
    avatar.style.cssText = 'width: 28px; height: 28px; font-size: 12px; background-color: var(--accent-black); color: white; margin-top: 4px;';
    avatar.innerHTML = '<i class="bi bi-robot"></i>';
    wrapper.appendChild(avatar);
  }

  // Bubble container
  const container = document.createElement('div');
  container.className = 'relative group';
  container.style.maxWidth = '80%';

  const bubble = document.createElement('div');
  bubble.className = `card card-light`;
  bubble.style.cssText = `
    padding: 10px 14px; 
    font-size: 13px; 
    line-height: 1.5; 
    border-radius: var(--radius-md); 
    box-shadow: var(--shadow-sm);
    ${
      isUser 
        ? 'background-color: var(--accent-black); color: #FFFFFF; border-top-right-radius: 0; border: none;' 
        : 'background-color: #FFFFFF; border-top-left-radius: 0; color: var(--text-primary);'
    }
  `;

  if (isUser) {
    bubble.textContent = text;
  } else {
    bubble.className += ' prose-ai';
    bubble.innerHTML = text ? marked.parse(text) : '<span class="text-muted italic">Berpikir...</span>';
  }

  container.appendChild(bubble);

  // Copy button for AI bubble
  if (!isUser) {
    const actions = document.createElement('div');
    actions.style.cssText = 'position: absolute; bottom: -20px; left: 4px; opacity: 0; transition: opacity 0.2s; display: flex; gap: 6px; z-index: 10;';
    actions.className = 'group-hover-visible'; // handled dynamically below

    const copyBtn = document.createElement('button');
    copyBtn.style.cssText = 'background: #FFFFFF; border: 1px solid var(--accent-border); border-radius: 4px; font-size: 10px; font-weight: 600; color: var(--text-muted); cursor: pointer; padding: 2px 6px; display: flex; align-items: center; gap: 4px;';
    copyBtn.innerHTML = '<i class="bi bi-clipboard"></i> Salin';
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.innerHTML = '<i class="bi bi-check-lg text-success" style="color: #10B981 !important;"></i> Tersalin!';
        setTimeout(() => {
          copyBtn.innerHTML = '<i class="bi bi-clipboard"></i> Salin';
        }, 2000);
      });
    });

    actions.appendChild(copyBtn);
    container.appendChild(actions);

    // CSS class simulation for hover
    container.addEventListener('mouseenter', () => { actions.style.opacity = '1'; });
    container.addEventListener('mouseleave', () => { actions.style.opacity = '0'; });
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
    welcomeCard.style.display = 'none';
  }

  // Render User Bubble
  addBubble('user', message);

  // Render Typing Indicator
  showTypingIndicator();

  // Create AI Bubble container
  const { bubble: aiBubble } = addBubble('assistant', '');
  let fullResponse = '';

  try {
    const res = await fetch('/assistant/chat', {
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
                aiBubble.innerHTML = `<span class="font-semibold" style="color: var(--status-cancel); display: flex; align-items: center; gap: 6px;"><i class="bi bi-exclamation-triangle-fill"></i> ${fullResponse.slice(8, -1)}</span>`;
              } else {
                aiBubble.innerHTML = marked.parse(fullResponse);
              }
              
              chatBox.scrollTop = chatBox.scrollHeight;
            } else if (data.error) {
              aiBubble.innerHTML = `<span class="font-semibold" style="color: var(--status-cancel); display: flex; align-items: center; gap: 6px;"><i class="bi bi-exclamation-triangle-fill"></i> Error: ${data.error}</span>`;
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
    aiBubble.innerHTML = `<span class="font-semibold" style="color: var(--status-cancel); display: flex; align-items: center; gap: 6px;"><i class="bi bi-exclamation-triangle-fill"></i> Gagal terhubung ke server.</span>`;
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
  if (welcomeCard) {
    chatBox.appendChild(welcomeCard);
    welcomeCard.style.display = 'block';
  }
  
  // Call clear history API
  try {
    await fetch('/assistant/clear', { method: 'POST' });
  } catch (e) {
    console.error('Clear chat error:', e);
  }
});
