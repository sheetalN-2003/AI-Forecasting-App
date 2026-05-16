from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
import pandas as pd
import numpy as np
import io
import os
import joblib

from app.core.database import get_db, engine
from app.models.schemas import SaleRecord
from app.ml.trainer import train_models

router = APIRouter()

@router.post("/upload-training-data")
async def upload_training_data(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed.")
        
    try:
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        
        # Required columns mapping check (Case-insensitive)
        required_cols = {'order_date', 'region', 'category', 'quantity', 'discount', 'sales', 'profit'}
        df.columns = [c.lower() for c in df.columns]
        if not required_cols.issubset(set(df.columns)):
            raise HTTPException(status_code=400, detail=f"CSV must contain columns: {list(required_cols)}")
            
        # Clear existing data optionally or just append
        db.query(SaleRecord).delete()
        
        df['order_date'] = pd.to_datetime(df['order_date'])
        
        records = []
        for _, row in df.iterrows():
            record = SaleRecord(
                order_date=row['order_date'],
                region=str(row['region']),
                category=str(row['category']),
                quantity=int(row['quantity']),
                discount=float(row['discount']),
                sales=float(row['sales']),
                profit=float(row['profit'])
            )
            records.append(record)
            
        # Chunk the inserts
        chunk_size = 1000
        for i in range(0, len(records), chunk_size):
            db.bulk_save_objects(records[i:i + chunk_size])
            
        db.commit()
        
        # Save a copy of the CSV for the trainer
        data_path = os.path.join(os.path.dirname(__file__), "..", "ml", "synthetic_retail_data.csv")
        df.to_csv(data_path, index=False)
        
        # Trigger background retraining
        background_tasks.add_task(train_models)
        
        return {"message": f"Successfully loaded {len(records)} records. Models are retraining in the background."}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/batch-predict")
async def batch_predict(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed.")
        
    try:
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        
        required_cols = {'region', 'category', 'quantity', 'discount', 'month', 'day', 'dayofweek'}
        df.columns = [c.lower() for c in df.columns]
        if not required_cols.issubset(set(df.columns)):
            raise HTTPException(status_code=400, detail=f"For bulk prediction, CSV must contain: {list(required_cols)}")
            
        # Load models
        MODELS_PATH = os.path.join(os.path.dirname(__file__), "..", "ml", "models")
        rf = joblib.load(os.path.join(MODELS_PATH, "rf_sales_model.pkl"))
        xgb = joblib.load(os.path.join(MODELS_PATH, "xgb_sales_model.pkl"))
        le_region = joblib.load(os.path.join(MODELS_PATH, "le_region.pkl"))
        le_cat = joblib.load(os.path.join(MODELS_PATH, "le_cat.pkl"))
        
        predictions = []
        for _, row in df.iterrows():
            try:
                region_enc = le_region.transform([str(row['region'])])[0]
                cat_enc = le_cat.transform([str(row['category'])])[0]
                
                features = np.array([[
                    region_enc, cat_enc,
                    int(row['quantity']), float(row['discount']),
                    int(row['month']), int(row['day']), int(row['dayofweek'])
                ]])
                
                rf_pred = float(rf.predict(features)[0])
                xgb_pred = float(xgb.predict(features)[0])
                avg_pred = round((rf_pred + xgb_pred) / 2, 2)
                predictions.append(avg_pred)
            except Exception as item_e:
                predictions.append(None)
                
        df['Predicted_Sales'] = predictions
        
        # Return CSV
        output = io.StringIO()
        df.to_csv(output, index=False)
        
        from fastapi.responses import StreamingResponse
        response = StreamingResponse(iter([output.getvalue()]), media_type="text/csv")
        response.headers["Content-Disposition"] = "attachment; filename=forecast_results.csv"
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
