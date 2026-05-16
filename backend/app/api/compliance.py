from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Dict, Any
from app.core.database import get_db
from app.core.security import get_current_user, TokenData, require_permission, log_audit
from app.models.schemas import User, AuditLog
import json

router = APIRouter()

@router.get("/export-data", tags=["Compliance"])
@require_permission("compliance.export")
async def export_user_data(
    request: Request,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """GDPR: Export all data associated with the user"""
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Collect all user data (audit logs, profile, etc.)
    logs = db.query(AuditLog).filter(AuditLog.user_id == user.id).all()
    
    data = {
        "profile": {
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "created_at": user.created_at.isoformat()
        },
        "audit_logs": [
            {
                "action": log.action,
                "resource": log.resource,
                "timestamp": log.created_at.isoformat()
            } for log in logs
        ]
    }
    
    log_audit("data_export", "user_data", user_id=user.id, details={"format": "json"}, request=request)
    return data

@router.delete("/delete-account", tags=["Compliance"])
async def request_data_deletion(
    request: Request,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """GDPR: Right to be forgotten - request account deletion"""
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # In a real production app, we might mark for deletion or anonymize
    # For this demo, we'll log the request
    log_audit(
        "deletion_request", 
        "account", 
        user_id=user.id, 
        details={"reason": "GDPR Right to be Forgotten"},
        request=request
    )
    
    return {"message": "Deletion request received and will be processed within 30 days."}
