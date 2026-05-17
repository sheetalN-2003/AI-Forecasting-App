import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, ShoppingBag, DollarSign, Package, 
  Activity, Brain, BellRing, Sparkles, Download, 
  Settings, User, ShieldCheck, Zap, RefreshCw, 
  Search, ArrowRight, CheckCircle2, AlertTriangle,
  LogOut, Clock, Globe, Wifi, Trash2
} from 'lucide-react';
import { 
  analyticsAPI, inventoryAPI, forecastingAPI, 
  authAPI, notificationsAPI, insightsAPI
} from '../services/api';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar,
  LineChart, Line, Cell
} from 'recharts';

// --- Components ---

const KPICard = ({ title, value, icon: Icon, colorClass, trend, loading }) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="glass p-6 group hover:border-white/20 transition-all duration-300 relative overflow-hidden"
  >
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl bg-slate-800/80 group-hover:bg-slate-800 transition-colors ${colorClass}`}>
        <Icon size={20} />
      </div>
      {trend && (
        <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full">
          +{trend}%
        </span>
      )}
    </div>
    <div>
      <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{title}</p>
      {loading ? (
        <div className="h-8 w-24 bg-slate-800 animate-pulse rounded-lg" />
      ) : (
        <h3 className="text-2xl font-black text-white tabular-nums">{value}</h3>
      )}
    </div>
    <div className={`absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-transparent via-${colorClass.split('-')[1]}-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
  </motion.div>
);

