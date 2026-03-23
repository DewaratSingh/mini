from fastapi import FastAPI
from pydantic import BaseModel
import pickle
import pandas as pd

app = FastAPI(title="Weather Prediction API")

# Load models
print("Loading models...")
with open('temperature_model.pkl', 'rb') as f:
    temp_model = pickle.load(f)

with open('wind_model.pkl', 'rb') as f:
    wind_model = pickle.load(f)

with open('condition_model.pkl', 'rb') as f:
    cond_model = pickle.load(f)

class PredictionRequest(BaseModel):
    district: str
    year: int
    month: int

@app.post("/predict")
def predict(req: PredictionRequest):
    # Create dataframe for prediction
    df = pd.DataFrame([{
        'year': req.year,
        'month': req.month,
        'district': req.district
    }])
    
    # Predict
    temp = temp_model.predict(df)[0]
    wind = wind_model.predict(df)[0]
    cond = cond_model.predict(df)[0]
    
    return {
        "temperature": round(float(temp), 1),
        "wind_speed": round(float(wind), 1),
        "condition": cond
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
