#!/usr/bin/env python3
"""
Quick ML model training script to enable forecasting features.
This trains Random Forest and XGBoost models on the seeded sales data.
"""

import os
import sys
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
import joblib

# Add the app directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.core.database import SessionLocal, SQLALCHEMY_DATABASE_URL
from app.models.schemas import SaleRecord

def load_data_from_db():
    """Load sales data from database"""
    db = SessionLocal()
    try:
        records = db.query(SaleRecord).all()
        if not records:
            print("❌ No sales data found in database. Run seed_data.py first.")
            return None
            
        data = []
        for record in records:
            data.append({
                'order_date': record.order_date,
                'region': record.region,
                'category': record.category,
                'quantity': record.quantity,
                'discount': record.discount,
                'sales': record.sales,
                'profit': record.profit
            })
        
        df = pd.DataFrame(data)
        print(f"📊 Loaded {len(df)} sales records from database")
        return df
        
    except Exception as e:
        print(f"❌ Error loading data: {e}")
        return None
    finally:
        db.close()

def prepare_features(df):
    """Prepare features for ML training"""
    # Create date features
    df['order_date'] = pd.to_datetime(df['order_date'])
    df['month'] = df['order_date'].dt.month
    df['day'] = df['order_date'].dt.day
    df['day_of_week'] = df['order_date'].dt.dayofweek
    
    # Encode categorical variables
    le_region = LabelEncoder()
    le_category = LabelEncoder()
    
    df['region_encoded'] = le_region.fit_transform(df['region'])
    df['category_encoded'] = le_category.fit_transform(df['category'])
    
    # Select features for training
    features = ['region_encoded', 'category_encoded', 'quantity', 'discount', 'month', 'day', 'day_of_week']
    X = df[features]
    y = df['sales']
    
    return X, y, le_region, le_category

def train_models(X, y):
    """Train Random Forest and XGBoost models"""
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("🤖 Training Random Forest model...")
    rf_model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
    rf_model.fit(X_train, y_train)
    
    # Evaluate Random Forest
    rf_pred = rf_model.predict(X_test)
    rf_mae = mean_absolute_error(y_test, rf_pred)
    rf_r2 = r2_score(y_test, rf_pred)
    
    print(f"   Random Forest - MAE: ${rf_mae:.2f}, R²: {rf_r2:.3f}")
    
    # Try to import and train XGBoost
    try:
        import xgboost as xgb
        print("🚀 Training XGBoost model...")
        xgb_model = xgb.XGBRegressor(n_estimators=100, random_state=42, n_jobs=-1)
        xgb_model.fit(X_train, y_train)
        
        # Evaluate XGBoost
        xgb_pred = xgb_model.predict(X_test)
        xgb_mae = mean_absolute_error(y_test, xgb_pred)
        xgb_r2 = r2_score(y_test, xgb_pred)
        
        print(f"   XGBoost - MAE: ${xgb_mae:.2f}, R²: {xgb_r2:.3f}")
        
    except ImportError:
        print("⚠️  XGBoost not available, using Random Forest as fallback")
        xgb_model = rf_model  # Use RF as fallback
    
    return rf_model, xgb_model

def save_models(rf_model, xgb_model, le_region, le_category):
    """Save trained models and encoders"""
    models_dir = os.path.join(os.path.dirname(__file__), 'app', 'ml', 'models')
    os.makedirs(models_dir, exist_ok=True)
    
    # Save models
    joblib.dump(rf_model, os.path.join(models_dir, 'rf_sales_model.pkl'))
    joblib.dump(xgb_model, os.path.join(models_dir, 'xgb_sales_model.pkl'))
    
    # Save encoders
    joblib.dump(le_region, os.path.join(models_dir, 'le_region.pkl'))
    joblib.dump(le_category, os.path.join(models_dir, 'le_cat.pkl'))
    
    print(f"💾 Models saved to {models_dir}")

def main():
    """Main training function"""
    print("🎯 Starting ML model training...")
    
    # Load data
    df = load_data_from_db()
    if df is None:
        return
    
    # Prepare features
    print("🔧 Preparing features...")
    X, y, le_region, le_category = prepare_features(df)
    
    # Train models
    rf_model, xgb_model = train_models(X, y)
    
    # Save models
    save_models(rf_model, xgb_model, le_region, le_category)
    
    print("\n✅ Model training completed successfully!")
    print("🚀 Forecasting API is now ready with trained models")
    
    # Print feature importance
    print("\n📈 Feature Importance (Random Forest):")
    feature_names = ['Region', 'Category', 'Quantity', 'Discount', 'Month', 'Day', 'DayOfWeek']
    importances = rf_model.feature_importances_
    for name, importance in zip(feature_names, importances):
        print(f"   {name}: {importance:.3f}")

if __name__ == "__main__":
    main()