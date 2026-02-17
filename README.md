# � Jarvis Voice Weather AI

AI-powered voice-first weather assistant with animated orb interface, speech recognition, and intelligent comfort insights.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## ✨ Features

- � **Voice-First Interface** - Ask questions using speech-to-text
- 🔊 **Text-to-Speech** - Jarvis speaks all responses
- ⭕ **Animated Orb** - Visual feedback (blue → orange when listening)
- 📊 **Weather Navbar** - Real-time weather info display
- 💬 **Chat Panel** - Conversation history with text input
- 📍 **Auto Location** - GPS detection or manual city entry
- 🌡️ **Weather Comfort Index (WCI)** - Smart comfort scoring
- 🧠 **Intelligent Responses** - Rule-based natural language processing

---

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Chrome browser (for speech recognition)
- OpenWeather API key

### Installation

1. **Clone or navigate to the project**
   ```bash
   cd d:\mini\weather
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure API Key**
   
   Open `.env` file and add your OpenWeather API key:
   ```env
   OPENWEATHER_API_KEY=your_api_key_here
   PORT=3000
   ```

   Get free API key: https://openweathermap.org/api

4. **Start the server**
   ```bash
   npm start
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

---

## 🎮 How to Use

### First Time Setup

1. **Page loads** → Location permission modal appears
2. **Choose one:**
   - Click **"Allow GPS"** → Auto-detect your location
   - Click **"Enter City"** → Type your city name

### Voice Interaction

1. **Click the 🎤 mic button** at the bottom center
2. **Speak your question** (orb turns orange)
3. **Jarvis responds** with voice + text in bubble

### Text Chat

1. **Click 💬 button** (bottom-right corner)
2. **Chat panel opens** with conversation history
3. **Type your question** and press Enter or Send
4. **Click ✕ to close** the panel

### Questions to Ask

**Weather Queries:**
- "What's the weather?"
- "What's the temperature?"
- "How's the humidity?"
- "What's the wind speed?"

**Comfort & Activities:**
- "What's the comfort level?"
- "Should I go outside?"
- "Can I go for a walk?"
- "Why is it uncomfortable?"

**Suggestions:**
- "What should I wear?"
- "Give me some advice"
- "Any recommendations?"

**Greetings:**
- "Hello Jarvis"
- "Hi"
- "Thank you"

---

## 📊 Interface Overview

### Navbar (Top)
Displays real-time weather information:
- 📍 Location
- 🌡️ Temperature
- 💧 Humidity
- 💨 Wind Speed
- 😊 Comfort Index

### Center Stage
- **Animated Orb** - Visual AI indicator
  - Blue: Idle/Ready
  - Orange: Listening
  - Purple: Thinking
- **Speech Bubble** - Shows responses

### Bottom Controls
- **🎤 Mic Button** (center) - Voice input
- **💬 Chat Button** (right) - Opens conversation panel

---

## 🏗️ Project Structure

```
d:\mini\weather\
├── services/
│   ├── weatherService.js    # OpenWeather API integration
│   ├── wciEngine.js         # Weather Comfort Index calculator
│   └── openaiService.js     # (Unused, can be removed)
├── public/
│   ├── index.html           # Voice-first orb interface
│   ├── css/style.css        # Minimal black background design
│   └── js/app.js            # Speech recognition & responses
├── server.js                # Express backend
├── .env                     # API keys (create this!)
├── package.json             # Dependencies
└── README.md               # This file
```

---

## 🛠️ Technology Stack

**Backend:**
- Express.js
- Axios
- Node-cache
- Dotenv

**Frontend:**
- Vanilla JavaScript
- Web Speech API (Speech Recognition)
- Speech Synthesis API
- Fetch API

**APIs:**
- OpenWeather API (weather data)

---

## ⚙️ Configuration

### Environment Variables

Create `.env` file in root directory:

```env
OPENWEATHER_API_KEY=your_openweather_api_key
PORT=3000
CACHE_TTL=600
```

### Customization

**Change Voice Speed:**
Edit `app.js`:
```javascript
utterance.rate = 1.0;  // 0.5 to 2.0
utterance.pitch = 1.0; // 0 to 2
```

**Change Orb Colors:**
Edit `style.css`:
```css
.orb {
    background: radial-gradient(circle, #00f0ff, #0066ff);
}
.orb.listening {
    background: radial-gradient(circle, #ffcc00, #ff6600);
}
```

---

## 📝 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Main interface |
| `/api/weather/:location` | GET | Current weather |
| `/api/weather/coords` | POST | Weather by coordinates |
| `/api/wci/:location` | GET | Weather + Comfort Index |
| `/api/wci/coords` | POST | WCI by coordinates |
| `/api/forecast/:location` | GET | 5-day forecast |
| `/api/health` | GET | Server health check |

---

## � Weather Comfort Index (WCI)

The WCI algorithm calculates comfort based on:
- 🌡️ **Temperature** (ideal: 20-26°C)
- 💧 **Humidity** (ideal: 30-60%)
- 💨 **Wind Speed** (ideal: < 5 m/s)
- 🔥 **Feels Like** temperature

**Score Range:**
- 75-100: Excellent comfort
- 50-74: Moderate comfort
- 0-49: Uncomfortable conditions

---

## 🐛 Troubleshooting

**Speech recognition not working:**
- Use Chrome browser
- Allow microphone permissions
- Check browser console for errors

**Weather not loading:**
- Verify API key in `.env` file
- Check internet connection
- Ensure API key is valid (test at openweathermap.org)

**Location detection failing:**
- Allow location permissions in browser
- Use manual city entry as fallback

**Server won't start:**
- Check if port 3000 is available
- Run `npm install` to ensure dependencies
- Check for syntax errors in modified files

---

## 📱 Browser Support

- ✅ Chrome/Edge (Recommended for speech features)
- ✅ Firefox (Limited speech support)
- ❌ Safari (Speech API limited)
- ❌ IE (Not supported)

---

## 🔒 Privacy

- Location data is only used for weather API calls
- No data is stored or transmitted to third parties
- Speech recognition is processed locally by browser
- No conversation history is saved to disk

---

## � License

MIT License - Feel free to use and modify!

---

## 🙏 Credits

- Weather data: [OpenWeather API](https://openweathermap.org)
- Speech technology: Web Speech API
- Icons: Unicode Emoji

---

## 💡 Tips

- **Speak clearly** near the microphone
- **Use Chrome** for best speech recognition
- **Check navbar** for quick weather overview
- **Open chat panel** to review conversation history
- **Ask follow-up questions** - Jarvis understands context

---

## 🚀 Future Enhancements

- [ ] Multi-language support
- [ ] Weather alerts and notifications
- [ ] Air Quality Index (AQI)
- [ ] Historical weather trends
- [ ] Custom voice selection
- [ ] Dark/Light theme toggle

---

**Enjoy your intelligent weather companion!** �️🤖
