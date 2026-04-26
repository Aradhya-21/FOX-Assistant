/* ============================================
   FOX ASSISTANT — Web Application Logic
   ============================================ */

// ── State ──
const state = {
    isListening: false,
    isSpeaking: false,
    isAwake: false,
    isWakeListening: false,
    recognition: null,
    wakeRecognition: null,
    synthesis: window.speechSynthesis,
    speechSupported: false,
};

const WAKE_WORDS = ['fox', 'foks', 'box', 'fax', 'folks'];

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

// Wake overlay elements
const wakeOverlay = $('#wakeOverlay');
const wakeMicBtn = $('#wakeMicBtn');
const wakeMicLabel = $('#wakeMicLabel');
const wakeSkipBtn = $('#wakeSkipBtn');
const wakeStateEl = $('#wakeState');
const wakeSubtitle = $('#wakeSubtitle');

// ── Initialisation ──
document.addEventListener('DOMContentLoaded', () => {
    createBackgroundParticles();
    initSpeechRecognition();
    initWakeWordRecognition();
    bindEvents();
    bindWakeEvents();
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

// ── Wake Word Recognition ──
function initWakeWordRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    state.wakeRecognition = new SpeechRecognition();
    state.wakeRecognition.lang = 'en-IN';
    state.wakeRecognition.interimResults = true;
    state.wakeRecognition.maxAlternatives = 5;
    state.wakeRecognition.continuous = false;

    state.wakeRecognition.onresult = (event) => {
        for (let i = 0; i < event.results.length; i++) {
            for (let j = 0; j < event.results[i].length; j++) {
                const transcript = event.results[i][j].transcript.toLowerCase().trim();
                const words = transcript.split(/\s+/);
                const detected = words.some(w => WAKE_WORDS.some(wk => w.includes(wk)));
                if (detected) {
                    stopWakeListening();
                    activateAssistant();
                    return;
                }
            }
        }
    };

    state.wakeRecognition.onerror = (event) => {
        if (event.error === 'no-speech' || event.error === 'aborted') {
            // Silently restart
            if (state.isWakeListening && !state.isAwake) {
                setTimeout(() => startWakeListening(), 300);
            }
        } else if (event.error === 'not-allowed') {
            wakeMicLabel.textContent = 'Mic access denied';
            wakeMicBtn.classList.remove('listening');
            state.isWakeListening = false;
        }
    };

    state.wakeRecognition.onend = () => {
        // Auto-restart if still in wake listening mode
        if (state.isWakeListening && !state.isAwake) {
            setTimeout(() => {
                try {
                    state.wakeRecognition.start();
                } catch (e) { /* ignore */ }
            }, 200);
        }
    };
}

function startWakeListening() {
    if (!state.speechSupported || state.isAwake) return;

    state.isWakeListening = true;
    wakeMicBtn.classList.add('listening');
    wakeMicLabel.textContent = 'Listening for "FOX"...';
    wakeSubtitle.innerHTML = 'Say <strong>"FOX"</strong> now...';
    setStatus('Waiting for wake word', '');

    try {
        state.wakeRecognition.start();
    } catch (e) { /* already running */ }
}

function stopWakeListening() {
    state.isWakeListening = false;
    wakeMicBtn.classList.remove('listening');
    wakeMicLabel.textContent = 'Click to listen';

    try {
        state.wakeRecognition.stop();
    } catch (e) { /* ignore */ }
}

function activateAssistant() {
    state.isAwake = true;
    wakeStateEl.textContent = 'waking up!';
    wakeSubtitle.innerHTML = '✅ Wake word detected!';

    // Animate the wake-up
    setTimeout(() => {
        wakeOverlay.classList.add('hidden');
        setStatus('Idle', '');
        speakResponse('FOX activated. I am listening.');

        // Add wake-up message to chat
        const html = `
            <p>⚡ <strong>SYSTEM ONLINE.</strong> FOX is awake and ready.</p>
            <div class="info-snippet">
                <p class="info-body">I'm listening for your commands now. You can use voice (click the mic) or type in the input box. Say <strong>"sleep"</strong> to put me back to sleep mode.</p>
            </div>
        `;
        addAssistantMessage(html, null);
    }, 600);
}

function sleepAssistant() {
    state.isAwake = false;
    stopListening();
    state.synthesis.cancel();

    wakeOverlay.classList.remove('hidden');
    wakeStateEl.textContent = 'sleeping';
    wakeSubtitle.innerHTML = 'Say <strong>"FOX"</strong> to wake me up';
    wakeMicLabel.textContent = 'Click to listen';
    setStatus('Sleeping', '');
}

// ── Wake Event Bindings ──
function bindWakeEvents() {
    wakeMicBtn.addEventListener('click', () => {
        if (state.isWakeListening) {
            stopWakeListening();
        } else {
            startWakeListening();
        }
    });

    wakeSkipBtn.addEventListener('click', () => {
        stopWakeListening();
        activateAssistant();
    });
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
    sleep: ['sleep', 'go to sleep', 'nap', 'hibernate'],
    exit:  ['exit', 'stop', 'quit', 'goodbye', 'bye'],
    open:  ['open', 'launch', 'go to'],
    map:   ['map', 'maps', 'google map', 'navigate', 'location', 'directions'],
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
            case 'sleep':
                handleSleep();
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

// ── Known Sites Database ──
const KNOWN_SITES = {
    youtube:    { icon: '▶️',  desc: 'YouTube is the world\'s largest video-sharing platform where you can watch, upload, and share videos on virtually any topic — from music and tutorials to live streams and documentaries.' },
    google:     { icon: '🔍', desc: 'Google is the world\'s most popular search engine, handling over 8.5 billion searches daily. It also offers Gmail, Google Drive, Maps, and many other services.' },
    github:     { icon: '🐙', desc: 'GitHub is the leading platform for software development and version control using Git. Over 100 million developers use it to collaborate on open-source and private projects.' },
    facebook:   { icon: '👥', desc: 'Facebook (Meta) is the world\'s largest social networking platform, connecting over 3 billion people. Share updates, photos, join groups, and stay in touch with friends and family.' },
    instagram:  { icon: '📸', desc: 'Instagram is a photo and video sharing social media platform owned by Meta. Discover stories, reels, and content from creators, brands, and friends worldwide.' },
    twitter:    { icon: '🐦', desc: 'X (formerly Twitter) is a social media platform for real-time public conversation. Follow news, trends, and engage with people around the world in short-form posts.' },
    x:          { icon: '🐦', desc: 'X (formerly Twitter) is a social media platform for real-time public conversation. Follow news, trends, and engage with people around the world in short-form posts.' },
    linkedin:   { icon: '💼', desc: 'LinkedIn is the world\'s largest professional networking platform with over 900 million members. Build your career, find jobs, connect with professionals, and grow your business.' },
    reddit:     { icon: '🤖', desc: 'Reddit is a vast network of communities (subreddits) organized around topics and interests. Dive into discussions, share content, and discover niche communities on any subject.' },
    netflix:    { icon: '🎬', desc: 'Netflix is a leading streaming entertainment service offering a vast library of movies, TV series, documentaries, and original content across multiple genres and languages.' },
    spotify:    { icon: '🎵', desc: 'Spotify is the world\'s most popular audio streaming platform with over 600 million users. Discover music, podcasts, and audiobooks from artists and creators worldwide.' },
    amazon:     { icon: '🛒', desc: 'Amazon is the world\'s largest online marketplace. Shop millions of products, from electronics and books to groceries, with fast delivery and competitive pricing.' },
    wikipedia:  { icon: '📚', desc: 'Wikipedia is a free, multilingual online encyclopedia maintained by volunteer editors. It has over 60 million articles across 300+ languages on virtually every topic.' },
    stackoverflow: { icon: '💻', desc: 'Stack Overflow is the largest Q&A community for programmers. Find answers to coding questions, share knowledge, and learn from millions of developer discussions.' },
    whatsapp:   { icon: '💬', desc: 'WhatsApp is a popular messaging app owned by Meta, used by over 2 billion people worldwide for text messaging, voice calls, video calls, and sharing media.' },
    discord:    { icon: '🎮', desc: 'Discord is a communication platform for communities, gamers, and teams. Create servers, join voice channels, chat in real-time, and build communities around shared interests.' },
    twitch:     { icon: '🎮', desc: 'Twitch is the world\'s leading live-streaming platform, primarily for gaming but also for music, art, talk shows, and creative content. Watch live or interact with streamers.' },
    pinterest:  { icon: '📌', desc: 'Pinterest is a visual discovery engine for finding ideas like recipes, home decor, fashion, and DIY projects. Save and organize ideas through image "pins" on virtual boards.' },
    medium:     { icon: '✍️', desc: 'Medium is an open publishing platform where writers and thinkers share ideas, stories, and perspectives on a wide range of topics — from technology and science to culture and self-improvement.' },
    notion:     { icon: '📝', desc: 'Notion is an all-in-one workspace for notes, documents, project management, and collaboration. Used by teams and individuals to organize work and life in one place.' },
    figma:      { icon: '🎨', desc: 'Figma is a collaborative design tool used by teams to create, prototype, and iterate on user interfaces and digital products in real time.' },
    chatgpt:    { icon: '🤖', desc: 'ChatGPT by OpenAI is an AI chatbot powered by large language models. It can answer questions, write code, draft content, brainstorm ideas, and assist with many tasks.' },
    canva:      { icon: '🖼️', desc: 'Canva is an online graphic design platform that makes it easy to create social media posts, presentations, posters, and other visual content with drag-and-drop tools.' },
    zoom:       { icon: '📹', desc: 'Zoom is a leading video conferencing platform used for virtual meetings, webinars, and online collaboration. Trusted by businesses, schools, and individuals worldwide.' },
    flipkart:   { icon: '🛍️', desc: 'Flipkart is one of India\'s largest e-commerce platforms, offering a wide range of products from electronics and fashion to home essentials with quick delivery across India.' },
};

// ── Actions ──
function handleTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const mins = now.getMinutes().toString().padStart(2, '0');
    const secs = now.getSeconds().toString().padStart(2, '0');
    const period = now.getHours() >= 12 ? 'PM' : 'AM';
    const h12 = now.getHours() % 12 || 12;

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'your local timezone';
    const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

    const text = `The current time is ${h12}:${mins}:${secs} ${period}`;
    const html = `
        <p>${greeting}! ${text}.</p>
        <div class="info-snippet">
            <p>🕐 <strong>${hours}:${mins}:${secs}</strong> (${period})</p>
            <p class="info-detail">Timezone: ${tz}</p>
        </div>
    `;
    addAssistantMessage(html, text);
}

function handleDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formatted = now.toLocaleDateString('en-IN', options);

    // Calculate day of year and days remaining
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const dayOfYear = Math.ceil((now - startOfYear) / 86400000);
    const isLeap = (now.getFullYear() % 4 === 0 && now.getFullYear() % 100 !== 0) || now.getFullYear() % 400 === 0;
    const totalDays = isLeap ? 366 : 365;
    const daysLeft = totalDays - dayOfYear;

    const text = `Today's date is ${formatted}`;
    const html = `
        <p>${text}</p>
        <div class="info-snippet">
            <p>📅 <strong>${formatted}</strong></p>
            <p class="info-detail">Day ${dayOfYear} of ${totalDays} — ${daysLeft} days remaining in ${now.getFullYear()}.</p>
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

    const searchUrl = `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(topic)}`;

    // Show initial message with loading state
    const text = `Searching Wikipedia for "${topic}"`;
    const msgId = `wiki-${Date.now()}`;
    const loadingHtml = `
        <p>${text}</p>
        <div class="info-snippet loading" id="${msgId}-info">
            <div class="typing-indicator"><span></span><span></span><span></span></div>
            <p class="info-detail">Fetching summary from Wikipedia...</p>
        </div>
        <div class="action-card">
            <span class="action-icon">📖</span>
            <span class="action-text">
                <a href="${searchUrl}" target="_blank" rel="noopener noreferrer">Open Wikipedia: ${escapeHtml(topic)}</a>
            </span>
        </div>
    `;
    addAssistantMessage(loadingHtml, text);

    // Fetch real summary from Wikipedia REST API
    const apiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic.replace(/\s+/g, '_'))}`;
    fetch(apiUrl)
        .then(res => {
            if (!res.ok) throw new Error('Not found');
            return res.json();
        })
        .then(data => {
            const infoEl = document.getElementById(`${msgId}-info`);
            if (infoEl && data.extract) {
                const summary = data.extract.length > 300
                    ? data.extract.substring(0, 300) + '...'
                    : data.extract;
                const thumbnail = data.thumbnail ? `<img src="${data.thumbnail.source}" alt="${escapeHtml(data.title)}" class="info-thumbnail">` : '';
                infoEl.classList.remove('loading');
                infoEl.innerHTML = `
                    <div class="info-header">
                        ${thumbnail}
                        <div>
                            <p class="info-title">📚 ${escapeHtml(data.title)}</p>
                            <p class="info-detail">${data.description ? escapeHtml(data.description) : ''}</p>
                        </div>
                    </div>
                    <p class="info-body">${escapeHtml(summary)}</p>
                `;
                scrollToBottom();
            }
        })
        .catch(() => {
            const infoEl = document.getElementById(`${msgId}-info`);
            if (infoEl) {
                infoEl.classList.remove('loading');
                infoEl.innerHTML = `<p class="info-body">📖 Couldn't fetch a summary, but you can read more on the Wikipedia page linked below.</p>`;
            }
        });
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

    const siteKey = target.toLowerCase().replace(/\.com$/, '');
    const siteInfo = KNOWN_SITES[siteKey];

    const text = `Opening ${target}`;
    let infoBlock = '';
    if (siteInfo) {
        infoBlock = `
            <div class="info-snippet">
                <p class="info-title">${siteInfo.icon} ${capitalize(siteKey)}</p>
                <p class="info-body">${siteInfo.desc}</p>
            </div>
        `;
    } else {
        infoBlock = `
            <div class="info-snippet">
                <p class="info-body">🌐 Opening <strong>${escapeHtml(target)}</strong> in a new tab. If the site doesn't load, the URL may need to be adjusted.</p>
            </div>
        `;
    }

    const html = `
        <p>${text}</p>
        ${infoBlock}
        <div class="action-card">
            <span class="action-icon">🔗</span>
            <span class="action-text">
                <a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>
            </span>
        </div>
    `;
    addAssistantMessage(html, siteInfo ? `${text}. ${siteInfo.desc.split('.')[0]}.` : text);
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

    const displayLocation = location || 'your current area';
    const text = `Opening ${displayLocation} on Google Maps`;

    let infoBlock;
    if (location) {
        infoBlock = `
            <div class="info-snippet">
                <p class="info-title">📍 ${escapeHtml(capitalize(location))}</p>
                <p class="info-body">Showing "${escapeHtml(location)}" on Google Maps. You can view the location, get directions, explore nearby places, check traffic conditions, and see street views.</p>
            </div>
        `;
    } else {
        infoBlock = `
            <div class="info-snippet">
                <p class="info-body">🗺️ Opening Google Maps. You can explore locations, get driving/walking directions, check live traffic, and view satellite imagery.</p>
            </div>
        `;
    }

    const html = `
        <p>${text}</p>
        ${infoBlock}
        <div class="action-card">
            <span class="action-icon">🗺️</span>
            <span class="action-text">
                <a href="${url}" target="_blank" rel="noopener noreferrer">View on Google Maps${location ? ': ' + escapeHtml(location) : ''}</a>
            </span>
        </div>
    `;
    addAssistantMessage(html, text);
    window.open(url, '_blank');
}

