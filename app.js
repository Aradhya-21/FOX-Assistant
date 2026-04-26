/* ============================================
   FOX ASSISTANT — Web Application Logic
   ============================================ */

// ── State ──
const state = {
    isListening: false,
    isSpeaking: false,
    recognition: null,
    synthesis: window.speechSynthesis,
    speechSupported: false,
};

// ── DOM Elements ──
const $ = (sel) => document.querySelector(sel);
const chatMessages = $('#chatMessages');
const textInput = $('#textInput');
const sendBtn = $('#sendBtn');
const micBtn = $('#micBtn');
const statusBadge = $('#statusBadge');
const statusText = $('#statusText');
const visualizerContainer = $('#visualizerContainer');
const vizLabel = $('#vizLabel');
const toastContainer = $('#toastContainer');
const bgParticles = $('#bgParticles');

// ── Initialisation ──
document.addEventListener('DOMContentLoaded', () => {
    createBackgroundParticles();
    initSpeechRecognition();
    bindEvents();
});

// ── Background Particles ──
function createBackgroundParticles() {
    for (let i = 0; i < 18; i++) {
        const p = document.createElement('div');
        p.classList.add('particle');
        const size = Math.random() * 200 + 60;
        p.style.width = `${size}px`;
        p.style.height = `${size}px`;
        p.style.left = `${Math.random() * 100}%`;
        p.style.top = `${Math.random() * 100}%`;
        p.style.animationDelay = `${Math.random() * 12}s`;
        p.style.animationDuration = `${10 + Math.random() * 10}s`;
        bgParticles.appendChild(p);
    }
}

// ── Speech Recognition Setup ──
function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        state.speechSupported = false;
        showToast('Voice input not supported in this browser. Use text input instead.', 'warning');
        return;
    }

    state.speechSupported = true;
    state.recognition = new SpeechRecognition();
    state.recognition.lang = 'en-IN';
    state.recognition.interimResults = false;
    state.recognition.maxAlternatives = 1;
    state.recognition.continuous = false;

    state.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        stopListening();
        handleCommand(transcript);
    };

    state.recognition.onerror = (event) => {
        if (event.error === 'no-speech') {
            showToast('No speech detected. Try again.', 'info');
        } else if (event.error === 'not-allowed') {
            showToast('Microphone access denied. Please allow microphone permissions.', 'error');
        } else {
            showToast(`Speech error: ${event.error}`, 'error');
        }
        stopListening();
    };

    state.recognition.onend = () => {
        if (state.isListening) {
            stopListening();
        }
    };
}

// ── Event Bindings ──
function bindEvents() {
    micBtn.addEventListener('click', toggleListening);

    sendBtn.addEventListener('click', () => {
        const text = textInput.value.trim();
        if (text) {
            textInput.value = '';
            handleCommand(text.toLowerCase());
        }
    });

    textInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const text = textInput.value.trim();
            if (text) {
                textInput.value = '';
                handleCommand(text.toLowerCase());
            }
        }
    });

    // Command chips
    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const cmd = chip.getAttribute('data-command');
            if (cmd) handleCommand(cmd);
        });
    });
}

// ── Listening Controls ──
function toggleListening() {
    if (state.isListening) {
        stopListening();
    } else {
        startListening();
    }
}

function startListening() {
    if (!state.speechSupported) {
        showToast('Voice not supported. Type your command instead.', 'warning');
        textInput.focus();
        return;
    }

    // Stop any ongoing speech first
    state.synthesis.cancel();
    state.isListening = true;

    micBtn.classList.add('active');
    visualizerContainer.classList.add('active');
    vizLabel.textContent = 'Listening...';
    setStatus('Listening', 'listening');

    try {
        state.recognition.start();
    } catch (e) {
        // Already started
    }
}

function stopListening() {
    state.isListening = false;
    micBtn.classList.remove('active');
    visualizerContainer.classList.remove('active');

    try {
        state.recognition.stop();
    } catch (e) {
        // Ignore
    }

    if (!state.isSpeaking) {
        setStatus('Idle', '');
    }
}

