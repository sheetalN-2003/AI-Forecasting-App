import os
try:
    from google import genai as google_genai
except ImportError:
    google_genai = None

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, extract
from app.core.database import get_db
from app.models.schemas import SaleRecord
from pydantic import BaseModel
from datetime import datetime, timedelta

router = APIRouter()

class ChatRequest(BaseModel):
    message: str

def get_db_context(db: Session):
    # Get comprehensive business metrics
    total_metrics = db.query(
        func.sum(SaleRecord.sales).label("revenue"),
        func.sum(SaleRecord.profit).label("profit"),
        func.count(SaleRecord.id).label("orders"),
        func.avg(SaleRecord.discount).label("avg_discount")
    ).first()
    
    rev = total_metrics.revenue or 0
    profit = total_metrics.profit or 0
    orders = total_metrics.orders or 0
    margin = (profit / rev * 100) if rev > 0 else 0
    avg_discount = (total_metrics.avg_discount or 0) * 100

    # Category performance
    category_stats = (
        db.query(
            SaleRecord.category,
            func.sum(SaleRecord.profit).label("total_profit"),
            func.sum(SaleRecord.sales).label("total_sales"),
            func.avg(SaleRecord.discount).label("avg_discount"),
            func.count(SaleRecord.id).label("order_count")
        )
        .group_by(SaleRecord.category)
        .order_by(desc("total_sales"))
        .all()
    )
    
    # Regional performance
    region_stats = (
        db.query(
            SaleRecord.region,
            func.sum(SaleRecord.sales).label("total_sales"),
            func.count(SaleRecord.id).label("order_count")
        )
        .group_by(SaleRecord.region)
        .order_by(desc("total_sales"))
        .all()
    )
    
    # Recent trends (last 30 days vs previous 30 days)
    thirty_days_ago = datetime.now() - timedelta(days=30)
    sixty_days_ago = datetime.now() - timedelta(days=60)
    
    recent_revenue = db.query(func.sum(SaleRecord.sales)).filter(
        SaleRecord.order_date >= thirty_days_ago
    ).scalar() or 0
    
    previous_revenue = db.query(func.sum(SaleRecord.sales)).filter(
        SaleRecord.order_date >= sixty_days_ago,
        SaleRecord.order_date < thirty_days_ago
    ).scalar() or 0
    
    growth_rate = ((recent_revenue - previous_revenue) / max(previous_revenue, 1)) * 100
    
    # Top performing category
    top_category = category_stats[0] if category_stats else None
    top_region = region_stats[0] if region_stats else None
    
    return {
        "revenue": rev,
        "profit": profit,
        "orders": orders,
        "margin": margin,
        "avg_discount": avg_discount,
        "growth_rate": growth_rate,
        "recent_revenue": recent_revenue,
        "top_category": top_category.category if top_category else "N/A",
        "top_category_sales": top_category.total_sales if top_category else 0,
        "top_region": top_region.region if top_region else "N/A",
        "top_region_sales": top_region.total_sales if top_region else 0,
        "category_count": len(category_stats),
        "region_count": len(region_stats),
        "categories": [{"name": c.category, "sales": c.total_sales, "profit": c.total_profit, "margin": (c.total_profit/c.total_sales*100) if c.total_sales > 0 else 0} for c in category_stats[:5]]
    }

