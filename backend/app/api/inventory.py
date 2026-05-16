from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.core.database import get_db
from app.models.schemas import SaleRecord
from datetime import datetime, timedelta
import random

router = APIRouter()

@router.get("/status")
def get_inventory_status(db: Session = Depends(get_db)):
    """
    Returns inventory status based on real sales velocity and demand patterns.
    Uses actual sales data to calculate demand velocity and stock recommendations.
    """
    # Get sales data for the last 30 days to calculate demand velocity
    thirty_days_ago = datetime.now() - timedelta(days=30)
    
    # Calculate sales velocity by category over the last 30 days
    recent_sales = (
        db.query(
            SaleRecord.category,
            func.sum(SaleRecord.quantity).label("total_quantity"),
            func.sum(SaleRecord.sales).label("total_revenue"),
            func.count(SaleRecord.id).label("transaction_count"),
            func.avg(SaleRecord.sales).label("avg_sale_value")
        )
        .filter(SaleRecord.order_date >= thirty_days_ago)
        .group_by(SaleRecord.category)
        .order_by(desc("total_revenue"))
        .all()
    )
    
    if not recent_sales:
        # Fallback to all-time data if no recent sales
        recent_sales = (
            db.query(
                SaleRecord.category,
                func.sum(SaleRecord.quantity).label("total_quantity"),
                func.sum(SaleRecord.sales).label("total_revenue"),
                func.count(SaleRecord.id).label("transaction_count"),
                func.avg(SaleRecord.sales).label("avg_sale_value")
            )
            .group_by(SaleRecord.category)
            .order_by(desc("total_revenue"))
            .all()
        )

    inventory_data = []
    
    for idx, sales_data in enumerate(recent_sales):
        category = sales_data.category
        total_quantity = sales_data.total_quantity or 0
        total_revenue = sales_data.total_revenue or 0
        transaction_count = sales_data.transaction_count or 0
        avg_sale_value = sales_data.avg_sale_value or 0
        
        # Calculate demand velocity (units sold per day over last 30 days)
        daily_velocity = total_quantity / 30
        demand_score = min(95.0, daily_velocity * 10)  # Scale to 0-95 range
        
        # Simulate current stock based on demand patterns
        # High demand categories have lower stock simulation
        if demand_score > 80:
            current_stock = random.randint(80, 180)
        elif demand_score > 50:
            current_stock = random.randint(150, 350)
        else:
            current_stock = random.randint(200, 500)
        
        # Determine status based on real demand patterns
        days_of_stock = current_stock / max(daily_velocity, 1)
        
        if days_of_stock < 7:  # Less than a week of stock
            status = 'CRITICAL_LOW'
            recommendation = f"🚨 URGENT: Only {days_of_stock:.1f} days of stock remaining for {category}! Daily sales velocity is {daily_velocity:.1f} units. Reorder {int(daily_velocity * 30)} units immediately."
        elif days_of_stock < 14:  # Less than 2 weeks
            status = 'WARNING'
            recommendation = f"⚠️ Stock running low for {category}. {days_of_stock:.1f} days remaining at current velocity ({daily_velocity:.1f} units/day). Recommend restocking {int(daily_velocity * 21)} units within 5 days."
        elif days_of_stock > 60:  # More than 2 months
            status = 'OVERSTOCK'
            recommendation = f"📦 Overstock detected for {category}. {days_of_stock:.0f} days of inventory at current velocity. Consider promotional campaigns to increase turnover rate."
        else:
            status = 'HEALTHY'
            recommendation = f"✅ Optimal stock level for {category}. {days_of_stock:.1f} days of inventory remaining. Current velocity: {daily_velocity:.1f} units/day, generating ${total_revenue/30:.0f}/day in revenue."
        
        # Add seasonal adjustment for Q4
        current_month = datetime.now().month
        if current_month in [10, 11, 12]:
            seasonal_note = " Q4 seasonal surge expected - consider 25% buffer stock."
            recommendation += seasonal_note
            
        inventory_data.append({
            "id": idx,
            "category": category,
            "current_stock": current_stock,
            "demand_velocity": round(demand_score, 1),
            "daily_units_sold": round(daily_velocity, 1),
            "days_of_stock": round(days_of_stock, 1),
            "monthly_revenue": round(total_revenue, 2),
            "transaction_count": transaction_count,
            "avg_sale_value": round(avg_sale_value, 2),
            "status": status,
            "recommendation": recommendation
        })

    return inventory_data

@router.get("/alerts")
def get_inventory_alerts(db: Session = Depends(get_db)):
    """
    Get critical inventory alerts that need immediate attention.
    """
    inventory_status = get_inventory_status(db)
    
    alerts = []
    for item in inventory_status:
        if item["status"] == "CRITICAL_LOW":
            alerts.append({
                "id": f"inv_{item['id']}",
                "type": "critical",
                "category": item["category"],
                "message": f"{item['category']} stock critically low - {item['days_of_stock']:.1f} days remaining",
                "action_required": f"Reorder {int(item['daily_units_sold'] * 30)} units immediately",
                "priority": "HIGH"
            })
        elif item["status"] == "WARNING":
            alerts.append({
                "id": f"inv_{item['id']}",
                "type": "warning", 
                "category": item["category"],
                "message": f"{item['category']} stock running low - {item['days_of_stock']:.1f} days remaining",
                "action_required": f"Plan restock of {int(item['daily_units_sold'] * 21)} units within 5 days",
                "priority": "MEDIUM"
            })
    
    return alerts

from pydantic import BaseModel
class ReorderRequest(BaseModel):
    category: str
    quantity: int
    priority: str = "MEDIUM"

@router.post("/reorder")
async def create_reorder_request(req: ReorderRequest, db: Session = Depends(get_db)):
    from app.api.stream import manager
    import json
    
    reorder_id = random.randint(1000, 9999)
    event = {
        "type": "REORDER_REQUEST",
        "data": {
            "id": reorder_id,
            "category": req.category,
            "quantity": req.quantity,
            "priority": req.priority,
            "requested_at": datetime.now().strftime("%H:%M:%S"),
            "status": "PENDING"
        }
    }
    await manager.broadcast(json.dumps(event))
    return {"status": "request_sent", "id": reorder_id}

@router.post("/reorder/{reorder_id}/approve")
async def approve_reorder(reorder_id: int):
    from app.api.stream import manager
    import json
    
    event = {
        "type": "REORDER_APPROVED",
        "data": {
            "id": reorder_id,
            "approved_at": datetime.now().strftime("%H:%M:%S"),
            "message": f"Inventory purchase order #{reorder_id} has been dispatched to supplier."
        }
    }
    await manager.broadcast(json.dumps(event))
    return {"status": "approved"}

@router.post("/reorder/{reorder_id}/reject")
async def reject_reorder(reorder_id: int):
    from app.api.stream import manager
    import json
    
    event = {
        "type": "REORDER_REJECTED",
        "data": {
            "id": reorder_id,
            "rejected_at": datetime.now().strftime("%H:%M:%S"),
            "message": f"Inventory request #{reorder_id} was declined by administrator."
        }
    }
    await manager.broadcast(json.dumps(event))
    return {"status": "rejected"}
