const axios = require('axios');
const NodeCache = require('node-cache');

// Cache weather data to avoid excessive API calls
const cache = new NodeCache({ stdTTL: process.env.CACHE_TTL || 600 });

class WeatherService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.openweathermap.org/data/2.5';
  }

  /**
   * Get current weather for a location
   */
  async getCurrentWeather(location) {
    const cacheKey = `current_${location}`;
    const cached = cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/weather`, {
        params: {
          q: location,
          appid: this.apiKey,
          units: 'metric'
        }
      });

      const data = {
        temperature: response.data.main.temp,
        feelsLike: response.data.main.feels_like,
        humidity: response.data.main.humidity,
        pressure: response.data.main.pressure,
        windSpeed: response.data.wind.speed,
        windDeg: response.data.wind.deg,
        description: response.data.weather[0].description,
        icon: response.data.weather[0].icon,
        clouds: response.data.clouds.all,
        visibility: response.data.visibility,
        location: response.data.name,
        country: response.data.sys.country,
        sunrise: response.data.sys.sunrise,
        sunset: response.data.sys.sunset,
        timestamp: Date.now()
      };

      cache.set(cacheKey, data);
      return data;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        throw new Error('Location not found');
      }
      throw new Error('Failed to fetch weather data');
    }
  }

  /**
   * Get 5-day forecast for trends
   */
  async getForecast(location) {
    const cacheKey = `forecast_${location}`;
    const cached = cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/forecast`, {
        params: {
          q: location,
          appid: this.apiKey,
          units: 'metric'
        }
      });

      // Group by day and get daily averages
      const dailyData = {};
      
      response.data.list.forEach(item => {
        const date = new Date(item.dt * 1000).toLocaleDateString();
        
        if (!dailyData[date]) {
          dailyData[date] = {
            temps: [],
            humidity: [],
            windSpeed: [],
            description: item.weather[0].description,
            icon: item.weather[0].icon
          };
        }
        
        dailyData[date].temps.push(item.main.temp);
        dailyData[date].humidity.push(item.main.humidity);
        dailyData[date].windSpeed.push(item.wind.speed);
      });

      // Calculate averages
      const forecast = Object.keys(dailyData).map(date => ({
        date,
        temperature: dailyData[date].temps.reduce((a, b) => a + b) / dailyData[date].temps.length,
        humidity: dailyData[date].humidity.reduce((a, b) => a + b) / dailyData[date].humidity.length,
        windSpeed: dailyData[date].windSpeed.reduce((a, b) => a + b) / dailyData[date].windSpeed.length,
        description: dailyData[date].description,
        icon: dailyData[date].icon
      }));

      cache.set(cacheKey, forecast);
      return forecast;
    } catch (error) {
      throw new Error('Failed to fetch forecast data');
    }
  }

  /**
   * Get weather by coordinates (for geolocation)
   */
  async getWeatherByCoords(lat, lon) {
    try {
      const response = await axios.get(`${this.baseUrl}/weather`, {
        params: {
          lat,
          lon,
          appid: this.apiKey,
          units: 'metric'
        }
      });

      return {
        temperature: response.data.main.temp,
        feelsLike: response.data.main.feels_like,
        humidity: response.data.main.humidity,
        pressure: response.data.main.pressure,
        windSpeed: response.data.wind.speed,
        windDeg: response.data.wind.deg,
        description: response.data.weather[0].description,
        icon: response.data.weather[0].icon,
        clouds: response.data.clouds.all,
        visibility: response.data.visibility,
        location: response.data.name,
        country: response.data.sys.country,
        sunrise: response.data.sys.sunrise,
        sunset: response.data.sys.sunset,
        timestamp: Date.now()
      };
    } catch (error) {
      throw new Error('Failed to fetch weather data by coordinates');
    }
  }
}

module.exports = WeatherService;
