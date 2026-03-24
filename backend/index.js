const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;
const FASTAPI_URL = 'http://localhost:8000';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: ""
})

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

    // 1. Try GPT for NLU
    try {
      console.log("Calling OpenAI for NLU...");
      const nluResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are a weather assistant NLU. Classify the user's intent as:
                    - 'forecast': checking weather for a place.
                    - 'find_place': finding a place with specific weather.
                    - 'general': greetings, "who are you", or small talk.
                    
                    Extract entities for 'forecast' (district, year, month) and 'find_place' (year, month, temperature, condition, rainfall_mm, humidity). 
                    No entities for 'general'.
                    Default year to current year, month to current month.
                    Return ONLY JSON.`
          },
          { role: "user", content: text }
        ],
        response_format: { type: "json_object" }
      });

      const nluData = JSON.parse(nluResponse.choices[0].message.content);
      intent = nluData.intent;
      entities = nluData.entities;
      usedGPT = true;
      console.log("GPT NLU Success. Intent:", intent);
    } catch (err) {
      console.warn("GPT NLU failed, using algorithm fallback:", err.message);
      const fallback = extractEntitiesAlgo(text);
      intent = fallback.intent;
      entities = fallback.entities;
    }

    let predictionData = null;
    let result = null;

    // 2. Call local ML API ONLY if it's a weather-related query
    if (intent === 'forecast' || intent === 'find_place') {
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

    // 3. Try GPT for final response formatting
    let answer;
    try {
      if (!usedGPT) throw new Error("Skipping GPT formatting because NLU failed");

      console.log("Calling OpenAI for response formatting...");
      const finalResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are Jarvis, a helpful weather assistant for Maharashtra. Create a friendly, natural response. If the intent is 'general', just respond to the user politely as a weather assistant."
          },
          {
            role: "user",
            content: `Query: ${text}. Intent: ${intent}. Input Data: ${JSON.stringify(predictionData)}. Prediction Result: ${JSON.stringify(result)}.`
          }
        ]
      });
      answer = finalResponse.choices[0].message.content;
      console.log("GPT Response Formatting Success.");
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
