from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import os

from app.core.database import get_db
from app.models.schemas import User

import bcrypt
if not hasattr(bcrypt, "__about__"):
    bcrypt.__about__ = type('about', (object,), {'__version__': bcrypt.__version__})

router = APIRouter()

# ─── Security Config ──────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY", "retailgpt-super-secret-key-change-in-prod")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

import bcrypt

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# ─── Pydantic Schemas ─────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    name: str
    username: str
    email: EmailStr
    password: str
    role: str = "User"
    department: Optional[str] = None
    organization: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    name: Optional[str]
    username: str
    email: str
    role: str
    department: Optional[str] = None
    organization: Optional[str] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    user: UserResponse
    expires: str = "24h"

class RegisterInitRequest(BaseModel):
    name: str
    username: str
    email: EmailStr
    password: str
    role: str

class VerifyRegistrationRequest(BaseModel):
    email: EmailStr
    otp: str
    registration_data: RegisterInitRequest

import hashlib

# ─── Helpers ──────────────────────────────────────────────────────────────────
def verify_password(plain: str, hashed: str) -> bool:
    try:
        # Use SHA256 first to handle any password length
        pwd_hash = hashlib.sha256(plain.encode('utf-8')).hexdigest()
        return bcrypt.checkpw(pwd_hash.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False

def hash_password(password: str) -> str:
    # Use SHA256 first to avoid bcrypt 72-byte limit
    pwd_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()
    return bcrypt.hashpw(pwd_hash.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_verification_email(email: str, token: str):
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASSWORD")
    mail_from = os.getenv("MAIL_FROM")

    if not all([smtp_host, smtp_user, smtp_pass, mail_from]):
        print(f"DEBUG: SMTP not fully configured. Would send verification to {email} with token {token}")
        return

    try:
        msg = MIMEMultipart()
        msg['From'] = mail_from
        msg['To'] = email
        msg['Subject'] = "Verify your RetailPulse AI Account"

        body = f"Please verify your account by clicking the link: http://localhost:5173/verify?token={token}\n\nIf you did not request this, please ignore."
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()
        print(f"Successfully sent verification email to {email}")
    except Exception as e:
        print(f"Failed to send email to {email}: {e}")


import re
import secrets
from passlib.context import CryptContext

# ─── Strong Password Logic ───────────────────────────────────────────────────
def is_password_strong(password: str) -> bool:
    """Enterprise-grade password requirements"""
    if len(password) < 12: return False
    if not re.search("[a-z]", password): return False
    if not re.search("[A-Z]", password): return False
    if not re.search("[0-9]", password): return False
    if not re.search("[!@#$%^&*(),.?\":{}|<>]", password): return False
    return True

# ─── Verification & Reset Tokens (Simulated Store) ──────────────────────────
# In production, use Redis or DB with TTL
verification_db = {}
reset_db = {}

# ─── Request Body Models ──────────────────────────────────────────────────────
class EmailOnlyRequest(BaseModel):
    email: str

class VerifyCodeRequest(BaseModel):
    email: str
    code: str

class GoogleLoginRequest(BaseModel):
    token: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class TwoFARequest(BaseModel):
    username: str
    code: str

class UserCreateAdmin(BaseModel):
    username: str
    email: str
    role: str

class ReportErrorRequest(BaseModel):
    error_msg: str
    user_email: str = None

# ─── Routes ───────────────────────────────────────────────────────────────────

from app.models.schemas import OTPVerification

@router.post("/register-init")
def register_init(req: RegisterInitRequest, db: Session = Depends(get_db)):
    """FLOW 1: Step 1 - Validate details and send OTP"""
    if not is_password_strong(req.password):
        raise HTTPException(status_code=400, detail="Password too weak (12+ chars, uppercase, number, symbol required)")
    
    # Check if user exists
    if db.query(User).filter((User.username == req.username) | (User.email == req.email)).first():
        raise HTTPException(status_code=400, detail="Username or email already registered")
    
    # Generate OTP
    otp_code = str(secrets.randbelow(899999) + 100000)
    expiry = datetime.utcnow() + timedelta(minutes=10)
    
    # Save to otp_verification table
    otp_entry = OTPVerification(email=req.email, otp=otp_code, expires_at=expiry)
    db.add(otp_entry)
    db.commit()
    
    # Send email (Mocked)
    print(f"📧 REGISTRATION OTP FOR {req.email}: {otp_code}")
    return {"message": "Verification code sent to your email", "code": otp_code}

@router.post("/verify-registration", response_model=Token)
def verify_registration(req: VerifyRegistrationRequest, db: Session = Depends(get_db)):
    """FLOW 1: Step 2 - Verify OTP and Create Account"""
    otp_record = db.query(OTPVerification).filter(
        OTPVerification.email == req.email,
        OTPVerification.otp == req.otp,
        OTPVerification.expires_at > datetime.utcnow(),
        OTPVerification.verified == False
    ).first()
    
    if not otp_record:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")
    
    otp_record.verified = True
    
    # Create the user
    new_user = User(
        name=req.registration_data.name,
        username=req.registration_data.username,
        email=req.registration_data.email,
        hashed_password=hash_password(req.registration_data.password),
        role=req.registration_data.role,
        is_verified=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    access_token = create_access_token({"sub": new_user.username})
    refresh_token = create_refresh_token({"sub": new_user.username})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": new_user,
        "expires": "24h"
    }

@router.post("/refresh", response_model=Token)
def refresh_token(refresh_token: str, db: Session = Depends(get_db)):
    """FLOW 3: Token Refresh"""
    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        username = payload.get("sub")
        user = db.query(User).filter(User.username == username).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        new_access = create_access_token({"sub": username})
        return {
            "access_token": new_access,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": user
        }
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

@router.post("/google-login")
def google_login(req: GoogleLoginRequest, db: Session = Depends(get_db)):
    """Google Sign-in stub — returns first analyst for demo"""
    print(f"📡 Processing Google Sign-in")
    user = db.query(User).filter(User.role == "Analyst").first()
    if not user:
        # Fall back to first user of any kind
        user = db.query(User).first()
    if not user:
        raise HTTPException(status_code=404, detail="No user account found. Please register first.")
    access_token = create_access_token({"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        return {"message": "If the email exists, a reset link has been sent"}
    reset_token = secrets.token_urlsafe(32)
    reset_db[reset_token] = req.email
    reset_link = f"http://localhost:5173/reset-password?token={reset_token}"
    print(f"📧 PASSWORD RESET LINK FOR {req.email}: {reset_link}")
    # Send real email if SMTP configured
    send_verification_email(req.email, f"Reset your password: {reset_link}")
    return {"message": "Reset link sent to your email", "debug_token": reset_token}

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    if not is_password_strong(req.new_password):
        raise HTTPException(status_code=400, detail="Password too weak. Use 12+ chars with uppercase, numbers, and symbols.")
    email = reset_db.get(req.token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.hashed_password = hash_password(req.new_password)
    db.commit()
    del reset_db[req.token]
    return {"message": "Password reset successful. You can now log in."}

@router.post("/admin/create-user")
def admin_create_user(req: UserCreateAdmin, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Admin-only: Create a new user with a generated temporary password"""
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Only admins can create users")
    
    # Check if user exists
    if db.query(User).filter((User.username == req.username) | (User.email == req.email)).first():
        raise HTTPException(status_code=400, detail="Username or email already registered")
    
    temp_pass = secrets.token_urlsafe(12)
    new_user = User(
        username=req.username,
        email=req.email,
        role=req.role,
        hashed_password=hash_password(temp_pass),
        is_verified=True # Admin created users are pre-verified
    )
    db.add(new_user)
    db.commit()
    
    print(f"👤 ADMIN CREATED USER: {req.username} | TEMP PASS: {temp_pass}")
    return {"message": f"User {req.username} created successfully", "temp_password": temp_pass}

@router.post("/admin/report-error")
def report_error(req: ReportErrorRequest):
    """Allow frontend to report crashes to admin"""
    print(f"🚨 CRITICAL APP ERROR: {req.error_msg}")
    if req.user_email:
        print(f"   Affected User: {req.user_email}")
    return {"message": "Error reported"}

@router.post("/register", response_model=Token, status_code=201)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    if not is_password_strong(user_data.password):
        raise HTTPException(status_code=400, detail="Password too weak. Must be 12+ chars with uppercase, numbers, and symbols.")
    
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(status_code=400, detail="Username already registered")
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        role=user_data.role,
        department=user_data.department,
        organization=user_data.organization,
        is_verified=True # Assuming verified by pre-signup step
    )
    db.add(new_user)
    db.commit()   
    db.refresh(new_user)

    access_token = create_access_token({"sub": new_user.username})
    return {"access_token": access_token, "token_type": "bearer", "user": new_user}

from app.models.schemas import User, LoginSession

@router.post("/2fa/enable")
def enable_2fa(enabled: bool, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    current_user.two_factor_enabled = enabled
    if enabled:
        current_user.two_factor_secret = secrets.token_hex(16)
    db.commit()
    return {"status": "ok", "two_factor_enabled": enabled}

@router.post("/2fa/verify-login")
def verify_2fa_login(req: TwoFARequest, db: Session = Depends(get_db)):
    """Second step of 2FA login"""
    user = db.query(User).filter(User.username == req.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # In production, verify against pyotp. For demo, accept code from verification_db or fixed
    stored_code = verification_db.get(f"2fa_{req.username}")
    if stored_code and stored_code == req.code:
        del verification_db[f"2fa_{req.username}"]
    elif req.code != "123456":  # Fallback demo code
        raise HTTPException(status_code=400, detail="Invalid 2FA code")
    token = create_access_token({"sub": user.username})
    return {"access_token": token, "token_type": "bearer", "user": user}

@router.get("/sessions")
def get_login_sessions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(LoginSession).filter(LoginSession.user_id == current_user.id).order_by(LoginSession.created_at.desc()).limit(10).all()

@router.post("/login", response_model=Token)
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    
    # Security Event System: Track Failed Logins
    if not user or not verify_password(form_data.password, user.hashed_password):
        if user:
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= 5:
                # Alert Admin about potential brute force
                from app.models.schemas import Notification
                alert = Notification(
                    title="Security Alert: Failed Logins",
                    message=f"Account {user.username} has 5+ failed login attempts. Potential brute force.",
                    type="warning",
                    priority="high"
                )
                db.add(alert)
            db.commit()
            
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    
    # Reset failed attempts on success
    user.failed_login_attempts = 0
    
    # Check for 2FA
    if user.two_factor_enabled:
        # Simulate sending a code
        print(f"📧 2FA CODE SENT TO {user.email}: 123456 (Simulated)")
        return {
            "access_token": "PENDING_2FA", 
            "token_type": "bearer", 
            "user": {
                "username": user.username,
                "role": user.role,
                "two_factor_required": True
            }
        }

    # Record Session (Monitoring Philosophy)
    ip = request.client.host if request.client else "127.0.0.1"
    ua = request.headers.get("user-agent", "Unknown")
    
    # Mock Location Mapping
    locations = ["New York, US", "London, UK", "Tokyo, JP", "Mumbai, IN", "Berlin, DE"]
    loc = locations[hash(ip) % len(locations)]
    
    from app.models.schemas import LoginSession
    new_session = LoginSession(
        user_id=user.id,
        ip_address=ip,
        user_agent=ua,
        location=loc,
        status="active"
    )
    db.add(new_session)
    user.last_login = datetime.utcnow()
    db.commit()

    access_token = create_access_token({"sub": user.username})
    refresh_token = create_refresh_token({"sub": user.username})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user,
        "expires": "24h"
    }

@router.get("/active-sessions")
def get_active_sessions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """FLOW 5: Session Monitoring"""
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return db.query(LoginSession).filter(LoginSession.status == "active").order_by(LoginSession.login_time.desc()).all()

@router.post("/logout")
def logout(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """End all active sessions for user"""
    db.query(LoginSession).filter(LoginSession.user_id == current_user.id, LoginSession.status == "active").update({"status": "logged_out"})
    db.commit()
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=UserResponse)
def read_me(current_user: User = Depends(get_current_user)):
    return current_user
