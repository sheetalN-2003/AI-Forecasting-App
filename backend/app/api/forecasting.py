from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import joblib
import numpy as np
import os
from pydantic import BaseModel

from app.core.database import get_db
from app.models.schemas import SaleRecord, ForecastHistory, User
from app.api.auth import get_current_user
import json

router = APIRouter()

# ─── Load Models ──────────────────────────────────────────────────────────────
MODELS_PATH = os.path.join(os.path.dirname(__file__), "..", "ml", "models")

def _load_models():
    try:
        rf  = joblib.load(os.path.join(MODELS_PATH, "rf_sales_model.pkl"))
        xgb = joblib.load(os.path.join(MODELS_PATH, "xgb_sales_model.pkl"))
        le_region = joblib.load(os.path.join(MODELS_PATH, "le_region.pkl"))
        le_cat    = joblib.load(os.path.join(MODELS_PATH, "le_cat.pkl"))
        return rf, xgb, le_region, le_cat
    except Exception as e:
        print(f"[WARNING] Models not loaded: {e}")
        return None, None, None, None

rf_model, xgb_model, le_region, le_cat = _load_models()

# ─── Schemas ──────────────────────────────────────────────────────────────────
class PredictionRequest(BaseModel):
    region: str
    category: str
    quantity: int
    discount: float
    month: int
    day: int = 15
    day_of_week: int = 2

class FactorItem(BaseModel):
    name: str
    weight: float

class PredictionResponse(BaseModel):
    rf_prediction: float
    xgb_prediction: float
    average_prediction: float
    confidence: float
    factors: list[FactorItem]

# ─── Feature importance fallback weights ──────────────────────────────────────
FACTOR_WEIGHTS = {
    "Seasonality": 0.35,
    "Region Demand": 0.20,
    "Category Trend": 0.25,
    "Quantity Effect": 0.12,
    "Discount Impact": 0.08,
}

def _build_factors(rf, xgb, features_arr, request: PredictionRequest) -> list[FactorItem]:
    """Build SHAP-like factor explanations from feature importances."""
    factors = []
    try:
        # Average feature importances between RF and XGB
        fi = (rf.feature_importances_ + xgb.feature_importances_) / 2
        names = ["Region", "Category", "Quantity", "Discount", "Month", "Day", "DayOfWeek"]
        total = fi.sum()
        for n, w in zip(names, fi):
            factors.append(FactorItem(name=n, weight=round(float(w / total), 3)))
        factors.sort(key=lambda x: x.weight, reverse=True)
        return factors[:5]
    except Exception:
        # Fallback: rule-based explanations
        season_boost = 1.3 if request.month in [10, 11, 12] else 1.0
        return [
            FactorItem(name=f"Seasonality ({'Q4 Peak' if request.month in [10,11,12] else 'Normal'})", weight=round(0.35 * season_boost / (0.35 * season_boost + 0.65), 3)),
            FactorItem(name=f"Category — {request.category}", weight=0.25),
            FactorItem(name=f"Region — {request.region}", weight=0.20),
            FactorItem(name="Quantity Effect", weight=0.12),
            FactorItem(name="Discount Impact", weight=0.08),
        ]

# ─── Routes ───────────────────────────────────────────────────────────────────
@router.post("/predict-sales", response_model=PredictionResponse)
async def predict_sales(request: PredictionRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    global rf_model, xgb_model, le_region, le_cat
    
    # Attempt to load models if not already loaded
    if rf_model is None:
        rf_model, xgb_model, le_region, le_cat = _load_models()

    if rf_model is None or xgb_model is None:
        # Return a realistic mock prediction when models not trained yet
        price_map = {"Electronics": 500, "Furniture": 300, "Clothing": 50, "Groceries": 20, "Office Supplies": 15}
        base = price_map.get(request.category, 100)
        seasonality = 1.2 if request.month in [10, 11, 12] else 1.0
        mock_sales = round(base * request.quantity * (1 - request.discount) * seasonality, 2)
        mock_xgb = round(mock_sales * 1.03, 2)
        avg_pred = round((mock_sales + mock_xgb) / 2, 2)

        # Save mock prediction to history
        history = ForecastHistory(
            user_id=current_user.id,
            input_data=json.dumps(request.dict()),
            prediction_result=avg_pred,
            confidence_score=0.78,
            model_version="Demo-Heuristic"
        )
        db.add(history)
        db.commit()

        return PredictionResponse(
            rf_prediction=mock_sales,
            xgb_prediction=mock_xgb,
            average_prediction=avg_pred,
            confidence=0.78,
            factors=[
                FactorItem(name=f"Seasonality ({'Q4 Peak' if request.month in [10,11,12] else 'Normal'})", weight=0.35),
                FactorItem(name=f"Category — {request.category}", weight=0.25),
                FactorItem(name=f"Region — {request.region}", weight=0.20),
                FactorItem(name="Quantity Effect", weight=0.12),
                FactorItem(name="Discount Impact", weight=0.08),
            ]
        )

    try:
        region_enc = le_region.transform([request.region])[0]
        cat_enc    = le_cat.transform([request.category])[0]

        features = np.array([[
            region_enc, cat_enc,
            request.quantity, request.discount,
            request.month, request.day, request.day_of_week
        ]])

        rf_pred  = float(rf_model.predict(features)[0])
        xgb_pred = float(xgb_model.predict(features)[0])
        avg_pred = (rf_pred + xgb_pred) / 2

        # Confidence: based on agreement between models
        diff_ratio = abs(rf_pred - xgb_pred) / max(avg_pred, 1)
        confidence = round(max(0.6, 1.0 - diff_ratio), 2)

        factors = _build_factors(rf_model, xgb_model, features, request)
        
        # Save to history
        history = ForecastHistory(
            user_id=current_user.id,
            input_data=json.dumps(request.dict()),
            prediction_result=round(avg_pred, 2),
            confidence_score=confidence,
            model_version="Ensemble-v1.0"
        )
        db.add(history)
        db.commit()

        return PredictionResponse(
            rf_prediction=round(rf_pred, 2),
            xgb_prediction=round(xgb_pred, 2),
            average_prediction=round(avg_pred, 2),
            confidence=confidence,
            factors=factors,
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/history")
async def get_forecast_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Fetch the authenticated user's prediction history."""
    history = db.query(ForecastHistory).filter(ForecastHistory.user_id == current_user.id).order_by(ForecastHistory.created_at.desc()).all()
    return [
        {
            "id": h.id,
            "inputs": json.loads(h.input_data),
            "prediction": h.prediction_result,
            "confidence": h.confidence_score,
            "date": h.created_at,
            "model": h.model_version
        } for h in history
    ]

@router.delete("/history/{forecast_id}")
async def delete_forecast(forecast_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Delete a specific prediction from history."""
    forecast = db.query(ForecastHistory).filter(ForecastHistory.id == forecast_id, ForecastHistory.user_id == current_user.id).first()
    if not forecast:
        raise HTTPException(status_code=404, detail="Forecast not found")
    
    db.delete(forecast)
    db.commit()
    return {"message": "Forecast deleted successfully"}

@router.get("/model-status")
async def model_status():
    loaded = rf_model is not None and xgb_model is not None
    return {
        "models_loaded": loaded,
        "rf_available": rf_model is not None,
        "xgb_available": xgb_model is not None,
        "status": "ready" if loaded else "demo_mode"
    }