function handleSleep() {
    const text = "Entering sleep mode. Say 'FOX' to wake me up.";
    const html = `
        <p>💤 <strong>ENTERING SLEEP MODE.</strong></p>
        <div class="info-snippet">
            <p class="info-body">System is going offline. Say <strong>"FOX"</strong> when you need me again.</p>
        </div>
    `;
    addAssistantMessage(html, text);
    
    // Transition back to sleep overlay
    setTimeout(() => {
        sleepAssistant();
    }, 2000);
}

function handleExit() {
    const text = "Goodbye! Shutting down. Refresh the page to restart.";
    const html = `
        <p>${text} 👋</p>
        <div class="info-snippet">
            <p class="info-body">Thanks for using FOX Assistant! Press <strong>F5</strong> or click the browser refresh button to start a new session.</p>
        </div>
    `;
    addAssistantMessage(html, text);
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
        <div class="info-snippet">
            <p class="info-body">🔎 I didn't recognize a specific command, so I searched Google for <strong>"${escapeHtml(query)}"</strong>. The results page should open in a new tab with relevant answers, articles, and resources.</p>
        </div>
        <div class="action-card">
            <span class="action-icon">🔍</span>
            <span class="action-text">
                <a href="${searchUrl}" target="_blank" rel="noopener noreferrer">Google: "${escapeHtml(query)}"</a>
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
        : `<svg viewBox="0 0 64 64" fill="none" width="28" height="28"><path d="M32 0v64M0 32h64" stroke="#00f3ff" stroke-width="0.5" opacity="0.15" stroke-dasharray="2 2" /><polygon points="12,8 24,24 16,30" fill="none" stroke="#ff00ea" stroke-width="1.5" /><polygon points="12,8 18,18 16,24" fill="#ff00ea" opacity="0.15" /><polygon points="52,8 40,24 48,30" fill="none" stroke="#ff00ea" stroke-width="1.5" /><polygon points="52,8 46,18 48,24" fill="#ff00ea" opacity="0.15" /><polygon points="24,24 40,24 52,36 32,54 12,36" fill="none" stroke="#00f3ff" stroke-width="1.5" /><polygon points="30,48 34,48 32,52" fill="#ff00ea" /><line x1="18" y1="34" x2="28" y2="36" stroke="#00f3ff" stroke-width="2.5" stroke-linecap="round" /><line x1="46" y1="34" x2="36" y2="36" stroke="#00f3ff" stroke-width="2.5" stroke-linecap="round" /></svg>`;

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

    const avatarSvg = `<svg viewBox="0 0 64 64" fill="none" width="28" height="28"><path d="M32 0v64M0 32h64" stroke="#00f3ff" stroke-width="0.5" opacity="0.15" stroke-dasharray="2 2" /><polygon points="12,8 24,24 16,30" fill="none" stroke="#ff00ea" stroke-width="1.5" /><polygon points="12,8 18,18 16,24" fill="#ff00ea" opacity="0.15" /><polygon points="52,8 40,24 48,30" fill="none" stroke="#ff00ea" stroke-width="1.5" /><polygon points="52,8 46,18 48,24" fill="#ff00ea" opacity="0.15" /><polygon points="24,24 40,24 52,36 32,54 12,36" fill="none" stroke="#00f3ff" stroke-width="1.5" /><polygon points="30,48 34,48 32,52" fill="#ff00ea" /><line x1="18" y1="34" x2="28" y2="36" stroke="#00f3ff" stroke-width="2.5" stroke-linecap="round" /><line x1="46" y1="34" x2="36" y2="36" stroke="#00f3ff" stroke-width="2.5" stroke-linecap="round" /></svg>`;

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
            <svg viewBox="0 0 64 64" fill="none" width="28" height="28"><path d="M32 0v64M0 32h64" stroke="#00f3ff" stroke-width="0.5" opacity="0.15" stroke-dasharray="2 2" /><polygon points="12,8 24,24 16,30" fill="none" stroke="#ff00ea" stroke-width="1.5" /><polygon points="12,8 18,18 16,24" fill="#ff00ea" opacity="0.15" /><polygon points="52,8 40,24 48,30" fill="none" stroke="#ff00ea" stroke-width="1.5" /><polygon points="52,8 46,18 48,24" fill="#ff00ea" opacity="0.15" /><polygon points="24,24 40,24 52,36 32,54 12,36" fill="none" stroke="#00f3ff" stroke-width="1.5" /><polygon points="30,48 34,48 32,52" fill="#ff00ea" /><line x1="18" y1="34" x2="28" y2="36" stroke="#00f3ff" stroke-width="2.5" stroke-linecap="round" /><line x1="46" y1="34" x2="36" y2="36" stroke="#00f3ff" stroke-width="2.5" stroke-linecap="round" /></svg>
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

function capitalize(str) {
    return str.replace(/\b\w/g, c => c.toUpperCase());
}

function scrollToBottom() {
    const chatArea = $('#chatArea');
    requestAnimationFrame(() => {
        chatArea.scrollTop = chatArea.scrollHeight;
    });
}
