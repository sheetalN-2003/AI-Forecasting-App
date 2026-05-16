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
    thirty_days_ago = datetime.now() - timedelta(days=30)
    
    # SQLite does not support func.stddev(), so we calculate it in Python
    recent_sales = db.query(SaleRecord.category, SaleRecord.sales)\
        .filter(SaleRecord.order_date >= thirty_days_ago).all()
        
    category_stats = {}
    for category, sales in recent_sales:
        if category not in category_stats:
            category_stats[category] = []
        category_stats[category].append(sales)
        
    anomalies = []
    
    for category, sales_list in category_stats.items():
        if len(sales_list) < 2: continue
        avg = np.mean(sales_list)
        std = np.std(sales_list)
        
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
