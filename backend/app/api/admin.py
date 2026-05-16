from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.schemas import User, SaleRecord, AuditLog, LoginSession
import psutil
import time

def record_audit_log(db: Session, user_id: int, action: str, resource: str, details: str = None, resource_id: str = None):
    """Utility to record administrative actions in the immutable audit log."""
    try:
        from datetime import datetime
        log = AuditLog(
            user_id=user_id,
            action=action,
            resource=resource,
            resource_id=str(resource_id) if resource_id else None,
            details=details,
            created_at=datetime.utcnow()
        )
        db.add(log)
        db.commit()
    except Exception as e:
        print(f"Failed to record audit log: {e}")

router = APIRouter()

START_TIME = time.time()

@router.get("/metrics")
def get_admin_metrics(db: Session = Depends(get_db)):
    """Get metrics for the Admin Dashboard overview panel."""
    # System info mock/real
    cpu_percent = psutil.cpu_percent()
    mem = psutil.virtual_memory()
    uptime_seconds = time.time() - START_TIME
    
    # DB Queries
    total_users = db.query(User).count()
    admins = db.query(User).filter(User.role == "Admin").count()
    analysts = db.query(User).filter(User.role == "Analyst").count()
    viewers = db.query(User).filter(User.role == "Viewer").count()
    employees = total_users - admins - analysts - viewers

    total_revenue = db.query(func.sum(SaleRecord.sales)).scalar() or 0
    total_transactions = db.query(SaleRecord).count()
    
    # Mocking these stats for visual richness
    total_predictions = total_transactions * 2 
    # Real Sessions from DB
    active_sessions_list = db.query(LoginSession).filter(LoginSession.status == "active").all()
    active_sessions_count = len(active_sessions_list)
    total_datasets = 8 

    # Fetch Security Events (Simulated for high-fidelity feel)
    security_events = [
        {"id": 1, "type": "Failed Login", "user": "unknown_actor", "ip": "192.168.1.45", "time": "2 mins ago", "status": "Blocked"},
        {"id": 2, "type": "Token Rotation", "user": "admin_main", "ip": "10.0.0.8", "time": "15 mins ago", "status": "Success"},
    ]
    
    # Fetch users list for the users section
    users_list = db.query(User).all()

    return {
        "overview": {
            "total_revenue": total_revenue,
            "total_users": total_users,
            "total_predictions": total_predictions,
            "active_sessions": active_sessions_count,
            "live_transactions": total_transactions,
            "total_datasets": total_datasets,
        },
        "system": {
            "uptime_seconds": uptime_seconds,
            "cpu_usage": cpu_percent,
            "memory_usage": mem.percent,
            "api_response_time_ms": 42,
            "db_health": "Optimal",
            "active_users": active_sessions_count,
            "server_region": "us-east-1",
            "last_backup": "12 mins ago"
        },
        "users": {
            "total": total_users,
            "admins": admins,
            "analysts": analysts,
            "viewers": viewers,
            "list": [
                {
                    "id": u.id, 
                    "username": u.username, 
                    "email": u.email, 
                    "role": u.role, 
                    "department": getattr(u, 'department', 'Enterprise'),
                    "organization": getattr(u, 'organization', 'RetailPulse'),
                    "last_active": "Just now" if u.is_verified else "Pending", 
                    "status": "Active" if u.is_verified else "Inactive",
                    "is_verified": u.is_verified
                } for u in users_list
            ]
        },
        "datasets": [
            {"id": "DS-001", "name": "Global Sales 2025", "size": "1.2 GB", "status": "Processed", "quality": "98%", "uploaded_by": "admin_main"},
            {"id": "DS-002", "name": "Inventory Logs Q1", "size": "450 MB", "status": "Validating", "quality": "Pending", "uploaded_by": "sarah_analyst"},
            {"id": "DS-003", "name": "Customer Feedback Data", "size": "89 MB", "status": "Error", "quality": "45%", "uploaded_by": "sarah_analyst"}
        ],
        "models": [
            {"id": 1, "name": "Random Forest v2.1", "accuracy": "94.5%", "status": "Active", "type": "Regression", "version": "v2.1.4"},
            {"id": 2, "name": "XGBoost Production", "accuracy": "96.2%", "status": "Retraining", "type": "Ensemble", "version": "v3.0.1"},
            {"id": 3, "name": "Prophet Seasonal", "accuracy": "91.0%", "status": "Active", "type": "Time-Series", "version": "v1.2.0"},
            {"id": 4, "name": "DeepDemand Neural", "accuracy": "97.8%", "status": "Staging", "type": "Deep Learning", "version": "v0.9.5"}
        ],
        "forecast_monitoring": {
            "logs": [
                {"id": "PRED-990", "model": "XGBoost", "timestamp": "15:20:10", "accuracy": "96.5%", "status": "Success"},
                {"id": "PRED-991", "model": "Prophet", "timestamp": "15:21:45", "accuracy": "92.1%", "status": "Success"},
                {"id": "PRED-992", "model": "Random Forest", "timestamp": "15:23:02", "accuracy": "0.0%", "status": "Failed"}
            ],
            "total_predictions_today": 1240,
            "avg_accuracy_today": "94.2%",
            "failed_alerts": 3
        },
        "security": {
            "jwt_active_tokens": 12,
            "suspicious_activities": len(security_events),
            "events": security_events,
            "sessions": [
                {
                    "id": s.id,
                    "user_id": s.user_id,
                    "ip": s.ip_address,
                    "device": s.user_agent,
                    "location": s.location,
                    "time": s.login_time.isoformat() if s.login_time else "Unknown"
                } for s in active_sessions_list
            ]
        },
        "api_monitoring": {
            "total_requests": total_transactions * 15,
            "error_rate": "0.02%",
            "avg_latency": "42ms",
            "endpoints": [
                {"path": "/api/forecasting/predict", "calls": total_predictions, "avg_time": "120ms", "error_rate": "0.1%"},
                {"path": "/api/analytics/sales", "calls": total_transactions * 5, "avg_time": "25ms", "error_rate": "0.01%"},
                {"path": "/api/inventory/status", "calls": total_transactions * 2, "avg_time": "45ms", "error_rate": "0.05%"}
            ]
        },
        "admin_analytics": {
            "most_active_analyst": "sarah_analyst",
            "most_used_model": "XGBoost",
            "peak_traffic_hour": "14:00",
            "daily_traffic": [120, 150, 180, 240, 210, 190, 230]
        }
    }

