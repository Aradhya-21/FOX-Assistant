# 🦊 FOX-Assistant

FOX-Assistant is a voice-powered, web-based artificial intelligence assistant. Originally built as a Python desktop application, it has been completely reimagined and rebuilt into a modern, highly responsive, and zero-dependency web application deployed on Vercel.

---

## 🚀 Live Demo

[**Try FOX Assistant Live**](https://fox-assistant.vercel.app/) *(Note: If your Vercel URL is different, update this link!)*

---

## ✨ Features

- **Wake Word System**: Starts in "Sleep Mode." Simply say **"FOX"** to wake the assistant up.
- **Voice & Text Input**: Native browser integration using the Web Speech API for seamless speech-to-text recognition and text-to-speech synthesis.
- **Contextual Responses**: Doesn't just give you links. It fetches live data (e.g., Wikipedia summaries via REST API) and provides brief informational snippets with images.
- **Rich User Interface**: Features a premium dark mode, glassmorphism UI, particle animations, and a chat-like interaction design.
- **Fully Responsive**: Optimized across 8 different breakpoints to look perfect on 4K monitors, laptops, tablets, and smartphones. Mobile-friendly touch states included.
- **Zero Dependencies**: Built entirely with Vanilla HTML, CSS, and JavaScript. No npm packages, external libraries, or complicated build steps required.

---

## 🛠️ Capabilities

Currently, FOX can understand and respond to the following intents:
- **"What time is it?"** - Returns local time and timezone.
- **"What is today's date?"** - Returns date and day of the year.
- **"Search Wikipedia for [topic]"** - Fetches real-time summaries and thumbnails from Wikipedia.
- **"Open [website]"** - Opens popular websites (YouTube, GitHub, etc.) with helpful descriptions.
- **"Show map of [location]"** - Opens Google Maps for the specified location with context.
- **"Go to sleep" / "Sleep"** - Puts the assistant back into sleep mode to wait for the wake word.
- **"Goodbye" / "Exit"** - Closes the session.

---

## 💻 Tech Stack

- **Frontend**: Vanilla HTML5, CSS3 (Custom Properties, Flexbox/Grid, Animations), JavaScript (ES6+).
- **APIs**: Web Speech API (Recognition & Synthesis), Wikipedia REST API.
- **Hosting**: Vercel (Edge Network).

---

## 📥 Local Development

Since FOX-Assistant has no build step, running it locally is incredibly easy.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Aradhya-21/FOX-Assistant.git
   cd FOX-Assistant
   ```

2. **Serve the files:**
   You can use any local web server. For example, with `npx`:
   ```bash
   npx serve .
   ```
   *Alternatively, you can use Python's built-in server:*
   ```bash
   python -m http.server 3000
   ```

3. **Open in Browser:**
   Navigate to `http://localhost:3000` (or the port provided by your server). 
   *Note: Browsers require pages to be served over `localhost` or `https` for microphone permissions to work.*

---

## 🤝 Contributing

Contributions are welcome and encouraged! Here's how you can help:

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature-name`)
3. Commit your changes (`git commit -m 'Add some feature'`)
4. Push to your fork (`git push origin feature/your-feature-name`)
5. Submit a Pull Request

---

## 📝 Author

- **Aradhya Srivastava**
- GitHub: [Aradhya-21](https://github.com/Aradhya-21)
- Email: asktoaradhya@gmail.com

---

## 📄 License

This project is intended for educational and learning purposes. You are free to use, modify, and extend the code.
