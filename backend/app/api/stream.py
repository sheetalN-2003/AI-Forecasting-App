import asyncio
import json
import random
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()

# Store active connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[WebSocket, dict] = {}

    async def connect(self, websocket: WebSocket, user_info: dict = None):
        await websocket.accept()
        self.active_connections[websocket] = user_info or {"username": "Anonymous", "role": "Viewer"}
        await self.broadcast_presence()

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            del self.active_connections[websocket]
        asyncio.create_task(self.broadcast_presence())

    async def broadcast_presence(self):
        users = [info for info in self.active_connections.values()]
        # Filter unique users by username to avoid duplicates from multiple tabs
        unique_users = []
        seen = set()
        for u in users:
            if u['username'] not in seen:
                unique_users.append(u)
                seen.add(u['username'])
        
        await self.broadcast(json.dumps({
            "type": "PRESENCE_UPDATE",
            "data": unique_users
        }))

    async def broadcast(self, message: str):
        for connection in self.active_connections.keys():
            try:
                await connection.send_text(message)
            except:
                pass

manager = ConnectionManager()

# Mock regions and categories for data stream
REGIONS = ["North", "South", "East", "West", "Central"]
CATEGORIES = ["Electronics", "Furniture", "Clothing", "Groceries", "Office Supplies"]

async def generate_live_sales_stream():
    """Background task to simulate live sales coming in every 3-7 seconds."""
    from app.core.database import SessionLocal
    from app.models.schemas import SaleRecord, Notification
    from app.core.anomaly_detector import detect_sales_anomalies
    
    counter = 0
    while True:
        counter += 1
        await asyncio.sleep(random.uniform(3.0, 7.0))
        
        # Determine if we should spike (10% chance)
        is_spike = random.random() < 0.10
        
        region = random.choice(REGIONS)
        category = random.choice(CATEGORIES)
        qty = random.randint(1, 10) if not is_spike else random.randint(20, 50)
        
        base_price = {"Electronics": 600, "Furniture": 300, "Clothing": 50, "Groceries": 20, "Office Supplies": 30}[category]
        revenue = qty * base_price * random.uniform(0.9, 1.1)
        profit = revenue * random.uniform(0.1, 0.4)
        
        # PERSIST TO DB
        db = SessionLocal()
        try:
            new_sale = SaleRecord(
                order_date=datetime.now(),
                region=region,
                category=category,
                quantity=qty,
                discount=random.uniform(0, 0.2),
                sales=round(revenue, 2),
                profit=round(profit, 2)
            )
            db.add(new_sale)
            db.commit()
            db.refresh(new_sale)
            sale_id = new_sale.id
        except Exception as e:
            print(f"Error saving live sale: {e}")
            sale_id = f"sim-{(datetime.now().timestamp() * 1000):.0f}"
        finally:
            db.close()

        sale_event = {
            "type": "NEW_SALE",
            "data": {
                "id": sale_id,
                "region": region,
                "category": category,
                "quantity": qty,
                "sales": round(revenue, 2),
                "profit": round(profit, 2),
                "order_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
        }
        
        if is_spike:
            alert_msg = f"Demand Spike! {qty}x {category} sold in {region}."
            sale_event["alert"] = alert_msg
            
            # Dynamic Price Optimization Event
            price_event = {
                "type": "PRICE_OPTIMIZATION",
                "data": {
                    "category": category,
                    "region": region,
                    "current_demand": "CRITICAL_HIGH",
                    "suggested_increase": "+12.5%",
                    "action": "AUTO_ADJUST_PRICING",
                    "reason": f"Inventory velocity for {category} exceeds threshold in {region}"
                }
            }
            await manager.broadcast(json.dumps(price_event))
            
            # Simulated Email Notification Dispatch
            print(f"📧 DISPATCHING EMAIL: High-Priority Alert sent to regional manager for {region}")

            # PERSIST NOTIFICATION
            from app.models.schemas import Notification
            db = SessionLocal()
            try:
                new_notif = Notification(
                    title="Demand Spike Alert",
                    message=alert_msg,
                    type="alert",
                    priority="high",
                    is_read=0,
                    created_at=datetime.now()
                )
                db.add(new_notif)
                db.commit()
            except Exception as e:
                print(f"Error saving notification: {e}")
            finally:
                db.close()
            
        await manager.broadcast(json.dumps(sale_event))

        # --- ANOMALY DETECTION ENGINE (Phase 1.2) ---
        if counter % 5 == 0:
            db = SessionLocal()
            try:
                anomalies = detect_sales_anomalies(db)
                for anomaly in anomalies:
                    await manager.broadcast(json.dumps({
                        "type": "ANOMALY_DETECTED",
                        "data": anomaly
                    }))
                    # Save to DB
                    db.add(Notification(
                        title="AI Anomaly Detected",
                        message=anomaly['message'],
                        type="alert",
                        priority="high",
                        is_read=0,
                        created_at=datetime.now()
                    ))
                db.commit()
            except Exception as e:
                print(f"Anomaly detector error: {e}")
            finally:
                db.close()

@router.websocket("/ws/live-sales")
async def websocket_endpoint(websocket: WebSocket, username: str = "Anonymous", role: str = "Viewer"):
    await manager.connect(websocket, {"username": username, "role": role})
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
