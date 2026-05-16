import asyncio
import logging
from dotenv import load_dotenv

# Load .env file before anything else
load_dotenv()

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from app.api import auth, forecasting, analytics, data, stream, inventory, insights, notifications, admin, compliance, integrations
from app.core.database import engine, get_db
from app.core.logging import setup_logging
from app.models.schemas import Base
from sqlalchemy.sql import text

# Setup structured logging
setup_logging()
logger = logging.getLogger(__name__)

# Create all DB tables on startup
Base.metadata.create_all(bind=engine)

# Migration Guard: Ensure 'name' column exists for existing databases
try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN name VARCHAR"))
        conn.commit()
        logger.info("Database migration: Added 'name' column to users table")
except Exception:
    # Column likely already exists
    pass

app = FastAPI(
    title="RetailPulse AI API",
    description="Enterprise retail analytics & AI sales forecasting platform.",
    version="1.0.0",
)

# Initialize Prometheus Instrumentator
Instrumentator().instrument(app).expose(app)

@app.on_event("startup")
async def startup_event():
    # Start the live sales simulation in the background
    asyncio.create_task(stream.generate_live_sales_stream())
    logger.info("Application started and background tasks initialized")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
async def health_check(db=Depends(get_db)):
    """Enterprise health check endpoint"""
    health_status = {"status": "healthy", "components": {}}
    
    # Check Database
    try:
        db.execute(text("SELECT 1"))
        health_status["components"]["database"] = "up"
    except Exception as e:
        health_status["status"] = "degraded"
        health_status["components"]["database"] = f"down: {str(e)}"
        
    return health_status

@app.get("/", tags=["Health"])
async def root():
    return {"message": "Welcome to RetailPulse AI API", "status": "ok"}

# Mount routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(forecasting.router, prefix="/forecasting", tags=["Forecasting"])
app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
app.include_router(data.router, prefix="/data", tags=["Data Processing"])
app.include_router(inventory.router, prefix="/inventory", tags=["Inventory"])
app.include_router(insights.router, prefix="/insights", tags=["Insights"])
app.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])
app.include_router(compliance.router, prefix="/compliance", tags=["Compliance"])
app.include_router(integrations.router, prefix="/integrations", tags=["Integrations"])
app.include_router(stream.router, tags=["Real-time Stream"])
