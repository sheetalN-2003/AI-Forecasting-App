import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_squared_error, r2_score
import os
from app.ml.registry import model_registry

def train_models():
    data_path = "c:/Users/sheet/Downloads/AI Forecasting App/backend/app/ml/synthetic_retail_data.csv"
    if not os.path.exists(data_path):
        print("Data not found. Generating...")
        from data_generator import generate_synthetic_data
        df = generate_synthetic_data()
        df.to_csv(data_path, index=False)
    else:
        df = pd.read_csv(data_path)
    
    df['Order_Date'] = pd.to_datetime(df['Order_Date'])
    df['Month'] = df['Order_Date'].dt.month
    df['Day'] = df['Order_Date'].dt.day
    df['DayOfWeek'] = df['Order_Date'].dt.dayofweek
    
    # Label encoding for strings
    le_region = LabelEncoder()
    le_cat = LabelEncoder()
    
    df['Region_Enc'] = le_region.fit_transform(df['Region'])
    df['Category_Enc'] = le_cat.fit_transform(df['Category'])
    
    # Features and Targets
    features = ['Region_Enc', 'Category_Enc', 'Quantity', 'Discount', 'Month', 'Day', 'DayOfWeek']
    X = df[features]
    y_sales = df['Sales']
    
    X_train, X_test, y_sales_train, y_sales_test = train_test_split(X, y_sales, test_size=0.2, random_state=42)
    
    # Train Random Forest
    rf_sales = RandomForestRegressor(n_estimators=100, random_state=42)
    rf_sales.fit(X_train, y_sales_train)
    
    # Calculate metrics
    y_pred = rf_sales.predict(X_test)
    mse = mean_squared_error(y_sales_test, y_pred)
    r2 = r2_score(y_sales_test, y_pred)
    
    # Log to Registry
    run_id = model_registry.log_model(
        name="Sales_Forecaster_RF",
        version="1.0.0",
        metrics={"mse": float(mse), "r2": float(r2)},
        params={"n_estimators": 100, "random_state": 42}
    )
    print(f"Logged model to registry. Run ID: {run_id}")
    
    # Train XGBoost
    xgb_sales = XGBRegressor(n_estimators=100, random_state=42)
    xgb_sales.fit(X_train, y_sales_train)
    
    # Save models and encoders
    models_dir = "c:/Users/sheet/Downloads/AI Forecasting App/backend/app/ml/models"
    os.makedirs(models_dir, exist_ok=True)
    
    joblib.dump(rf_sales, f"{models_dir}/rf_sales_model.pkl")
    joblib.dump(xgb_sales, f"{models_dir}/xgb_sales_model.pkl")
    joblib.dump(le_region, f"{models_dir}/le_region.pkl")
    joblib.dump(le_cat, f"{models_dir}/le_cat.pkl")
    
    print("Models trained and saved successfully!")

if __name__ == "__main__":
    train_models()
