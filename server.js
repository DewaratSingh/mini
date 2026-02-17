require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const WeatherService = require('./services/weatherService');
const WCIEngine = require('./services/wciEngine');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const apiKey = process.env.OPENWEATHER_API_KEY;
const weatherService = new WeatherService(apiKey);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/weather/:location', async (req, res) => {
    try {
        const { location } = req.params;
        const weather = await weatherService.getCurrentWeather(location);
        res.json({ success: true, data: weather });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

app.post('/api/weather/coords', async (req, res) => {
    try {
        const { lat, lon } = req.body;
        const weather = await weatherService.getWeatherByCoords(lat, lon);
        res.json({ success: true, data: weather });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

app.get('/api/wci/:location', async (req, res) => {
    try {
        const { location } = req.params;
        const weather = await weatherService.getCurrentWeather(location);
        const wci = WCIEngine.calculateWCI(weather);
        const suggestions = WCIEngine.getSuggestions(wci, weather);

        res.json({
            success: true,
            data: {
                weather,
                wci,
                suggestions
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

app.post('/api/wci/coords', async (req, res) => {
    try {
        const { lat, lon } = req.body;
        const weather = await weatherService.getWeatherByCoords(lat, lon);
        const wci = WCIEngine.calculateWCI(weather);
        const suggestions = WCIEngine.getSuggestions(wci, weather);

        res.json({
            success: true,
            data: {
                weather,
                wci,
                suggestions
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

app.get('/api/forecast/:location', async (req, res) => {
    try {
        const { location } = req.params;
        const forecast = await weatherService.getForecast(location);

        const forecastWithWCI = forecast.map(day => ({
            ...day,
            wci: WCIEngine.calculateWCI({
                temperature: day.temperature,
                humidity: day.humidity,
                windSpeed: day.windSpeed,
                feelsLike: day.temperature
            })
        }));

        res.json({ success: true, data: forecastWithWCI });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'running',
        apiKeyConfigured: !!apiKey && apiKey !== 'your_api_key_here'
    });
});

app.use((err, req, res, next) => {
    res.status(500).json({ success: false, error: 'Something went wrong!' });
});

app.listen(PORT, () => {
    console.log(`🚀 Jarvis Voice Weather: http://localhost:${PORT}`);
    console.log(apiKey && apiKey !== 'your_api_key_here' ? '✅ Weather API ready\n' : '⚠️  Weather API key needed\n');
});
