import pandas as pd
from app.core.database import SessionLocal, engine
from app.models.schemas import Base, SaleRecord
from datetime import datetime
import os

def seed_database():
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    # Check if data already exists
    if db.query(SaleRecord).count() > 0:
        print("Database already seeded.")
        db.close()
        return

    data_path = "c:/Users/sheet/Downloads/AI Forecasting App/backend/app/ml/synthetic_retail_data.csv"
    if not os.path.exists(data_path):
        print("Data not found. Run generator first.")
        return
        
    df = pd.read_csv(data_path)
    df['Order_Date'] = pd.to_datetime(df['Order_Date'])
    
    records = []
    for _, row in df.iterrows():
        record = SaleRecord(
            order_date=row['Order_Date'],
            region=row['Region'],
            category=row['Category'],
            quantity=row['Quantity'],
            discount=row['Discount'],
            sales=row['Sales'],
            profit=row['Profit']
        )
        records.append(record)
    
    # Bulk insert for efficiency
    db.bulk_save_objects(records)
    db.commit()
    db.close()
    print("Database seeded successfully with", len(records), "records.")

if __name__ == "__main__":
    seed_database()