def call_gemini_api(api_key: str, prompt: str) -> str:
    """Connect to Gemini API with robust model fallbacks (2.0-flash, 1.5-flash, 1.5-pro, 1.0-pro) across direct REST requests, urllib, and legacy SDKs."""
    models = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.0-pro"]
    
    # Method 1: Try using standard requests (HTTP POST) iterating models
    import requests
    for model_name in models:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            headers = {"Content-Type": "application/json"}
            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": prompt}
                        ]
                    }
                ]
            }
            res = requests.post(url, json=payload, headers=headers, timeout=12)
            if res.status_code == 200:
                data = res.json()
                return data["candidates"][0]["content"]["parts"][0]["text"]
            else:
                print(f"Gemini HTTP requests model {model_name} error (status {res.status_code}): {res.text}")
        except Exception as e:
            print(f"Gemini HTTP requests model {model_name} call failed: {e}")

    # Method 2: Try using standard urllib (absolutely zero external dependencies)
    import urllib.request
    import json
    for model_name in models:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": prompt}
                        ]
                    }
                ]
            }
            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                url, 
                data=data, 
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=12) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                return res_data["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:
            print(f"Gemini HTTP urllib model {model_name} call failed: {e}")

    # Method 3: Try Google GenAI SDK (google-genai)
    try:
        from google import genai as google_genai
        if google_genai:
            for model_name in models:
                try:
                    client = google_genai.Client(api_key=api_key)
                    response = client.models.generate_content(
                        model=model_name,
                        contents=prompt
                    )
                    return response.text
                except Exception as e:
                    print(f"Google GenAI SDK model {model_name} failed: {e}")
    except Exception as e:
        print(f"Google GenAI SDK load failed: {e}")

    # Method 4: Try legacy google-generativeai SDK
    for model_name in models:
        try:
            import google.generativeai as legacy_genai
            legacy_genai.configure(api_key=api_key)
            model = legacy_genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            print(f"Legacy Google GenerativeAI SDK model {model_name} failed: {e}")

    raise RuntimeError("All Gemini API connection methods and models failed.")

@router.post("/chat")
async def chat_insights(req: ChatRequest, db: Session = Depends(get_db)):
    msg = req.message
    ctx = get_db_context(db)
    
    api_key = os.getenv("GEMINI_API_KEY")
    
    if api_key:
        try:
            categories_summary = ", ".join([f"{c['name']}: ${c['sales']:,.0f} (margin: {c['margin']:.1f}%)" for c in ctx['categories']])
            
            prompt = f"""
            You are a Retail Analytics AI assistant. Use this real-time business data to answer the user's question:
            
            BUSINESS METRICS:
            - Total Revenue: ${ctx['revenue']:,.2f}
            - Total Profit: ${ctx['profit']:,.2f}
            - Total Orders: {ctx['orders']:,}
            - Overall Profit Margin: {ctx['margin']:.2f}%
            - Average Discount: {ctx['avg_discount']:.1f}%
            - 30-day Growth Rate: {ctx['growth_rate']:.1f}%
            - Recent Revenue (30 days): ${ctx['recent_revenue']:,.2f}
            
            TOP PERFORMERS:
            - Best Category: {ctx['top_category']} (${ctx['top_category_sales']:,.2f})
            - Best Region: {ctx['top_region']} (${ctx['top_region_sales']:,.2f})
            
            CATEGORY BREAKDOWN: {categories_summary}
            
            User Question: "{msg}"
            
            Provide a professional, data-driven response. Use specific numbers from the data. Be concise but insightful. Format your response beautifully in markdown with bullet points and bolding.
            """
            response_text = call_gemini_api(api_key, prompt)
            return {"response": response_text}
        except Exception as e:
            print(f"Gemini Error (falling back): {e}")

    # Enhanced Intelligent Heuristic Fallback
    msg_low = msg.lower()
    
    if any(k in msg_low for k in ["profit", "margin", "money", "performance", "revenue"]):
        growth_indicator = "📈" if ctx['growth_rate'] > 0 else "📉"
        return {"response": f"💰 **Financial Performance Summary:**\n\n• Total Revenue: **${ctx['revenue']:,.2f}**\n• Total Profit: **${ctx['profit']:,.2f}**\n• Profit Margin: **{ctx['margin']:.2f}%**\n• 30-day Growth: {growth_indicator} **{ctx['growth_rate']:.1f}%**\n\nYour top performing category is **{ctx['top_category']}** with ${ctx['top_category_sales']:,.2f} in sales."}
    
    elif any(k in msg_low for k in ["category", "categories", "product", "sell", "popular", "best"]):
        top_cats = ctx['categories'][:3]
        cat_text = "\n".join([f"• **{c['name']}**: ${c['sales']:,.0f} revenue, {c['margin']:.1f}% margin" for c in top_cats])
        return {"response": f"🛍️ **Top Performing Categories:**\n\n{cat_text}\n\n**{ctx['top_category']}** is your star performer with the highest revenue. Would you like specific insights about any category?"}
    
    elif any(k in msg_low for k in ["region", "location", "where", "geographic"]):
        return {"response": f"🌍 **Regional Performance:**\n\n• **{ctx['top_region']}** is your top region with ${ctx['top_region_sales']:,.2f} in sales\n• You're operating across **{ctx['region_count']} regions**\n\nWould you like detailed regional breakdown or expansion recommendations?"}
    
    elif any(k in msg_low for k in ["discount", "pricing", "price"]):
        return {"response": f"💸 **Pricing Analysis:**\n\n• Average discount rate: **{ctx['avg_discount']:.1f}%**\n• Current profit margin: **{ctx['margin']:.2f}%**\n\nYour discount strategy appears {'aggressive' if ctx['avg_discount'] > 15 else 'conservative'}. {'Consider reducing discounts to improve margins.' if ctx['avg_discount'] > 20 else 'Discount levels look healthy for maintaining competitiveness.'}"}
    
    elif any(k in msg_low for k in ["growth", "trend", "forecast", "future"]):
        trend_emoji = "🚀" if ctx['growth_rate'] > 10 else "📈" if ctx['growth_rate'] > 0 else "📉"
        return {"response": f"{trend_emoji} **Growth Analysis:**\n\n• 30-day growth rate: **{ctx['growth_rate']:.1f}%**\n• Recent revenue: **${ctx['recent_revenue']:,.2f}**\n\n{'Excellent growth momentum! Consider scaling successful strategies.' if ctx['growth_rate'] > 10 else 'Steady growth trajectory.' if ctx['growth_rate'] > 0 else 'Revenue declining. Focus on top-performing categories and regions.'}"}
    
    elif any(k in msg_low for k in ["help", "what", "how", "advice", "recommend"]):
        return {"response": f"🤖 **I can help you analyze:**\n\n• **Financial Performance** - Revenue, profit, margins\n• **Category Analysis** - Best/worst performing products\n• **Regional Insights** - Geographic performance patterns\n• **Growth Trends** - Historical and predictive analytics\n• **Pricing Strategy** - Discount optimization\n\n**Quick Stats:** {ctx['orders']:,} orders, ${ctx['revenue']:,.0f} revenue, {ctx['margin']:.1f}% margin. What would you like to explore?"}

    return {"response": f"🤖 I'm analyzing your **{ctx['orders']:,}** transactions totaling **${ctx['revenue']:,.2f}** in revenue. Your business is showing **{ctx['growth_rate']:.1f}%** growth over the last 30 days. How can I help you optimize further?"}

@router.get("/auto-insights")
async def get_auto_insights(db: Session = Depends(get_db)):
    """Generate automatic business insights based on current data patterns."""
    ctx = get_db_context(db)
    
    insights = []
    
    # Growth insight
    if ctx['growth_rate'] > 15:
        insights.append({
            "id": "growth_surge",
            "type": "positive",
            "title": "Strong Growth Momentum",
            "text": f"Revenue grew {ctx['growth_rate']:.1f}% in the last 30 days. Consider scaling successful strategies in {ctx['top_category']} and {ctx['top_region']}.",
            "priority": "high"
        })
    elif ctx['growth_rate'] < -5:
        insights.append({
            "id": "growth_decline", 
            "type": "negative",
            "title": "Revenue Decline Alert",
            "text": f"Revenue dropped {abs(ctx['growth_rate']):.1f}% recently. Focus on optimizing {ctx['top_category']} performance and reducing discounts.",
            "priority": "high"
        })
    
    # Margin insight
    if ctx['margin'] > 30:
        insights.append({
            "id": "high_margin",
            "type": "positive", 
            "title": "Excellent Profit Margins",
            "text": f"Your {ctx['margin']:.1f}% profit margin is outstanding. Consider strategic expansion or premium positioning.",
            "priority": "medium"
        })
    elif ctx['margin'] < 15:
        insights.append({
            "id": "low_margin",
            "type": "negative",
            "title": "Margin Optimization Needed", 
            "text": f"Profit margin of {ctx['margin']:.1f}% is below industry average. Review pricing strategy and reduce {ctx['avg_discount']:.1f}% average discount.",
            "priority": "high"
        })
    
    # Category performance insight
    if len(ctx['categories']) > 0:
        top_cat = ctx['categories'][0]
        if top_cat['margin'] > 40:
            insights.append({
                "id": "category_star",
                "type": "positive",
                "title": f"{top_cat['name']} - Star Performer",
                "text": f"{top_cat['name']} delivers {top_cat['margin']:.1f}% margins with ${top_cat['sales']:,.0f} revenue. Consider expanding this category.",
                "priority": "medium"
            })
    
    # Discount insight
    if ctx['avg_discount'] > 20:
        insights.append({
            "id": "discount_alert",
            "type": "neutral",
            "title": "High Discount Rate",
            "text": f"Average {ctx['avg_discount']:.1f}% discount may be eroding profits. Test reducing discounts by 5% to improve margins.",
            "priority": "medium"
        })
    
    return insights
