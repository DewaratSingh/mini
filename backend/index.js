const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;
const FASTAPI_URL = 'http://localhost:8000';


const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const months = {
  "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
  "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12
};

const districts = [
  "Ahmednagar", "Akola", "Amravati", "Aurangabad", "Beed", "Bhandara", "Buldhana",
  "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli", "Jalgaon", "Jalna",
  "Kolhapur", "Latur", "Mumbai City", "Mumbai Suburban", "Nagpur", "Nanded",
  "Nandurbar", "Nashik", "Osmanabad", "Palghar", "Parbhani", "Pune", "Raigad",
  "Ratnagiri", "Sangli", "Satara", "Sindhudurg", "Solapur", "Thane", "Wardha",
  "Washim", "Yavatmal"
];

function extractEntitiesAlgo(text) {
  const lowerText = text.toLowerCase();

  if (lowerText.includes("hi") || lowerText.includes("hello") || lowerText.includes("who are you")) {
    return { intent: 'general', entities: {} };
  }

  let yearMatch = text.match(/\b(20\d{2})\b/);
  let year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();

  let month = new Date().getMonth() + 1;
  for (const [mName, mNum] of Object.entries(months)) {
    if (lowerText.includes(mName)) {
      month = mNum;
      break;
    }
  }

  let district = "Mumbai";
  for (const dist of districts) {
    if (lowerText.includes(dist.toLowerCase())) {
      district = dist;
      break;
    }
  }

  return { intent: 'forecast', entities: { year, month, district } };
}

function formatResponseAlgo(text, intent, data, result) {
  if (intent === 'general') {
    const lower = text.toLowerCase();
    if (lower.includes("who are you")) return "I am Jarvis, your intelligent weather assistant for Maharashtra. I can predict weather for any district or help you find a place with specific weather conditions.";
    return "Hello! I am Jarvis. How can I help you with weather forecasts today?";
  }
  if (intent === 'forecast') {
    return `In ${Object.keys(months).find(k => months[k] === data.month)} ${data.year}, ${data.district} is expected to have ${result.condition} weather, with temperatures around ${result.temperature}°C.`;
  } else {
    return `Based on the conditions provided, the predicted district is ${result.district}.`;
  }
}

app.post('/api/chat', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    console.log("Received query:", text);
    let intent, entities;
    let usedGPT = false;

    try {
      console.log("Calling Gemini for NLU...");
      const nluResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `You are a weather assistant NLU. Classify the user's intent based on their query.
If the user wants to check FUTURE/FORECAST weather for a place, return EXACTLY: PredictWeather,DistrictName (e.g., PredictWeather,Thane).
If the user wants to check CURRENT/REAL-TIME weather for a place, return EXACTLY: CurrentWeather,CityName (e.g., CurrentWeather,Pune).
If the user wants to find a place based on weather conditions, return EXACTLY: FindPlace,Condition,Temperature (e.g., FindPlace,Cloudy,25).
If the user is just saying hi or making small talk, return EXACTLY: General,Text (e.g., General,Hello).
Do not output anything else, no markdown, no JSON. Only the comma-separated format.
User query: ${text}`
      });

      const output = nluResponse.text.trim();
      console.log("Gemini NLU Output:", output);
      const parts = output.split(',');
      const intentStr = parts[0].trim();

      if (intentStr === 'PredictWeather') {
        intent = 'forecast';
        entities = { district: parts[1] ? parts[1].trim() : "Mumbai", year: new Date().getFullYear(), month: new Date().getMonth() + 1 };
      } else if (intentStr === 'FindPlace') {
        intent = 'find_place';
        entities = {
          condition: parts[1] ? parts[1].trim() : "Cloudy",
          temperature: parts[2] ? parseFloat(parts[2]) : 25,
          year: new Date().getFullYear(), month: new Date().getMonth() + 1,
          rainfall_mm: 0, humidity: 50
        };
      } else if (intentStr === 'CurrentWeather') {
        intent = 'current_weather';
        entities = { district: parts[1] ? parts[1].trim() : "Mumbai" };
      } else {
        intent = 'general';
        entities = {};
      }

      usedGPT = true;
      console.log("Gemini NLU Success. Intent:", intent);
    } catch (err) {
      console.warn("GPT NLU failed, using algorithm fallback:", err.message);
      const fallback = extractEntitiesAlgo(text);
      intent = fallback.intent;
      entities = fallback.entities;
    }

    let predictionData = null;
    let result = null;


    if (intent === 'forecast' || intent === 'find_place' || intent === 'current_weather') {
      if (intent === 'current_weather') {
        try {
          const city = entities.district;
          predictionData = { city, type: "Real-time" };
          console.log(`Fetching current weather for ${city} via Open-Meteo...`);
          const geoRes = await axios.get(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
          if (geoRes.data.results && geoRes.data.results.length > 0) {
            const { latitude, longitude } = geoRes.data.results[0];
            const weatherRes = await axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
            result = weatherRes.data.current_weather;
          } else {
            result = { error: "City not found for current weather." };
          }
          console.log("Open-Meteo Response:", result);
        } catch (e) {
          result = { error: "Failed to fetch current weather." };
        }
      } else {
        let mlEndpoint;
        if (intent === 'forecast') {
          mlEndpoint = `${FASTAPI_URL}/predict`;
          predictionData = {
            district: entities.district || "Pune",
            year: parseInt(entities.year) || new Date().getFullYear(),
            month: parseInt(entities.month) || (new Date().getMonth() + 1)
          };
        } else {
          mlEndpoint = `${FASTAPI_URL}/predict_district`;
          predictionData = {
            year: parseInt(entities.year) || new Date().getFullYear(),
            month: parseInt(entities.month) || (new Date().getMonth() + 1),
            temperature: parseFloat(entities.temperature) || 25,
            condition: entities.condition || "Cloudy",
            rainfall_mm: parseFloat(entities.rainfall_mm) || 0,
            humidity: parseFloat(entities.humidity) || 50
          };
        }

        console.log(`Calling ML API at ${mlEndpoint} with data:`, predictionData);
        const mlResponse = await axios.post(mlEndpoint, predictionData);
        result = mlResponse.data;
        console.log("ML API Response:", result);
      }
    }

    // 3. Try Gemini for final response formatting
    let answer;
    try {
      if (!usedGPT) throw new Error("Skipping Gemini formatting because NLU failed");

      console.log("Calling Gemini for response formatting...");
      const finalResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `You are Jarvis, a helpful website weather assistant for Maharashtra. Create a friendly, natural response. If the intent is 'general', just respond to the user politely.
Query: ${text}. Intent: ${intent}. Input Data: ${JSON.stringify(predictionData)}. Prediction Result: ${JSON.stringify(result)}.
Return ONLY the text response.`
      });
      answer = finalResponse.text.trim();
      console.log("Gemini Response Formatting Success.");
    } catch (err) {
      console.warn("GPT formatting failed, using algorithm fallback:", err.message);
      answer = formatResponseAlgo(text, intent, predictionData, result);
    }

    res.json({
      answer,
      predictions: result,
      intent,
      entities: predictionData,
      gpt_used: usedGPT
    });

  } catch (error) {
    console.error("DEBUG ERROR:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
      hint: "Check if Python API is running at http://localhost:8000"
    });
  }
});

app.listen(PORT, () => {
  console.log(`Express server running on http://localhost:${PORT}`);
});