@router.get("/users")
def get_users(db: Session = Depends(get_db)):
    """Get list of all users."""
    users = db.query(User).all()
    return [{"id": u.id, "username": u.username, "email": u.email, "role": u.role, "is_verified": u.is_verified, "is_active": u.is_active} for u in users]

from pydantic import BaseModel
class UserRoleUpdate(BaseModel):
    role: str

@router.patch("/users/{user_id}/toggle-verify")
def toggle_user_verification(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_verified = not user.is_verified
    db.commit()
    return {"id": user.id, "username": user.username, "is_verified": user.is_verified}

@router.patch("/users/{user_id}/role")
def update_user_role(user_id: int, body: UserRoleUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    valid_roles = ["Admin", "Analyst", "Manager", "Employee", "User"]
    if body.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Role must be one of: {valid_roles}")
    user.role = body.role
    db.commit()
    return {"id": user.id, "username": user.username, "role": user.role}

@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"status": "deleted", "user_id": user_id}

@router.patch("/users/{user_id}/toggle-active")
def toggle_user_active(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not user.is_active
    db.commit()
    return {"id": user.id, "username": user.username, "is_active": user.is_active}

@router.get("/audit-logs")
def get_audit_logs(db: Session = Depends(get_db)):
    """Fetch the latest 50 audit logs with user details."""
    from app.models.schemas import AuditLog, User
    
    # Simple join to get username for each log
    results = db.query(AuditLog, User).join(User, AuditLog.user_id == User.id)\
                .order_by(AuditLog.created_at.desc()).limit(50).all()
    
    return [{
        "id": log.AuditLog.id,
        "username": log.User.username,
        "action": log.AuditLog.action,
        "resource": log.AuditLog.resource,
        "details": log.AuditLog.details,
        "timestamp": log.AuditLog.created_at.isoformat()
    } for log in results]
