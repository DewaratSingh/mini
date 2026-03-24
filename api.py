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

with open('district_model.pkl', 'rb') as f:
    district_model = pickle.load(f)

class PredictionRequest(BaseModel):
    district: str
    year: int
    month: int

class DistrictPredictionRequest(BaseModel):
    year: int
    month: int
    temperature: float
    condition: str
    rainfall_mm: float
    humidity: float

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

@app.post("/predict_district")
def predict_district(req: DistrictPredictionRequest):
    # Create dataframe for prediction
    df = pd.DataFrame([{
        'year': req.year,
        'month': req.month,
        'temperature': req.temperature,
        'condition': req.condition,
        'rainfall_mm': req.rainfall_mm,
        'humidity': req.humidity
    }])
    
    # Predict
    district = district_model.predict(df)[0]
    
    return {
        "district": district
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
