#!/usr/bin/env python3
"""
Data seeding script to populate the database with realistic retail data
for demonstration and testing purposes.
"""

import os
import sys
import random
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add the app directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.models.schemas import Base, SaleRecord, User, Notification
from app.core.database import SQLALCHEMY_DATABASE_URL
import hashlib

import bcrypt
if not hasattr(bcrypt, "__about__"):
    bcrypt.__about__ = type('about', (object,), {'__version__': bcrypt.__version__})

# Create engine and session
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

import bcrypt

def hash_password(password: str) -> str:
    """Hash password using SHA256 + Bcrypt to handle any length and avoid passlib bugs"""
    pwd_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()
    return bcrypt.hashpw(pwd_hash.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def seed_users():
    """Create demo users"""
    db = SessionLocal()
    try:
        # Clear existing users
        db.query(User).delete()
        
        users = [
            User(
                username="admin",
                email="admin@retailpulse.com",
                hashed_password=hash_password("Admin@123456!"),
                role="Admin",
                is_verified=1
            ),
            User(
                username="analyst",
                email="analyst@retailpulse.com", 
                hashed_password=hash_password("Analyst@123456!"),
                role="Analyst",
                is_verified=1
            ),
            User(
                username="manager",
                email="manager@retailpulse.com",
                hashed_password=hash_password("Manager@123456!"),
                role="Manager",
                is_verified=1
            )
        ]
        
        db.add_all(users)
        db.commit()
        print("✅ Seeded users: admin/admin123, analyst/analyst123, manager/manager123")
        
    except Exception as e:
        print(f"❌ Error seeding users: {e}")
        db.rollback()
    finally:
        db.close()

def seed_sales_data():
    """Generate realistic sales data for the past 12 months"""
    db = SessionLocal()
    try:
        # Clear existing sales data
        db.query(SaleRecord).delete()
        
        regions = ["North", "South", "East", "West", "Central"]
        categories = ["Electronics", "Furniture", "Clothing", "Groceries", "Office Supplies"]
        
        # Base prices for each category
        base_prices = {
            "Electronics": 450,
            "Furniture": 280,
            "Clothing": 45,
            "Groceries": 18,
            "Office Supplies": 25
        }
        
        # Generate data for the past 12 months
        start_date = datetime.now() - timedelta(days=365)
        records = []
        
        for day in range(365):
            current_date = start_date + timedelta(days=day)
            
            # Generate 5-25 transactions per day
            daily_transactions = random.randint(5, 25)
            
            # Q4 boost (October, November, December)
            if current_date.month in [10, 11, 12]:
                daily_transactions = int(daily_transactions * 1.4)
            
            for _ in range(daily_transactions):
                region = random.choice(regions)
                category = random.choice(categories)
                quantity = random.randint(1, 12)
                
                # Seasonal discount patterns
                if current_date.month in [11, 12]:  # Black Friday / Holiday season
                    discount = random.uniform(0.05, 0.35)
                elif current_date.month in [1, 2]:  # Post-holiday clearance
                    discount = random.uniform(0.10, 0.25)
                else:
                    discount = random.uniform(0.0, 0.15)
                
                # Calculate sales with some randomness
                base_price = base_prices[category]
                unit_price = base_price * random.uniform(0.8, 1.3)
                gross_sales = quantity * unit_price
                sales = gross_sales * (1 - discount)
                
                # Profit margin varies by category
                profit_margins = {
                    "Electronics": random.uniform(0.15, 0.35),
                    "Furniture": random.uniform(0.25, 0.45),
                    "Clothing": random.uniform(0.40, 0.65),
                    "Groceries": random.uniform(0.08, 0.18),
                    "Office Supplies": random.uniform(0.20, 0.40)
                }
                
                profit = sales * profit_margins[category]
                
                record = SaleRecord(
                    order_date=current_date + timedelta(
                        hours=random.randint(8, 20),
                        minutes=random.randint(0, 59)
                    ),
                    region=region,
                    category=category,
                    quantity=quantity,
                    discount=round(discount, 4),
                    sales=round(sales, 2),
                    profit=round(profit, 2)
                )
                records.append(record)
        
        # Bulk insert in chunks
        chunk_size = 1000
        for i in range(0, len(records), chunk_size):
            db.bulk_save_objects(records[i:i + chunk_size])
            print(f"📊 Inserted {min(i + chunk_size, len(records))}/{len(records)} sales records...")
        
        db.commit()
        print(f"✅ Successfully seeded {len(records)} sales records")
        
    except Exception as e:
        print(f"❌ Error seeding sales data: {e}")
        db.rollback()
    finally:
        db.close()

def seed_notifications():
    """Create some sample notifications"""
    db = SessionLocal()
    try:
        # Clear existing notifications
        db.query(Notification).delete()
        
        notifications = [
            Notification(
                user_id=1,
                title="Sales Surge",
                message="Q4 sales surge detected! Electronics category up 23% this week.",
                type="success",
                is_read=0,
                created_at=datetime.now() - timedelta(hours=2)
            ),
            Notification(
                user_id=1,
                title="Inventory Alert",
                message="Inventory alert: Groceries stock running low in North region.",
                type="alert",
                is_read=0,
                created_at=datetime.now() - timedelta(hours=5)
            ),
            Notification(
                user_id=1,
                title="Forecast Update",
                message="Monthly forecast accuracy improved to 94.2%.",
                type="info",
                is_read=1,
                created_at=datetime.now() - timedelta(days=1)
            ),
            Notification(
                user_id=2,
                title="Training Complete",
                message="New ML model training completed successfully.",
                type="success",
                is_read=0,
                created_at=datetime.now() - timedelta(hours=8)
            )
        ]
        
        db.add_all(notifications)
        db.commit()
        print("✅ Seeded sample notifications")
        
    except Exception as e:
        print(f"❌ Error seeding notifications: {e}")
        db.rollback()
    finally:
        db.close()

def main():
    """Main seeding function"""
    print("🌱 Starting database seeding (VERSION: 2.0 - SHA256+Bcrypt)...")
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    print("📋 Database tables created/verified")
    
    # Seed data
    seed_users()
    seed_sales_data()
    seed_notifications()
    
    print("\n🎉 Database seeding completed successfully!")
    print("\n📊 Summary:")
    
    # Print summary stats
    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        sales_count = db.query(SaleRecord).count()
        notif_count = db.query(Notification).count()
        
        print(f"   Users: {user_count}")
        print(f"   Sales Records: {sales_count}")
        print(f"   Notifications: {notif_count}")
        
        # Calculate some basic stats
        from sqlalchemy import func
        total_revenue = db.query(func.sum(SaleRecord.sales)).scalar() or 0
        total_profit = db.query(func.sum(SaleRecord.profit)).scalar() or 0
        
        print(f"   Total Revenue: ${total_revenue:,.2f}")
        print(f"   Total Profit: ${total_profit:,.2f}")
        print(f"   Profit Margin: {(total_profit/total_revenue*100):.1f}%")
        
    except Exception as e:
        print(f"❌ Error calculating summary: {e}")
    finally:
        db.close()
    
    print("\n🚀 You can now run the app with real data!")
    print("   Login credentials:")
    print("   - admin / Admin@123456! (Admin role)")
    print("   - analyst / Analyst@123456! (Analyst role)")  
    print("   - manager / Manager@123456! (Manager role)")

if __name__ == "__main__":
    main()