// ── Status Badge ──
function setStatus(text, className) {
    statusText.textContent = text;
    statusBadge.className = 'status-badge';
    if (className) statusBadge.classList.add(className);
}

// ── Intent Detection (mirrors core.py) ──
const INTENTS = {
    time:  ['time', 'clock', 'what time'],
    date:  ['date', 'day', 'today'],
    wiki:  ['wikipedia', 'wiki', 'tell me about'],
    open:  ['open', 'launch', 'go to'],
    map:   ['map', 'maps', 'google map', 'navigate', 'location', 'directions'],
    exit:  ['exit', 'stop', 'quit', 'goodbye', 'bye'],
};

function detectIntent(query) {
    for (const [intent, keywords] of Object.entries(INTENTS)) {
        for (const kw of keywords) {
            if (query.includes(kw)) return intent;
        }
    }
    return 'unknown';
}

// ── Command Handler ──
function handleCommand(query) {
    addMessage(query, 'user');

    const intent = detectIntent(query);

    // Show typing indicator briefly
    const typingId = showTypingIndicator();

    setTimeout(() => {
        removeTypingIndicator(typingId);

        switch (intent) {
            case 'time':
                handleTime();
                break;
            case 'date':
                handleDate();
                break;
            case 'wiki':
                handleWikipedia(query);
                break;
            case 'open':
                handleOpen(query);
                break;
            case 'map':
                handleMap(query);
                break;
            case 'exit':
                handleExit();
                break;
            default:
                handleFallback(query);
                break;
        }
    }, 600 + Math.random() * 400);
}

// ── Actions ──
function handleTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const mins = now.getMinutes().toString().padStart(2, '0');
    const secs = now.getSeconds().toString().padStart(2, '0');
    const period = now.getHours() >= 12 ? 'PM' : 'AM';
    const h12 = now.getHours() % 12 || 12;

    const text = `The current time is ${h12}:${mins}:${secs} ${period}`;
    const html = `
        <p>${text}</p>
        <div class="action-card">
            <span class="action-icon">🕐</span>
            <span class="action-text"><strong>${hours}:${mins}:${secs}</strong> (${period})</span>
        </div>
    `;
    addAssistantMessage(html, text);
}

function handleDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formatted = now.toLocaleDateString('en-IN', options);

    const text = `Today's date is ${formatted}`;
    const html = `
        <p>${text}</p>
        <div class="action-card">
            <span class="action-icon">📅</span>
            <span class="action-text"><strong>${formatted}</strong></span>
        </div>
    `;
    addAssistantMessage(html, text);
}

function handleWikipedia(query) {
    // Extract topic
    let topic = query;
    const removeWords = ['wikipedia', 'wiki', 'search', 'tell me about', 'for', 'about', 'look up', 'find'];
    removeWords.forEach(w => { topic = topic.replace(w, ''); });
    topic = topic.trim();

    if (!topic) {
        const fallbackText = "What would you like me to search on Wikipedia?";
        addAssistantMessage(`<p>${fallbackText}</p>`, fallbackText);
        return;
    }

    const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(topic.replace(/\s+/g, '_'))}`;
    const searchUrl = `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(topic)}`;

    const text = `Searching Wikipedia for "${topic}"`;
    const html = `
        <p>${text}</p>
        <div class="action-card">
            <span class="action-icon">📖</span>
            <span class="action-text">
                <a href="${searchUrl}" target="_blank" rel="noopener noreferrer">Open Wikipedia: ${topic}</a>
            </span>
        </div>
    `;
    addAssistantMessage(html, text);
    window.open(searchUrl, '_blank');
}

function handleOpen(query) {
    // Extract target
    let target = query;
    const removeWords = ['open', 'launch', 'go to', 'please', 'can you', 'the', 'website'];
    removeWords.forEach(w => { target = target.replace(w, ''); });
    target = target.trim().split(/\s+/)[0]; // Take first word as site name

    if (!target) {
        const fallbackText = "What website would you like me to open?";
        addAssistantMessage(`<p>${fallbackText}</p>`, fallbackText);
        return;
    }

    // Smart URL construction
    let url;
    if (target.includes('.')) {
        url = target.startsWith('http') ? target : `https://${target}`;
    } else {
        url = `https://www.${target}.com`;
    }

    const text = `Opening ${target}`;
    const html = `
        <p>${text}</p>
        <div class="action-card">
            <span class="action-icon">🌐</span>
            <span class="action-text">
                <a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>
            </span>
        </div>
    `;
    addAssistantMessage(html, text);
    window.open(url, '_blank');
}

