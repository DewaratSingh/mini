'use client';
import { useState, useEffect, useRef } from 'react';
import './globals.css';

export default function Home() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState('Press the microphone to speak');

  // Weather state
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [locationError, setLocationError] = useState('');
  
  // Time state
  const [time, setTime] = useState(null);

  const recognitionRef = useRef(null);
  const synthRef = useRef(null);

  const getWeatherSuggestion = (weather) => {
    if (!weather || !weather.current) return '';

    const temp = weather.current.temperature;
    const code = weather.current.weathercode;

    // Rainy / Thunderstorm
    if ([61, 63, 65, 95].includes(code)) {
      return "🌧️ It's rainy outside. You can stay indoors, maybe hit the gym or work on coding!";
    }

    // Very hot
    if (temp >= 35) {
      return "🔥 It's very hot. Stay hydrated and avoid going out. Gym or indoor activities are better.";
    }

    // Pleasant weather
    if (temp >= 20 && temp <= 30 && code <= 3) {
      return "🌤️ Weather is perfect! You can go for a walk, gym, or outdoor activities.";
    }

    // Cold weather
    if (temp < 15) {
      return "❄️ It's cold. Stay warm! Indoor workout or gym is a good idea.";
    }

    // Default
    return "🌿 Have a great day! Choose any activity you enjoy.";
  };

  useEffect(() => {
    // Initialize Speech Recognition
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onstart = () => {
          setIsListening(true);
          setStatus('Listening...');
        };

        recognitionRef.current.onresult = (event) => {
          const text = event.results[0][0].transcript;
          setTranscript(text);
          setStatus('Processing computation...');
          handleQuery(text);
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error', event.error);
          setIsListening(false);
          setStatus('Error: ' + event.error);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      } else {
        setStatus('Speech recognition not supported in this browser.');
      }

      // Initialize Speech Synthesis
      synthRef.current = window.speechSynthesis;
    }

    // Set up clock
    setTime(new Date());
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Get user location for weather
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;

            // Try to fetch location name
            let placeName = "Current Location";
            try {
              const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
              const geoData = await geoRes.json();
              placeName = geoData.city || geoData.locality || geoData.principalSubdivision || placeName;
            } catch (e) {
              console.log('Geocoding error', e);
            }

            // Fetch current and daily forecast from open-meteo
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`);
            const data = await res.json();

            setWeather({
              current: data.current_weather,
              daily: data.daily,
              place: placeName
            });
            setWeatherLoading(false);
          } catch (err) {
            console.error("Failed to fetch weather", err);
            setLocationError('Failed to fetch weather data');
            setWeatherLoading(false);
          }
        },
        (error) => {
          console.error("Error getting location", error);
          setLocationError('Location access denied');
          setWeatherLoading(false);
        }
      );
    } else {
      setLocationError('Geolocation not supported');
      setWeatherLoading(false);
    }
  }, []);

  const getWeatherInfo = (code) => {
    const codes = {
      0: { desc: 'Clear sky', icon: '☀️' },
      1: { desc: 'Mainly clear', icon: '🌤️' },
      2: { desc: 'Partly cloudy', icon: '⛅' },
      3: { desc: 'Overcast', icon: '☁️' },
      45: { desc: 'Fog', icon: '🌫️' },
      48: { desc: 'Rime fog', icon: '🌫️' },
      51: { desc: 'Light drizzle', icon: '🌦️' },
      53: { desc: 'Moderate drizzle', icon: '🌧️' },
      55: { desc: 'Dense drizzle', icon: '🌧️' },
      61: { desc: 'Slight rain', icon: '🌧️' },
      63: { desc: 'Moderate rain', icon: '🌧️' },
      65: { desc: 'Heavy rain', icon: '🌧️' },
      71: { desc: 'Slight snow', icon: '🌨️' },
      73: { desc: 'Moderate snow', icon: '❄️' },
      75: { desc: 'Heavy snow', icon: '❄️' },
      95: { desc: 'Thunderstorm', icon: '⛈️' },
    };
    return codes[code] || { desc: 'Variable', icon: '🌡️' };
  };

  const handleQuery = async (text) => {
    try {
      const res = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await res.json();

      if (data.answer) {
        setResponse(data.answer);
        setStatus('Response ready...');
        speak(data.answer);
      }
    } catch (err) {
      console.error(err);
      setStatus('Error calling backend API');
    }
  };

  const speak = (text) => {
    if (!synthRef.current) return;

    // Stop any ongoing speech (voice interruption support)
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Try to find a good English voice
    const voices = synthRef.current.getVoices();
    const jarvisVoice = voices.find(v => v.name.includes('Google UK English Male') || v.name.includes('Daniel') || v.name.includes('Male')) || voices[0];
    if (jarvisVoice) utterance.voice = jarvisVoice;

    utterance.pitch = 0.9;
    utterance.rate = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      setStatus('Awaiting next command...');
    };
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  };

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      if (isSpeaking) {
        synthRef.current?.cancel(); // Interrupt speech if mic is pressed again
        setIsSpeaking(false);
      }
      setTranscript('');
      setResponse('');
      recognitionRef.current?.start();
    }
  };

  return (
    <div className="app-wrapper">
      <div className="weather-card">
        {weatherLoading ? (
          <div className="weather-loading">Acquiring location & forecast...</div>
        ) : locationError ? (
          <div className="weather-error">{locationError}</div>
        ) : weather && weather.current ? (
          <>
            <div className="weather-header">
              <span className="weather-place">{weather.place}</span>
            </div>

            <div className="weather-main-current">
              <div className="weather-temp-large">
                <span className="temp-icon">{getWeatherInfo(weather.current.weathercode).icon}</span>
                {Math.round(weather.current.temperature)}°C
              </div>
              <div className="weather-desc">
                {getWeatherInfo(weather.current.weathercode).desc}
              </div>
            </div>

            <div className="weather-details">
              <div className="weather-detail-item">
                <span>🌬️ Wind:</span>
                <span>{weather.current.windspeed} km/h</span>
              </div>
            </div>

            {weather.daily && weather.daily.time && (
              <div className="weather-forecast">
                <div className="forecast-title">3-Day Forecast</div>
                <div className="forecast-list">
                  {weather.daily.time.slice(1, 4).map((timeStr, index) => {
                    const actualIndex = index + 1; // skip today (index 0)
                    const dateObj = new Date(timeStr);
                    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                    const code = weather.daily.weathercode[actualIndex];
                    const tempMax = Math.round(weather.daily.temperature_2m_max[actualIndex]);
                    const tempMin = Math.round(weather.daily.temperature_2m_min[actualIndex]);
                    const info = getWeatherInfo(code);

                    return (
                      <div className="forecast-item" key={timeStr}>
                        <span className="forecast-day">{dayName}</span>
                        <span className="forecast-icon">{info.icon}</span>
                        <span className="forecast-temps">
                          <span className="temp-high">{tempMax}°</span>
                          <span className="temp-low">{tempMin}°</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : null}
        {weather && (
          <div className="weather-suggestion">
            {getWeatherSuggestion(weather)}
          </div>
        )}
      </div>

      {time && (
        <div className="time-card">
          <div className="time-clock">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="time-date">
            {time.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
      )}

      <div className="container">
        <h1 className="title">Jarvis Systems</h1>

        <button
          className={`mic-button ${isListening ? 'listening' : ''}`}
          onClick={toggleListen}
          aria-label="Microphone"
        >
          <svg className="mic-icon" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        </button>

        <div className={`waveform ${isSpeaking ? 'active' : ''}`}>
          <div className="bar"></div>
          <div className="bar"></div>
          <div className="bar"></div>
          <div className="bar"></div>
          <div className="bar"></div>
          <div className="bar"></div>
          <div className="bar"></div>
        </div>

        <div className="status-text">{status}</div>

        {transcript && <div className="query-text">"{transcript}"</div>}

        <div className={`response-box ${response ? 'visible' : ''}`}>
          {response}
        </div>
      </div>
    </div>
  );
}
