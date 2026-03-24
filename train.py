import pandas as pd
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
import pickle

def main():
    print("Loading dataset...")
    df = pd.read_csv('maharashtra_weather_5year.csv')

    # Model 1: Weather Prediction (Predict temperature, wind_speed, condition)
    # Features: year, month, district
    X_weather = df[['year', 'month', 'district']]
    y_temp = df['temperature']
    y_wind = df['wind_speed']
    y_cond = df['condition']

    # Preprocessor for district in Model 1
    weather_preprocessor = ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(handle_unknown='ignore'), ['district'])
        ],
        remainder='passthrough'
    )

    print("Training temperature model...")
    temp_model = Pipeline(steps=[
        ('preprocessor', weather_preprocessor),
        ('regressor', RandomForestRegressor(n_estimators=100, random_state=42))
    ])
    temp_model.fit(X_weather, y_temp)
    with open('temperature_model.pkl', 'wb') as f:
        pickle.dump(temp_model, f)

    print("Training wind model...")
    wind_model = Pipeline(steps=[
        ('preprocessor', weather_preprocessor),
        ('regressor', RandomForestRegressor(n_estimators=100, random_state=42))
    ])
    wind_model.fit(X_weather, y_wind)
    with open('wind_model.pkl', 'wb') as f:
        pickle.dump(wind_model, f)

    print("Training condition model...")
    cond_model = Pipeline(steps=[
        ('preprocessor', weather_preprocessor),
        ('classifier', RandomForestClassifier(n_estimators=100, random_state=42))
    ])
    cond_model.fit(X_weather, y_cond)
    with open('condition_model.pkl', 'wb') as f:
        pickle.dump(cond_model, f)

    # Model 2: District Prediction (Predict district)
    # Features: year, month, temperature, condition, rainfall_mm, humidity
    X_district = df[['year', 'month', 'temperature', 'condition', 'rainfall_mm', 'humidity']]
    y_district = df['district']

    # Preprocessor for condition in Model 2
    district_preprocessor = ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(handle_unknown='ignore'), ['condition'])
        ],
        remainder='passthrough'
    )

    print("Training district prediction model...")
    district_model = Pipeline(steps=[
        ('preprocessor', district_preprocessor),
        ('classifier', RandomForestClassifier(n_estimators=100, random_state=42))
    ])
    district_model.fit(X_district, y_district)
    with open('district_model.pkl', 'wb') as f:
        pickle.dump(district_model, f)

    print("All models trained and saved to .pkl files.")

if __name__ == "__main__":
    main()