function handleMap(query) {
    let location = query;
    const removeWords = ['open', 'show', 'navigate', 'to', 'map', 'maps', 'google', 'location', 'directions', 'me', 'of', 'the', 'find'];
    removeWords.forEach(w => { location = location.replace(new RegExp(`\\b${w}\\b`, 'gi'), ''); });
    location = location.trim();

    let url;
    if (location) {
        url = `https://www.google.com/maps/search/${encodeURIComponent(location)}`;
    } else {
        url = 'https://www.google.com/maps';
    }

    const displayLocation = location || 'Google Maps';
    const text = `Opening ${displayLocation} on Google Maps`;
    const html = `
        <p>${text}</p>
        <div class="action-card">
            <span class="action-icon">🗺️</span>
            <span class="action-text">
                <a href="${url}" target="_blank" rel="noopener noreferrer">View on Google Maps${location ? ': ' + location : ''}</a>
            </span>
        </div>
    `;
    addAssistantMessage(html, text);
    window.open(url, '_blank');
}

function handleExit() {
    const text = "Goodbye! Shutting down. Refresh the page to restart.";
    addAssistantMessage(`<p>${text} 👋</p>`, text);
    setStatus('Stopped', '');

    // Disable inputs
    setTimeout(() => {
        micBtn.disabled = true;
        micBtn.style.opacity = '0.3';
        micBtn.style.pointerEvents = 'none';
        textInput.disabled = true;
        sendBtn.disabled = true;
    }, 1000);
}

function handleFallback(query) {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

    const text = `I searched that on Google for you`;
    const html = `
        <p>${text}</p>
        <div class="action-card">
            <span class="action-icon">🔍</span>
            <span class="action-text">
                <a href="${searchUrl}" target="_blank" rel="noopener noreferrer">Google: "${query}"</a>
            </span>
        </div>
    `;
    addAssistantMessage(html, text);
    window.open(searchUrl, '_blank');
}

// ── Message Rendering ──
function addMessage(text, sender) {
    const msg = document.createElement('div');
    msg.classList.add('message', `${sender}-message`);

    const avatarSvg = sender === 'user'
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
        : `<svg viewBox="0 0 64 64" fill="none" width="28" height="28"><path d="M12 8L20 28L8 24Z" fill="#FF8C42"/><path d="M52 8L44 28L56 24Z" fill="#FF8C42"/><ellipse cx="32" cy="36" rx="20" ry="18" fill="#FF8C42"/><ellipse cx="24" cy="33" rx="3.5" ry="4" fill="#1a1a2e"/><ellipse cx="40" cy="33" rx="3.5" ry="4" fill="#1a1a2e"/><circle cx="25.5" cy="31.5" r="1.2" fill="white"/><circle cx="41.5" cy="31.5" r="1.2" fill="white"/><ellipse cx="32" cy="41" rx="3" ry="2" fill="#2d2d44"/></svg>`;

    msg.innerHTML = `
        <div class="message-avatar">${avatarSvg}</div>
        <div class="message-content">
            <p class="message-sender">${sender === 'user' ? 'You' : 'FOX Assistant'}</p>
            <p>${escapeHtml(text)}</p>
        </div>
    `;

    chatMessages.appendChild(msg);
    scrollToBottom();
}

