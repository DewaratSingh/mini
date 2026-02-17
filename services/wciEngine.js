/**
 * Weather Comfort Index (WCI) Calculation Engine
 * Calculates a 0-100 comfort score based on weather parameters
 */

class WCIEngine {
    /**
     * Calculate Weather Comfort Index
     * @param {Object} weather - Weather data object
     * @returns {Object} WCI score, level, and breakdown
     */
    static calculateWCI(weather) {
        const tempScore = this.calculateTemperatureScore(weather.temperature);
        const humidityScore = this.calculateHumidityScore(weather.humidity);
        const windScore = this.calculateWindScore(weather.windSpeed);

        // Weighted average (temperature is most important)
        const wciScore = Math.round(
            tempScore * 0.5 +
            humidityScore * 0.3 +
            windScore * 0.2
        );

        const level = this.getComfortLevel(wciScore);
        const breakdown = {
            temperature: {
                value: weather.temperature,
                score: tempScore,
                optimal: '20-25°C'
            },
            humidity: {
                value: weather.humidity,
                score: humidityScore,
                optimal: '40-60%'
            },
            wind: {
                value: weather.windSpeed,
                score: windScore,
                optimal: '<15 km/h'
            }
        };

        return {
            score: wciScore,
            level: level.name,
            color: level.color,
            emoji: level.emoji,
            breakdown,
            factors: this.getDiscomfortFactors(weather, breakdown),
            timestamp: Date.now()
        };
    }

    /**
     * Temperature scoring (optimal: 20-25°C)
     */
    static calculateTemperatureScore(temp) {
        if (temp >= 20 && temp <= 25) return 100;
        if (temp >= 18 && temp <= 27) return 90;
        if (temp >= 15 && temp <= 30) return 70;
        if (temp >= 10 && temp <= 35) return 50;
        if (temp >= 5 && temp <= 38) return 30;
        return 10;
    }

    /**
     * Humidity scoring (optimal: 40-60%)
     */
    static calculateHumidityScore(humidity) {
        if (humidity >= 40 && humidity <= 60) return 100;
        if (humidity >= 30 && humidity <= 70) return 80;
        if (humidity >= 20 && humidity <= 80) return 60;
        if (humidity >= 10 && humidity <= 90) return 40;
        return 20;
    }

    /**
     * Wind speed scoring (optimal: <15 km/h)
     */
    static calculateWindScore(windSpeed) {
        const windKmh = windSpeed * 3.6; // Convert m/s to km/h

        if (windKmh < 10) return 100;
        if (windKmh < 15) return 90;
        if (windKmh < 25) return 70;
        if (windKmh < 40) return 50;
        if (windKmh < 60) return 30;
        return 10;
    }

    /**
     * Determine comfort level from score
     */
    static getComfortLevel(score) {
        if (score >= 80) {
            return {
                name: 'Comfortable',
                color: '#10b981',
                emoji: '😊'
            };
        } else if (score >= 50) {
            return {
                name: 'Moderate',
                color: '#f59e0b',
                emoji: '😐'
            };
        } else {
            return {
                name: 'Uncomfortable',
                color: '#ef4444',
                emoji: '😣'
            };
        }
    }

    /**
     * Identify factors causing discomfort
     */
    static getDiscomfortFactors(weather, breakdown) {
        const factors = [];

        if (breakdown.temperature.score < 70) {
            if (weather.temperature < 18) {
                factors.push({ type: 'cold', message: 'Temperature is too cold' });
            } else {
                factors.push({ type: 'hot', message: 'Temperature is too hot' });
            }
        }

        if (breakdown.humidity.score < 70) {
            if (weather.humidity < 40) {
                factors.push({ type: 'dry', message: 'Air is too dry' });
            } else {
                factors.push({ type: 'humid', message: 'Air is too humid' });
            }
        }

        if (breakdown.wind.score < 70) {
            factors.push({ type: 'windy', message: 'Wind speed is high' });
        }

        return factors;
    }

    /**
     * Get suggestions based on WCI
     */
    static getSuggestions(wci, weather) {
        const suggestions = [];

        if (wci.score >= 80) {
            suggestions.push('Perfect weather for outdoor activities!');
            suggestions.push('Great time for a walk or exercise.');
        } else if (wci.score >= 50) {
            if (weather.temperature < 20) {
                suggestions.push('Consider wearing a light jacket.');
            } else if (weather.temperature > 25) {
                suggestions.push('Stay hydrated and seek shade when possible.');
            }

            if (weather.humidity > 70) {
                suggestions.push('High humidity might make it feel warmer.');
            }
        } else {
            if (weather.temperature < 15) {
                suggestions.push('Dress warmly if going outside.');
            } else if (weather.temperature > 30) {
                suggestions.push('Avoid prolonged outdoor exposure.');
                suggestions.push('Stay in air-conditioned spaces.');
            }

            if (weather.windSpeed * 3.6 > 40) {
                suggestions.push('Strong winds - secure loose items.');
            }
        }

        return suggestions;
    }
}

module.exports = WCIEngine;
