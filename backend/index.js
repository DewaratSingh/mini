const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;
const FASTAPI_URL = 'http://localhost:8000/predict';

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

function extractEntities(text) {
  const lowerText = text.toLowerCase();
  
  let yearMatch = text.match(/\b(20\d{2})\b/);
  let year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();

  let month = new Date().getMonth() + 1;
  for (const [mName, mNum] of Object.entries(months)) {
    if (lowerText.includes(mName)) {
      month = mNum;
      break;
    }
  }

  let district = "Pune";
  for (const dist of districts) {
    if (lowerText.includes(dist.toLowerCase())) {
      district = dist;
      break;
    }
  }

  return { year, month, district };
}

app.post('/api/chat', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const entities = extractEntities(text);

    const mlResponse = await axios.post(FASTAPI_URL, entities);
    const { temperature, wind_speed, condition } = mlResponse.data;

    const monthName = Object.keys(months).find(key => months[key] === entities.month);
    const capitalizedMonth = monthName ? monthName.charAt(0).toUpperCase() + monthName.slice(1) : "the specified month";
    
    let responseText = `In ${capitalizedMonth} ${entities.year}, ${entities.district} is expected to have ${condition.toLowerCase()} weather, with temperatures around ${temperature} degrees Celsius. Wind speeds will be near ${wind_speed} kilometers per hour.`;
    
    if (condition.toLowerCase() === 'rain') {
        responseText = `In ${capitalizedMonth} ${entities.year}, ${entities.district} is expected to experience rainfall, with temperatures around ${temperature} degrees Celsius and gentle winds near ${wind_speed} kilometers per hour. Keep an umbrella handy!`;
    } else if (condition.toLowerCase() === 'hot') {
        responseText = `In ${capitalizedMonth} ${entities.year}, ${entities.district} is going to be quite hot, reaching ${temperature} degrees Celsius. Expect wind speeds around ${wind_speed} kilometers per hour. Stay hydrated!`;
    } else if (condition.toLowerCase() === 'cloudy') {
        responseText = `In ${capitalizedMonth} ${entities.year}, ${entities.district} will be mostly cloudy. Temperatures will hover around ${temperature} degrees Celsius with winds at ${wind_speed} kilometers per hour.`;
    }

    res.json({
      answer: responseText,
      predictions: { temperature, wind_speed, condition },
      entities
    });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Express server running on http://localhost:${PORT}`);
});