function addAssistantMessage(html, speakText) {
    const msg = document.createElement('div');
    msg.classList.add('message', 'assistant-message');

    const avatarSvg = `<svg viewBox="0 0 64 64" fill="none" width="28" height="28"><path d="M12 8L20 28L8 24Z" fill="#FF8C42"/><path d="M52 8L44 28L56 24Z" fill="#FF8C42"/><ellipse cx="32" cy="36" rx="20" ry="18" fill="#FF8C42"/><ellipse cx="24" cy="33" rx="3.5" ry="4" fill="#1a1a2e"/><ellipse cx="40" cy="33" rx="3.5" ry="4" fill="#1a1a2e"/><circle cx="25.5" cy="31.5" r="1.2" fill="white"/><circle cx="41.5" cy="31.5" r="1.2" fill="white"/><ellipse cx="32" cy="41" rx="3" ry="2" fill="#2d2d44"/></svg>`;

    msg.innerHTML = `
        <div class="message-avatar">${avatarSvg}</div>
        <div class="message-content">
            <p class="message-sender">FOX Assistant</p>
            ${html}
        </div>
    `;

    chatMessages.appendChild(msg);
    scrollToBottom();

    // Speak the response
    if (speakText) {
        speakResponse(speakText);
    }
}

// ── Typing Indicator ──
let typingCounter = 0;
function showTypingIndicator() {
    const id = `typing-${++typingCounter}`;
    const msg = document.createElement('div');
    msg.classList.add('message', 'assistant-message');
    msg.id = id;

    msg.innerHTML = `
        <div class="message-avatar">
            <svg viewBox="0 0 64 64" fill="none" width="28" height="28"><path d="M12 8L20 28L8 24Z" fill="#FF8C42"/><path d="M52 8L44 28L56 24Z" fill="#FF8C42"/><ellipse cx="32" cy="36" rx="20" ry="18" fill="#FF8C42"/><ellipse cx="24" cy="33" rx="3.5" ry="4" fill="#1a1a2e"/><ellipse cx="40" cy="33" rx="3.5" ry="4" fill="#1a1a2e"/><circle cx="25.5" cy="31.5" r="1.2" fill="white"/><circle cx="41.5" cy="31.5" r="1.2" fill="white"/><ellipse cx="32" cy="41" rx="3" ry="2" fill="#2d2d44"/></svg>
        </div>
        <div class="message-content">
            <div class="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        </div>
    `;

    chatMessages.appendChild(msg);
    scrollToBottom();
    setStatus('Processing', 'processing');
    return id;
}

function removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

// ── Text-to-Speech ──
function speakResponse(text) {
    if (!state.synthesis) return;

    state.synthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN';
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    // Try to find a good voice
    const voices = state.synthesis.getVoices();
    const preferred = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google'));
    const fallback = voices.find(v => v.lang.startsWith('en'));
    if (preferred) utterance.voice = preferred;
    else if (fallback) utterance.voice = fallback;

    utterance.onstart = () => {
        state.isSpeaking = true;
        setStatus('Speaking', 'speaking');
    };

    utterance.onend = () => {
        state.isSpeaking = false;
        if (!state.isListening) setStatus('Idle', '');
    };

    utterance.onerror = () => {
        state.isSpeaking = false;
        if (!state.isListening) setStatus('Idle', '');
    };

    state.synthesis.speak(utterance);
}

// Ensure voices are loaded (Chrome fires this async)
if (state.synthesis) {
    state.synthesis.onvoiceschanged = () => { state.synthesis.getVoices(); };
}

// ── Toast Notifications ──
function showToast(message, type = 'info') {
    const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' };
    const toast = document.createElement('div');
    toast.classList.add('toast', type);
    toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('leaving');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ── Utilities ──
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function scrollToBottom() {
    const chatArea = $('#chatArea');
    requestAnimationFrame(() => {
        chatArea.scrollTop = chatArea.scrollHeight;
    });
}