const LiveSalesGraph = ({ data, loading }) => (
  <div className="glass p-8">
    <div className="flex justify-between items-center mb-8">
      <div>
        <h3 className="text-xl font-black text-white tracking-tight">Live Revenue Stream</h3>
        <p className="text-xs text-slate-500 font-medium">Real-time store performance tracking</p>
      </div>
      <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full">
        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Live Updates</span>
      </div>
    </div>
    <div className="h-[300px]">
      {loading ? (
        <div className="h-full bg-slate-800/50 animate-pulse rounded-xl" />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="userColorRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
            <XAxis dataKey="month" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px' }}
              itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
            />
            <Area type="monotone" dataKey="revenue" stroke="#6366f1" fillOpacity={1} fill="url(#userColorRev)" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  </div>
);

export const UserDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [autoInsights, setAutoInsights] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [forecastHistory, setForecastHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  
  // Forecaster State
  const [forecastForm, setForecastForm] = useState({ category: 'Electronics', quantity: 10 });
  const [prediction, setPrediction] = useState(null);
  const [predicting, setPredicting] = useState(false);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace(/^https?:\/\//, '')
      : 'localhost:8000';
    const wsUrl = `${wsProto}//${wsHost}/ws/live-sales`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setWsConnected(true);
      console.log('WebSocket connected');
    };

    ws.onclose = () => {
      setWsConnected(false);
      console.log('WebSocket disconnected');
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'NEW_SALE') {
        // Update metrics optimistically
        setMetrics(prev => prev ? ({
          ...prev,
          today_revenue: prev.today_revenue + msg.data.sales,
          today_orders: prev.today_orders + 1,
        }) : prev);
        
        // Update transactions log
        setTransactions(prev => [msg.data, ...prev].slice(0, 50));
        
        // Update chart data in real-time for current month
        setChartData(prev => {
          if (!prev || prev.length === 0) return prev;
          const newData = [...prev];
          const lastIndex = newData.length - 1;
          newData[lastIndex] = {
            ...newData[lastIndex],
            revenue: newData[lastIndex].revenue + msg.data.sales,
            profit: newData[lastIndex].profit + msg.data.profit
          };
          return newData;
        });

        setLastUpdated(new Date());
      }
    };

    return () => ws.close();
  }, []);

  const fetchData = async () => {
    try {
      const [m, c, inv, n, insights, tx, fh] = await Promise.all([
        analyticsAPI.getUserMetrics(),
        analyticsAPI.getRevenueByMonth(),
        inventoryAPI.getStatus(),
        notificationsAPI.get(),
        insightsAPI.getAutoInsights().catch(() => ({ data: [] })), // Fallback if insights fail
        analyticsAPI.getRecentTransactions(50).catch(() => ({ data: [] })),
        forecastingAPI.getHistory().catch(() => ({ data: [] }))
      ]);
      setMetrics(m.data);
      setChartData(c.data);
      setInventory(inv.data);
      setNotifications(n.data);
      setAutoInsights(insights.data);
      setTransactions(tx.data);
      setForecastHistory(fh.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("User Dashboard Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const categories = inventory && inventory.length > 0 
    ? [...new Set(inventory.map(item => item.category))] 
    : ['Electronics', 'Furniture', 'Clothing', 'Office Supplies'];

  useEffect(() => {
    if (categories.length > 0 && !categories.includes(forecastForm.category)) {
      setForecastForm(prev => ({ ...prev, category: categories[0] }));
    }
  }, [inventory]);

  if (loading || !metrics) return (
    <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-500 font-black uppercase tracking-widest text-xs animate-pulse">Loading Store Manager Workspace...</p>
    </div>
  );

  const criticalInventory = inventory.filter(item => item.status === 'CRITICAL_LOW').length;
  const healthyInventory = inventory.filter(item => item.status === 'HEALTHY').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* 1. Dashboard Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard title="Today's Revenue" value={`$${metrics.today_revenue.toLocaleString()}`} icon={DollarSign} colorClass="text-emerald-400" trend={14} />
        <KPICard title="Total Orders" value={metrics.today_orders} icon={ShoppingBag} colorClass="text-indigo-400" trend={5} />
        <KPICard title="Predicted Sales" value={`$${metrics.predicted_sales.toLocaleString()}`} icon={TrendingUp} colorClass="text-blue-400" />
        <KPICard title="Inventory Status" value={metrics.inventory_status} icon={Package} colorClass="text-amber-400" />
        <KPICard title="Top Product" value={metrics.top_product} icon={Zap} colorClass="text-rose-400" />
        <KPICard title="Monthly Growth" value={`${metrics.monthly_growth}%`} icon={Activity} colorClass="text-fuchsia-400" />
      </div>

      {/* 2. Live Sales Graph */}
      <LiveSalesGraph data={chartData} />

      {/* 2.5 Historical Sales Log Explorer */}
      <div className="glass p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <Clock size={20} className="text-indigo-400" /> Historical Sales Log
            </h3>
            <p className="text-xs text-slate-500 font-medium">Browse, search, and audit all transaction records (including uploaded datasets)</p>
          </div>
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Search by Category or Region..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/50 border border-white/5 focus:border-indigo-500/40 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 outline-none transition-all placeholder:text-slate-600"
            />
          </div>
        </div>

        <div className="overflow-x-auto border border-white/5 rounded-2xl bg-slate-950/20">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-slate-900/40 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                <th className="py-4 px-6">Order Date</th>
                <th className="py-4 px-6">Category</th>
                <th className="py-4 px-6">Region</th>
                <th className="py-4 px-6 text-right">Quantity</th>
                <th className="py-4 px-6 text-right">Revenue</th>
                <th className="py-4 px-6 text-right">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-slate-300">
              {transactions
                .filter(tx => 
                  tx.category.toLowerCase().includes(searchTerm.toLowerCase()) || 
                  tx.region.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .slice(0, 10)
                .map((tx, idx) => (
                  <tr key={tx.id || idx} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-400">
                      {tx.order_date ? tx.order_date.split('T')[0] : ''}
                    </td>
                    <td className="py-4 px-6 font-bold text-white uppercase tracking-tight">{tx.category}</td>
                    <td className="py-4 px-6 text-slate-400 font-semibold">{tx.region}</td>
                    <td className="py-4 px-6 text-right font-black text-slate-200">{tx.quantity}</td>
                    <td className="py-4 px-6 text-right font-bold text-indigo-400">${tx.sales.toLocaleString()}</td>
                    <td className="py-4 px-6 text-right font-bold text-emerald-400">${tx.profit.toLocaleString()}</td>
                  </tr>
                ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500 font-medium uppercase tracking-widest text-[10px]">
                    No transactions found. Upload training data in settings to seed records.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 3. AI Sales Forecasting */}
        <div className="glass p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
              <Brain size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white tracking-tight">AI Forecaster</h3>
              <p className="text-xs text-slate-500 font-medium">Predict future revenue instantly</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">Category</label>
                <select 
                  value={forecastForm.category}
                  onChange={e => setForecastForm({...forecastForm, category: e.target.value})}
                  className="input-field"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">Quantity</label>
                <input 
                  type="number" 
                  className="input-field" 
                  value={forecastForm.quantity}
                  onChange={e => setForecastForm({...forecastForm, quantity: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>
            <button 
              disabled={predicting}
              onClick={async () => {
                setPredicting(true);
                try {
                  const { data } = await forecastingAPI.predictSales({ 
                    ...forecastForm, 
                    region: 'North', 
                    discount: 0.1, 
                    month: new Date().getMonth() + 1 
                  });
                  setPrediction(data);
                  const fh = await forecastingAPI.getHistory().catch(() => ({ data: [] }));
                  setForecastHistory(fh.data);
                } catch (err) {
                  alert("Forecasting Engine error");
                } finally {
                  setPredicting(false);
                }
              }} 
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
            >
              {predicting ? <RefreshCw className="animate-spin" size={18} /> : <Sparkles size={18} />}
              Generate Forecast
            </button>
            <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 mt-4">
              <p className="text-[10px] text-indigo-400 font-black uppercase mb-1">AI Projection</p>
              <p className="text-2xl font-black text-white">
                {prediction ? `Expected: $${prediction.average_prediction.toLocaleString()}` : 'Awaiting Calculation...'}
              </p>
              <p className="text-[10px] text-slate-500 mt-1 font-medium">
                {prediction ? `Confidence Score: ${(prediction.confidence * 100).toFixed(1)}%` : 'Ready to analyze'}
              </p>
            </div>
          </div>
        </div>

        {/* 5. Smart Notification Center */}
        <div className="glass p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-400">
                <BellRing size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white tracking-tight">Smart Alerts</h3>
                <p className="text-xs text-slate-500 font-medium">Live business intelligence</p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            {notifications.slice(0, 4).map(n => (
              <div key={n.id} className="p-4 bg-slate-800/40 rounded-xl border border-white/5 flex items-center gap-4 group hover:bg-slate-800 transition-colors">
                <div className={`p-2 rounded-lg bg-slate-900 ${n.type === 'alert' ? 'text-red-400' : 'text-indigo-400'}`}>
                  <BellRing size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-white">{n.message}</p>
                  <p className="text-[10px] text-slate-500 font-medium">{new Date(n.created_at).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 4. Inventory Monitoring */}
        <div className="glass p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-400">
              <Package size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white tracking-tight">Inventory Health</h3>
              <p className="text-xs text-slate-500 font-medium">Auto-synced with live sales</p>
            </div>
          </div>
          <div className="space-y-4">
            {inventory.slice(0, 3).map(item => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-slate-800/20 rounded-xl border border-white/5">
                <div>
                  <p className="text-sm font-bold text-white uppercase tracking-tight">{item.category}</p>
                  <p className="text-[10px] text-slate-500 font-bold">{item.current_stock} Units Available</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                  item.status === 'HEALTHY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                }`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass p-8 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/20">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400">
              <Sparkles size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white tracking-tight">AI Store Insights</h3>
              <p className="text-xs text-slate-500 font-medium">Personalized recommendations</p>
            </div>
          </div>
          <div className="space-y-6">
            {autoInsights.length > 0 ? autoInsights.map(insight => (
              <div key={insight.id} className="flex gap-4">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full ${insight.type === 'positive' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'} flex items-center justify-center border`}>
                  {insight.type === 'positive' ? <TrendingUp size={18} /> : <AlertTriangle size={18} />}
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase mb-1">{insight.title}</p>
                  <p className="text-sm text-slate-300 font-medium leading-relaxed">{insight.text}</p>
                </div>
              </div>
            )) : (
              <div className="text-center py-4 text-slate-500 text-xs font-bold uppercase tracking-widest">
                Analyzing patterns...
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 8. Explainable AI Section */}
        <div className="glass p-8 space-y-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white tracking-tight">Forecast Transparency</h3>
              <p className="text-xs text-slate-500 font-medium">Understanding AI decision metrics</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase">
                <span>Quantity Contribution</span>
                <span>45%</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 w-[45%]" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase">
                <span>Seasonality Factor</span>
                <span>32%</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-[32%]" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase">
                <span>Profit Variance</span>
                <span>18%</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 w-[18%]" />
              </div>
            </div>
          </div>
          <div className="p-6 bg-slate-800/40 rounded-2xl border border-white/5 mt-6">
            <p className="text-xs text-slate-400 font-medium italic leading-relaxed">
              "Our XAI engine identifies that **Quantity** and **Historical Seasonality** are the primary drivers for today's high sales projection. Local events in the East region contributed a 5% variance."
            </p>
          </div>
        </div>

        {/* 8.5 Past Forecasts History Feed */}
        <div className="glass p-8 space-y-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-fuchsia-500/10 rounded-2xl text-fuchsia-400">
              <Brain size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white tracking-tight">Forecast History</h3>
              <p className="text-xs text-slate-500 font-medium">Audit logs of past predictions</p>
            </div>
          </div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto scrollbar-none pr-1">
            {forecastHistory.map(h => (
              <div key={h.id} className="p-4 bg-slate-800/40 rounded-xl border border-white/5 flex items-center justify-between group hover:bg-slate-800 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="text-left">
                    <p className="text-xs font-black text-white uppercase tracking-tight">
                      {h.inputs?.category} (Qty: {h.inputs?.quantity})
                    </p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">
                      {new Date(h.date).toLocaleDateString()} • {h.model || 'RF/XGB Hybrid'}
                    </p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-4">
                  <div>
                    <p className="text-sm font-black text-indigo-400">${h.prediction?.toLocaleString()}</p>
                    <p className="text-[10px] text-emerald-400 font-bold">{(h.confidence * 100).toFixed(1)}% Conf</p>
                  </div>
                  <button 
                    onClick={async () => {
                      if (!confirm("Are you sure you want to delete this forecast log?")) return;
                      try {
                        await forecastingAPI.deleteHistory(h.id);
                        setForecastHistory(prev => prev.filter(item => item.id !== h.id));
                      } catch (err) {
                        alert("Failed to delete forecast history log");
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 bg-red-500/5 hover:bg-red-500 hover:text-white rounded-lg text-red-400 border border-red-500/10 transition-all"
                    title="Delete Record"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
            {forecastHistory.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-xs font-bold uppercase tracking-widest">
                No past predictions found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 9. Report Generation */}
      <div className="glass p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-slate-800 rounded-2xl">
            <Download className="text-indigo-400" size={28} />
          </div>
          <div>
            <h4 className="text-lg font-black text-white">Daily Performance Report</h4>
            <p className="text-xs text-slate-500">
              Auto-generated summary for {metrics.active_date ? new Date(metrics.active_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <button 
            onClick={async () => {
              try {
                const token = localStorage.getItem('retailpulse_token');
                const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/analytics/export-csv`, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                if (!res.ok) throw new Error('Export failed');
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `RetailPulse_Report_${metrics.active_date || new Date().toISOString().slice(0,10)}.csv`;
                a.click();
                window.URL.revokeObjectURL(url);
              } catch (err) {
                alert('CSV export failed. Please try again.');
              }
            }}
            className="flex-1 md:flex-none px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
          >
            CSV Export
          </button>
          <button 
            onClick={async () => {
              try {
                const token = localStorage.getItem('retailpulse_token');
                const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/analytics/export-pdf`, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                if (!res.ok) throw new Error('Export failed');
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `RetailPulse_Report_${metrics.active_date || new Date().toISOString().slice(0,10)}.pdf`;
                a.click();
                window.URL.revokeObjectURL(url);
              } catch (err) {
                alert('PDF export failed. Please try again.');
              }
            }}
            className="flex-1 md:flex-none px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all"
          >
            Download PDF
          </button>
        </div>
      </div>

    </div>
  );
};
