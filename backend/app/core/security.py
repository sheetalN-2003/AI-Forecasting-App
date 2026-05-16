"""
Enhanced security module with JWT, password hashing, and rate limiting.
"""
import os
import jwt
import bcrypt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, validator
import redis
import time
from functools import wraps
from app.core.config import settings

# Security Configuration from centralized settings
SECRET_KEY = settings.JWT_SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS = settings.REFRESH_TOKEN_EXPIRE_DAYS

# Redis for rate limiting and session management
redis_client = redis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    db=0,
    decode_responses=True
)

security = HTTPBearer()

class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[int] = None
    role: Optional[str] = None

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str = "Employee"
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v

class UserLogin(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: Dict[str, Any]

class PasswordHasher:
    """Secure password hashing using bcrypt"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using bcrypt"""
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    
    @staticmethod
    def verify_password(password: str, hashed: str) -> bool:
        """Verify a password against its hash"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

class JWTManager:
    """JWT token management with refresh tokens"""
    
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire, "type": "access"})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def create_refresh_token(data: dict) -> str:
        """Create JWT refresh token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode.update({"exp": expire, "type": "refresh"})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def verify_token(token: str, token_type: str = "access") -> Dict[str, Any]:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            if payload.get("type") != token_type:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token type"
                )
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials"
            )

class RateLimiter:
    """Redis-based rate limiting"""
    
    @staticmethod
    def is_rate_limited(key: str, limit: int, window: int) -> bool:
        """
        Check if a key is rate limited
        Args:
            key: Unique identifier (IP, user_id, etc.)
            limit: Maximum requests allowed
            window: Time window in seconds
        """
        try:
            current = redis_client.get(key)
            if current is None:
                redis_client.setex(key, window, 1)
                return False
            
            if int(current) >= limit:
                return True
            
            redis_client.incr(key)
            return False
        except Exception:
            # If Redis is down, allow the request
            return False
    
    @staticmethod
    def get_rate_limit_info(key: str) -> Dict[str, int]:
        """Get current rate limit status"""
        try:
            current = redis_client.get(key) or 0
            ttl = redis_client.ttl(key)
            return {"current": int(current), "ttl": ttl}
        except Exception:
            return {"current": 0, "ttl": 0}

def rate_limit(limit: int = 100, window: int = 3600):
    """
    Rate limiting decorator
    Args:
        limit: Maximum requests per window
        window: Time window in seconds (default: 1 hour)
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            # Use IP address as the key
            client_ip = request.client.host
            key = f"rate_limit:{client_ip}"
            
            if RateLimiter.is_rate_limited(key, limit, window):
                rate_info = RateLimiter.get_rate_limit_info(key)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded. Try again in {rate_info['ttl']} seconds",
                    headers={"Retry-After": str(rate_info['ttl'])}
                )
            
            return await func(request, *args, **kwargs)
        return wrapper
    return decorator

# Permissions Mapping
PERMISSIONS = {
    "Admin": ["*"],
    "Analyst": [
        "forecasting.view", 
        "forecasting.create", 
        "analytics.view", 
        "data.view", 
        "inventory.view",
        "insights.view"
    ],
    "Employee": [
        "analytics.view", 
        "inventory.view", 
        "notifications.view"
    ]
}

def has_permission(user_role: str, required_permission: str) -> bool:
    """Check if a role has a specific permission"""
    if user_role not in PERMISSIONS:
        return False
    
    role_permissions = PERMISSIONS[user_role]
    if "*" in role_permissions:
        return True
    
    return required_permission in role_permissions

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated user from JWT token"""
    token = credentials.credentials
    payload = JWTManager.verify_token(token)
    
    username = payload.get("sub")
    user_id = payload.get("user_id")
    role = payload.get("role")
    
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    
    return TokenData(username=username, user_id=user_id, role=role)

def require_permission(required_permission: str):
    """Decorator to require specific permission"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = None
            for arg in kwargs.values():
                if isinstance(arg, TokenData):
                    current_user = arg
                    break
            
            if not current_user:
                 # Try to find in args if not in kwargs
                for arg in args:
                    if isinstance(arg, TokenData):
                        current_user = arg
                        break

            if not current_user or not has_permission(current_user.role, required_permission):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied. Missing permission: {required_permission}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

from app.models.schemas import AuditLog
from app.core.database import SessionLocal
import json

def log_audit(action: str, resource: str, user_id: int = None, resource_id: str = None, details: dict = None, request: Request = None):
    """Helper to log security and administrative actions"""
    db = SessionLocal()
    try:
        audit = AuditLog(
            user_id=user_id,
            action=action,
            resource=resource,
            resource_id=resource_id,
            ip_address=request.client.host if request else None,
            user_agent=request.headers.get("user-agent") if request else None,
            details=json.dumps(details) if details else None
        )
        db.add(audit)
        db.commit()
    except Exception as e:
        print(f"Failed to log audit: {e}")
    finally:
        db.close()

def require_role(required_role: str):
    """Decorator to require specific role (Legacy - prefer require_permission)"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = None
            for arg in kwargs.values():
                if isinstance(arg, TokenData):
                    current_user = arg
                    break
            
            if not current_user or current_user.role != required_role:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied. Required role: {required_role}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

class SecurityHeaders:
    """Security headers middleware"""
    
    @staticmethod
    def add_security_headers(response):
        """Add security headers to response"""
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

# Input validation schemas
class PaginationParams(BaseModel):
    page: int = 1
    limit: int = 10
    
    @validator('page')
    def validate_page(cls, v):
        if v < 1:
            raise ValueError('Page must be >= 1')
        return v
    
    @validator('limit')
    def validate_limit(cls, v):
        if v < 1 or v > 100:
            raise ValueError('Limit must be between 1 and 100')
        return v

class DateRangeParams(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    
    @validator('end_date')
    def validate_date_range(cls, v, values):
        if v and values.get('start_date') and v < values['start_date']:
            raise ValueError('End date must be after start date')
        return v