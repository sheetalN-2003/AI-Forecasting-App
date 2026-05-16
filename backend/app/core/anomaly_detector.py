import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.schemas import SaleRecord
from datetime import datetime, timedelta

def detect_sales_anomalies(db: Session):
    """
    Scans recent sales data and returns anomalies based on 
    Standard Deviation (Z-Score > 2.5).
    """
    # 1. Get average sales per category for the last 30 days
    thirty_days_ago = datetime.now() - timedelta(days=30)
    
    stats = db.query(
        SaleRecord.category,
        func.avg(SaleRecord.sales).label('avg_sales'),
        func.stddev(SaleRecord.sales).label('std_dev')
    ).filter(SaleRecord.order_date >= thirty_days_ago)\
     .group_by(SaleRecord.category).all()
    
    anomalies = []
    
    for category, avg, std in stats:
        if not std or std == 0: continue
        
        # 2. Check the very latest sales for this category
        latest_sales = db.query(SaleRecord).filter(
            SaleRecord.category == category,
            SaleRecord.order_date >= datetime.now() - timedelta(hours=1)
        ).all()
        
        for sale in latest_sales:
            z_score = abs(sale.sales - avg) / std
            if z_score > 2.5:
                anomalies.append({
                    "id": f"ANOM-{sale.id}",
                    "type": "SPIKE" if sale.sales > avg else "DROP",
                    "category": category,
                    "value": sale.sales,
                    "expected": round(avg, 2),
                    "confidence": 0.92,
                    "message": f"Significant sales {('spike' if sale.sales > avg else 'drop')} detected in {category}. (${sale.sales} vs expected ${round(avg, 2)})",
                    "timestamp": sale.order_date.isoformat()
                })
                
    return anomalies
