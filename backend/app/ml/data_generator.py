import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def generate_synthetic_data(n_samples=5000):
    np.random.seed(42)
    
    start_date = datetime(2023, 1, 1)
    dates = [start_date + timedelta(days=np.random.randint(0, 730)) for _ in range(n_samples)]
    
    regions = ['North', 'South', 'East', 'West', 'Central']
    categories = ['Electronics', 'Furniture', 'Clothing', 'Groceries', 'Office Supplies']
    
    data = {
        'Order_Date': dates,
        'Region': np.random.choice(regions, n_samples),
        'Category': np.random.choice(categories, n_samples),
        'Quantity': np.random.randint(1, 11, n_samples),
        'Discount': np.random.uniform(0, 0.3, n_samples).round(2)
    }
    
    df = pd.DataFrame(data)
    
    # Base price mapping
    price_map = {
        'Electronics': 500,
        'Furniture': 300,
        'Clothing': 50,
        'Groceries': 20,
        'Office Supplies': 15
    }
    
    # Calculate Sales and Profit with some noise and seasonality
    def calculate_sales(row):
        base_price = price_map[row['Category']]
        # Add seasonality (higher in Q4)
        month = row['Order_Date'].month
        seasonality = 1.2 if month in [10, 11, 12] else 1.0
        
        sales = base_price * row['Quantity'] * (1 - row['Discount']) * seasonality
        sales += np.random.normal(0, sales * 0.05) # Add 5% noise
        return round(max(0, sales), 2)

    df['Sales'] = df.apply(calculate_sales, axis=1)
    
    # Margin mapping
    margin_map = {
        'Electronics': 0.15,
        'Furniture': 0.10,
        'Clothing': 0.30,
        'Groceries': 0.05,
        'Office Supplies': 0.40
    }
    
    def calculate_profit(row):
        margin = margin_map[row['Category']]
        # Profit is reduced by discount more than sales
        profit = (row['Sales'] * margin) - (row['Sales'] * row['Discount'] * 0.5)
        profit += np.random.normal(0, abs(profit) * 0.1)
        return round(profit, 2)

    df['Profit'] = df.apply(calculate_profit, axis=1)
    df = df.sort_values('Order_Date')
    
    return df

if __name__ == "__main__":
    df = generate_synthetic_data()
    df.to_csv("c:/Users/sheet/Downloads/AI Forecasting App/backend/app/ml/synthetic_retail_data.csv", index=False)
    print("Generated synthetic data with", len(df), "samples")
