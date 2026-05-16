from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.schemas import Notification
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class NotificationSchema(BaseModel):
    id: int
    message: str
    type: str
    is_read: int
    title: Optional[str] = None
    priority: Optional[str] = "medium"
    created_at: datetime

    class Config:
        from_attributes = True

@router.get("/", response_model=List[NotificationSchema])
async def get_notifications(db: Session = Depends(get_db)):
    return db.query(Notification).order_by(Notification.created_at.desc()).limit(50).all()

@router.post("/{notification_id}/read")
async def mark_as_read(notification_id: int, db: Session = Depends(get_db)):
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if notif:
        notif.is_read = 1
        db.commit()
    return {"status": "ok"}

@router.post("/mark-all-read")
async def mark_all_read(db: Session = Depends(get_db)):
    db.query(Notification).filter(Notification.is_read == 0).update({"is_read": 1})
    db.commit()
    return {"status": "ok"}

@router.delete("/{notification_id}")
async def delete_notification(notification_id: int, db: Session = Depends(get_db)):
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if notif:
        db.delete(notif)
        db.commit()
    return {"status": "deleted"}
