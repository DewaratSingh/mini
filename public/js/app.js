let currentLocation = null;
let weatherData = {};
let conversationHistory = [];
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const orb = document.getElementById('orb');
const bubble = document.getElementById('bubble');
const micBtn = document.getElementById('micBtn');
const chatToggle = document.getElementById('chatToggle');
const chatPanel = document.getElementById('chatPanel');
const closeChat = document.getElementById('closeChat');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const chatSend = document.getElementById('chatSend');

document.addEventListener('DOMContentLoaded', function () {
    setTimeout(() => {
        document.getElementById('locationModal').style.display = 'flex';
    }, 500);

    document.getElementById('allowLocationBtn').addEventListener('click', detectLocation);
    document.getElementById('manualLocationBtn').addEventListener('click', showManualInput);
    document.getElementById('submitCityBtn').addEventListener('click', submitCity);
    micBtn.addEventListener('click', startListening);
    chatToggle.addEventListener('click', toggleChat);
    closeChat.addEventListener('click', toggleChat);
    chatSend.addEventListener('click', sendTextMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendTextMessage();
    });
});

function toggleChat() {
    chatPanel.classList.toggle('hidden');
}

async function detectLocation() {
    if (!navigator.geolocation) {
        speak("Your browser doesn't support geolocation");
        showManualInput();
        return;
    }

    document.getElementById('locationModal').style.display = 'none';
    bubble.textContent = 'Detecting your location...';

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            try {
                const { latitude, longitude } = position.coords;

                const response = await fetch('/api/wci/coords', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lat: latitude, lon: longitude })
                });

                const data = await response.json();

                if (data.success) {
                    currentLocation = data.data.weather.location;
                    weatherData = data.data;
                    updateDisplay();

                    const greeting = `Hello! Weather loaded for ${currentLocation}. Temperature is ${Math.round(data.data.weather.temperature)} degrees with ${data.data.weather.description}. Comfort level is ${data.data.wci.level}. Ask me anything!`;
                    bubble.textContent = greeting;
                    speak(greeting);
                    addChatMessage(greeting, 'assistant');
                }
            } catch (error) {
                bubble.textContent = 'Failed to get weather. Try manual entry.';
                showManualInput();
            }
        },
        () => {
            bubble.textContent = 'Location denied. Please enter city manually.';
            showManualInput();
        }
    );
}

function showManualInput() {
    document.getElementById('locationModal').style.display = 'none';
    document.getElementById('locationInputModal').classList.remove('hidden');
}

async function submitCity() {
    const city = document.getElementById('cityInput').value.trim();

    if (!city) {
        alert('Please enter a city name');
        return;
    }

    document.getElementById('locationInputModal').classList.add('hidden');
    bubble.textContent = 'Loading weather data...';

    try {
        const response = await fetch(`/api/wci/${encodeURIComponent(city)}`);
        const data = await response.json();

        if (data.success) {
            currentLocation = data.data.weather.location;
            weatherData = data.data;
            updateDisplay();

            const greeting = `Weather loaded for ${currentLocation}. Temperature is ${Math.round(data.data.weather.temperature)} degrees. Comfort level is ${data.data.wci.level}. What would you like to know?`;
            bubble.textContent = greeting;
            speak(greeting);
            addChatMessage(greeting, 'assistant');
        }
    } catch (error) {
        bubble.textContent = 'Could not find that city. Try again.';
        setTimeout(showManualInput, 2000);
    }
}

function updateDisplay() {
    const { weather, wci } = weatherData;

    document.getElementById('navLocation').textContent = weather.location;
    document.getElementById('navTemp').textContent = `${Math.round(weather.temperature)}°C`;
    document.getElementById('navHumidity').textContent = `${weather.humidity}%`;
    document.getElementById('navWind').textContent = `${(weather.windSpeed * 3.6).toFixed(1)} km/h`;
    document.getElementById('navComfort').textContent = `${wci.score}/100`;
}

function startListening() {
    if (!SpeechRecognition) {
        bubble.textContent = 'Speech recognition not supported. Use Chrome browser.';
        speak('Please use Chrome browser for voice features');
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';

    orb.classList.add('listening');
    bubble.textContent = 'Listening...';

    recognition.start();

    recognition.onresult = function (event) {
        const query = event.results[0][0].transcript;
        orb.classList.remove('listening');
        bubble.textContent = `You asked: "${query}"`;
        addChatMessage(query, 'user');
        handleQuery(query.toLowerCase());
    };

    recognition.onerror = function () {
        orb.classList.remove('listening');
        bubble.textContent = "Couldn't hear you. Try again!";
        speak("I couldn't hear you clearly");
    };

    recognition.onend = function () {
        orb.classList.remove('listening');
    };
}

function sendTextMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    addChatMessage(message, 'user');
    chatInput.value = '';
    bubble.textContent = `You asked: "${message}"`;
    handleQuery(message.toLowerCase());
}

function addChatMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}`;
    messageDiv.textContent = text;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    conversationHistory.push({ sender, text });
}

function handleQuery(query) {
    orb.classList.add('thinking');

    let response = '';

    if (query.includes('weather') || query.includes('temperature') || query.includes('temp')) {
        response = `Current temperature in ${currentLocation} is ${Math.round(weatherData.weather.temperature)} degrees celsius with ${weatherData.weather.description}. Humidity is at ${weatherData.weather.humidity} percent.`;
    }
    else if (query.includes('comfort')) {
        response = `Comfort index is ${weatherData.wci.score} out of 100. Conditions are ${weatherData.wci.level}. ${getComfortExplanation()}`;
    }
    else if (query.includes('why') || query.includes('discomfort') || query.includes('uncomfortable')) {
        response = getDiscomfortReason();
    }
    else if (query.includes('walk') || query.includes('outside') || query.includes('go out')) {
        response = weatherData.wci.score > 60 ?
            'Yes, weather conditions are good for going outside!' :
            'Conditions may be uncomfortable for outdoor activities.';
    }
    else if (query.includes('wear') || query.includes('clothes') || query.includes('clothing')) {
        response = getClothingSuggestion();
    }
    else if (query.includes('humid')) {
        response = `Humidity is ${weatherData.weather.humidity} percent. ${weatherData.weather.humidity > 70 ? 'It feels quite humid.' : 'Humidity is at comfortable levels.'}`;
    }
    else if (query.includes('wind')) {
        response = `Wind speed is ${(weatherData.weather.windSpeed * 3.6).toFixed(1)} kilometers per hour.`;
    }
    else if (query.includes('suggest') || query.includes('advice') || query.includes('recommend')) {
        response = weatherData.suggestions ? weatherData.suggestions.join('. ') : 'Stay comfortable and hydrated!';
    }
    else if (query.includes('hello') || query.includes('hi') || query.includes('hey')) {
        response = `Hello! I'm Jarvis, your weather assistant. Current temperature in ${currentLocation} is ${Math.round(weatherData.weather.temperature)} degrees. How can I help you?`;
    }
    else if (query.includes('thank')) {
        response = 'You are welcome! Feel free to ask me anything about the weather.';
    }
    else {
        response = 'I can help you with weather information. Try asking about temperature, comfort level, humidity, wind speed, or what to wear.';
    }

    orb.classList.remove('thinking');
    bubble.textContent = response;
    speak(response);
    addChatMessage(response, 'assistant');
}

function getComfortExplanation() {
    const score = weatherData.wci.score;
    if (score > 75) return 'Perfect conditions for any outdoor activity.';
    if (score > 50) return 'Moderately comfortable, suitable for most activities.';
    return 'Some discomfort may be experienced.';
}

function getDiscomfortReason() {
    const factors = weatherData.wci.factors || [];
    if (factors.length === 0) return 'Conditions are actually quite comfortable!';

    const reasons = factors.map(f => f.message).join('. ');
    return `The discomfort is due to: ${reasons}`;
}

function getClothingSuggestion() {
    const temp = weatherData.weather.temperature;
    if (temp > 30) return 'Wear light, breathable clothing. Stay hydrated.';
    if (temp > 25) return 'Light summer clothes are perfect.';
    if (temp > 20) return 'Comfortable casual wear should be fine.';
    if (temp > 15) return 'Consider wearing a light jacket or sweater.';
    if (temp > 10) return 'Wear warm clothing and a jacket.';
    return 'Dress warmly with layers. Consider a coat.';
}

function speak(text) {
    const cleanText = text.replace(/[😊😐😞🌤️☀️💧💨🌡️📍🤖👤☁️🌧️⛅]/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v =>
        v.name.includes('Natural') ||
        v.name.includes('Premium') ||
        v.name.includes('Google') ||
        v.name.includes('Microsoft')
    );

    if (preferredVoice) {
        utterance.voice = preferredVoice;
    }

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
}
