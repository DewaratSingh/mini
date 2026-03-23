import pandas as pd
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
import pickle
import os

def main():
    print("Loading dataset...")
    df = pd.read_csv('maharashtra_weather_5year.csv')

    X = df[['year', 'month', 'district']]
    y_temp = df['temperature']
    y_wind = df['wind_speed']
    y_cond = df['condition']

    # Preprocessing: target 'district' for one-hot encoding
    preprocessor = ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(handle_unknown='ignore'), ['district'])
        ],
        remainder='passthrough'
    )

    # Models
    print("Training temperature model...")
    temp_model = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('regressor', RandomForestRegressor(n_estimators=100, random_state=42))
    ])
    temp_model.fit(X, y_temp)
    with open('temperature_model.pkl', 'wb') as f:
        pickle.dump(temp_model, f)

    print("Training wind model...")
    wind_model = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('regressor', RandomForestRegressor(n_estimators=100, random_state=42))
    ])
    wind_model.fit(X, y_wind)
    with open('wind_model.pkl', 'wb') as f:
        pickle.dump(wind_model, f)

    print("Training condition model...")
    cond_model = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('classifier', RandomForestClassifier(n_estimators=100, random_state=42))
    ])
    cond_model.fit(X, y_cond)
    with open('condition_model.pkl', 'wb') as f:
        pickle.dump(cond_model, f)

    print("All models trained and saved to .pkl files.")

if __name__ == "__main__":
    main()
