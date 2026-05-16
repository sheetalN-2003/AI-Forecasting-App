from sqlalchemy import Column, Integer, String, Float, DateTime, Enum as SQLEnum, func, Boolean, Text, Index, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
import enum
from datetime import datetime

Base = declarative_base()

class UserRole(str, enum.Enum):
    ADMIN = "Admin"
    ANALYST = "Analyst"
    MANAGER = "Manager"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default=UserRole.MANAGER, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    verification_token = Column(String, nullable=True)
    
    # 2FA Fields
    two_factor_enabled = Column(Boolean, default=False, nullable=False)
    two_factor_secret = Column(String, nullable=True)

    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime, nullable=True)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

class LoginSession(Base):
    __tablename__ = "login_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    location = Column(String, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=True)
    action = Column(String, nullable=False)
    resource = Column(String, nullable=False)
    resource_id = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(Text, nullable=True)
    details = Column(Text, nullable=True)  # JSON string
    created_at = Column(DateTime, default=func.now(), nullable=False, index=True)

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=True)
    title = Column(String, nullable=True, default="System Alert")  # Optional - not all sources provide a title
    message = Column(Text, nullable=False)
    type = Column(String, nullable=False, default='info')  # 'info', 'alert', 'success', 'warning'
    priority = Column(String, default='medium', nullable=False)  # 'low', 'medium', 'high', 'critical'
    is_read = Column(Integer, default=0, nullable=False)  # 0=unread, 1=read (integer for compat)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False, index=True)

class SaleRecord(Base):
    __tablename__ = "sales"
    
    id = Column(Integer, primary_key=True, index=True)
    order_date = Column(DateTime, nullable=False, index=True)
    region = Column(String, nullable=False, index=True)
    category = Column(String, nullable=False, index=True)
    product_name = Column(String, nullable=True)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=True)
    discount = Column(Float, nullable=False, default=0.0)
    sales = Column(Float, nullable=False)
    profit = Column(Float, nullable=False)
    customer_id = Column(String, nullable=True, index=True)
    sales_rep_id = Column(Integer, nullable=True, index=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    
    # Composite indexes for better query performance
    __table_args__ = (
        Index('idx_sales_date_category', 'order_date', 'category'),
        Index('idx_sales_region_date', 'region', 'order_date'),
        Index('idx_sales_performance', 'order_date', 'sales', 'profit'),
    )

class InventoryItem(Base):
    __tablename__ = "inventory"
    
    id = Column(Integer, primary_key=True, index=True)
    category = Column(String, nullable=False, index=True)
    product_name = Column(String, nullable=False)
    sku = Column(String, unique=True, nullable=False, index=True)
    current_stock = Column(Integer, nullable=False, default=0)
    reserved_stock = Column(Integer, nullable=False, default=0)
    reorder_point = Column(Integer, nullable=False, default=0)
    max_stock = Column(Integer, nullable=False, default=1000)
    unit_cost = Column(Float, nullable=False)
    supplier = Column(String, nullable=True)
    last_restocked = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

class MLModel(Base):
    __tablename__ = "ml_models"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    version = Column(String, nullable=False)
    model_type = Column(String, nullable=False)  # 'forecasting', 'classification', etc.
    file_path = Column(String, nullable=False)
    metrics = Column(Text, nullable=True)  # JSON string with model metrics
    is_active = Column(Boolean, default=False, nullable=False)
    training_data_size = Column(Integer, nullable=True)
    features = Column(Text, nullable=True)  # JSON string with feature list
    created_at = Column(DateTime, default=func.now(), nullable=False)
    
    __table_args__ = (
        Index('idx_model_active', 'model_type', 'is_active'),
    )

class SystemMetric(Base):
    __tablename__ = "system_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    metric_name = Column(String, nullable=False, index=True)
    metric_value = Column(Float, nullable=False)
    metric_unit = Column(String, nullable=True)
    tags = Column(Text, nullable=True)  # JSON string with additional tags
    timestamp = Column(DateTime, default=func.now(), nullable=False, index=True)
    
    __table_args__ = (
        Index('idx_metrics_name_time', 'metric_name', 'timestamp'),
    )

class ForecastHistory(Base):
    __tablename__ = "forecast_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    input_data = Column(Text, nullable=False)  # JSON string of inputs
    prediction_result = Column(Float, nullable=False)
    confidence_score = Column(Float, nullable=True)
    model_version = Column(String, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
