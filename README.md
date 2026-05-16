# RetailPulse AI: Enterprise Intelligence Platform

RetailPulse AI is a world-class, enterprise-grade SaaS platform designed for high-fidelity retail forecasting, real-time inventory management, and collaborative business intelligence.

![Platform Preview](https://via.placeholder.com/1200x600/0f172a/6366f1?text=RetailPulse+AI+Enterprise+Dashboard)

## 🚀 Key Features

### 📡 Proactive Intelligence
*   **Global Command Center (CMD+K)**: Keyboard-driven navigation for instant access to any dashboard or system setting.
*   **AI Anomaly Detection**: Real-time statistical monitoring (Z-Score) that alerts administrators to sales spikes or supply chain disruptions.
*   **Live Sales Stream**: WebSocket-integrated dashboards that update in real-time as transactions occur.

### 🧠 Advanced AI & Simulation
*   **"What-If" Strategy Simulator**: Interactive mode to simulate the impact of price shifts and marketing pushes on future revenue.
*   **Explainable AI (XAI)**: Detailed model reasoning strings for every prediction, providing transparency into AI decision-making.
*   **Ensemble Forecasting**: High-accuracy predictions powered by XGBoost, Random Forest, and seasonal time-series models.

### 👥 Collaborative Governance
*   **Real-time User Presence**: Live tracking of online administrators and analysts via presence avatars.
*   **Immutable Audit Trail**: Tamper-proof logging of all administrative interventions for enterprise compliance.
*   **Role-Based Access Control (RBAC)**: Distinct workflows for Admins, Analysts, and Managers.

### 🎨 Premium Visual Experience
*   **Neural Dark Mode & Clean Light Mode**: Adaptive theme system with persistent user preferences.
*   **High-Fidelity Reporting**: Server-side PDF generation (ReportLab) for stakeholder-ready business audits.
*   **Glassmorphism UI**: Modern React interface built with Tailwind CSS and Framer Motion.

## 🛠️ Tech Stack
*   **Backend**: FastAPI, SQLAlchemy (PostgreSQL/SQLite), Pydantic, Redis.
*   **Frontend**: React, Vite, Tailwind CSS, Recharts, Lucide Icons.
*   **AI/ML**: Scikit-learn, XGBoost, SHAP, Gemini AI (Insights).
*   **DevOps**: Docker, Docker Compose.

## 🚦 Quick Start

### Docker (Recommended)
```bash
docker-compose up --build
```

### Local Development
1. **Backend**:
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```
2. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## 📄 License
Enterprise Proprietary — Developed by RetailPulse Engineering.
