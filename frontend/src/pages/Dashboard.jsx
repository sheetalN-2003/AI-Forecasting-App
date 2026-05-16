import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  TrendingUp, Users, ShoppingBag, DollarSign,
  ArrowUpRight, ArrowDownRight, Package, Activity, Settings, Database, Upload, BellRing, RefreshCw, Download
} from 'lucide-react';

import { analyticsAPI } from '../services/api';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const KPICard = ({ title, value, icon: Icon, change, isPositive, loading }) => (
  <div className="glass p-6 space-y-4 hover:border-indigo-500/40 transition-all duration-300 group">
    <div className="flex justify-between items-start">
      <div className="p-3 bg-indigo-500/20 rounded-xl group-hover:bg-indigo-500/30 transition-colors">
        <Icon size={22} className="text-indigo-400" />
      </div>
      {change && (
        <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-semibold ${
          isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
        }`}>
          {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          <span>{change}</span>
        </div>
      )}
    </div>
    <div>
      <p className="text-slate-400 text-sm font-medium">{title}</p>
      {loading ? (
        <div className="h-8 w-32 bg-slate-800 animate-pulse rounded-lg mt-1" />
      ) : (
        <h3 className="text-2xl font-bold text-white mt-1">{value}</h3>
      )}
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-white/10 rounded-xl p-3 shadow-xl">
      <p className="text-slate-400 text-xs font-semibold mb-2">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-bold" style={{ color: p.color }}>
          {p.name}: ${p.value?.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

export const Dashboard = ({ setActiveTab }) => {
  const [metrics, setMetrics]     = useState(null);
  const [monthly, setMonthly]     = useState([]);
  const [byCategory, setByCategory] = useState([]);
  const [byRegion, setByRegion]   = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [alerts, setAlerts] = useState([]); // Stores live webhook alerts

  // Define WebSockets connection
  useEffect(() => {
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProto}//localhost:8000/ws/live-sales`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'NEW_SALE') {
        const tx = msg.data;
        // Prepend to transactions
        setTransactions(prev => [tx, ...prev].slice(0, 50));
        
        // Optimistically update KPIs
        setMetrics(prev => prev ? ({
          ...prev,
          total_revenue: prev.total_revenue + tx.sales,
          total_profit: prev.total_profit + tx.profit,
          total_orders: prev.total_orders + 1,
        }) : prev);

        setLastUpdated(new Date());

        if (msg.alert) {
          setAlerts(prev => [{ id: tx.id, message: msg.alert }, ...prev].slice(0, 3));
          // Auto remove alert after 5s
          setTimeout(() => {
            setAlerts(prev => prev.filter(a => a.id !== tx.id));
          }, 5000);
        }
      }
    };

    return () => ws.close();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [m, mon, cat, reg, tx] = await Promise.all([
        analyticsAPI.getDashboardMetrics(),
        analyticsAPI.getRevenueByMonth(),
        analyticsAPI.getSalesByCategory(),
        analyticsAPI.getSalesByRegion(),
        analyticsAPI.getRecentTransactions(8),
      ]);
      setMetrics(m.data);
      setMonthly(mon.data);
      setByCategory(cat.data);
      setByRegion(reg.data);
      setTransactions(tx.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const fmt = (num) => num >= 1000000
    ? `$${(num / 1000000).toFixed(2)}M`
    : `$${num?.toLocaleString() ?? '0'}`;

  const showEmptyWarning = metrics && metrics.total_orders === 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in slide-in-from-bottom duration-500">
      {/* Status bar */}
      <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
          <Database size={14} />
          <span className="flex items-center gap-2">
            {metrics?.data_source === 'live' ? 'Live Database' : 'Demo Data'}
            <span className="relative flex h-2 w-2 ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-400 font-semibold px-1">WebSocket Connected</span>
          </span>
          {lastUpdated && <span className="ml-2">· Updated {lastUpdated.toLocaleTimeString()}</span>}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              window.open('http://localhost:8000/analytics/export-csv', '_blank');
            }}
            className="flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg transition-all border border-indigo-500/20"
          >
            <Download size={13} />
            Export Data
          </button>
          <button
            onClick={fetchAll}
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-white px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-all"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Alerts Overlay */}
      {alerts.length > 0 && (
        <div className="fixed top-24 right-8 z-50 flex flex-col gap-3">
          {alerts.map(a => (
            <div key={a.id} className="bg-slate-900/90 border border-indigo-500/50 shadow-2xl shadow-indigo-500/20 p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-right fade-in">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                <BellRing size={16} className="animate-pulse" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Live Alert</p>
                <p className="text-sm font-semibold text-white">{a.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showEmptyWarning && (
        <div className="flex items-center justify-between p-5 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400">
              <Database size={24} />
            </div>
            <div>
              <h3 className="text-white font-bold mb-1">Upload Data to Enable Features</h3>
              <p className="text-slate-400 text-lg mb-8 max-w-md mx-auto">
            Welcome to RetailPulse AI. It looks like you haven't imported any historical data yet. Upload your CSV dataset to bring the dashboard and ML forecasting models to life.
          </p>  </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setActiveTab('forecasting')}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              Make a Forecast
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-indigo-500/20"
            >
              <Upload size={16} /> Upload CSV
            </button>
          </div>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Total Revenue"   value={fmt(metrics?.total_revenue)} icon={DollarSign}  change="" isPositive loading={loading} />
        <KPICard title="Total Profit"    value={fmt(metrics?.total_profit)}  icon={TrendingUp}  change=""  isPositive loading={loading} />
        <KPICard title="Total Orders"    value={metrics?.total_orders?.toLocaleString()} icon={ShoppingBag} change="" isPositive={false} loading={loading} />
        <KPICard title="Avg. Discount"   value={`${((metrics?.avg_discount ?? 0) * 100).toFixed(1)}%`} icon={Users} change="" isPositive={false} loading={loading} />
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Area Chart */}
        <div className="lg:col-span-2 glass p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-bold text-white">Revenue & Profit</h3>
              <p className="text-slate-500 text-sm mt-1">Monthly performance overview</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-indigo-400"><span className="w-3 h-0.5 bg-indigo-400 inline-block rounded" /> Revenue</span>
              <span className="flex items-center gap-1.5 text-emerald-400"><span className="w-3 h-0.5 bg-emerald-400 inline-block rounded" /> Profit</span>
            </div>
          </div>
          <div className="h-72 w-full">
            {loading ? (
              <div className="h-full bg-slate-800/50 animate-pulse rounded-xl" />
            ) : monthly && monthly.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthly}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
                  <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorProfit)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 font-medium">No metrics to display</div>
            )}
          </div>
        </div>

        {/* Category Pie */}
        <div className="glass p-8">
          <h3 className="text-xl font-bold text-white mb-2">Sales by Category</h3>
          <p className="text-slate-500 text-sm mb-6">Revenue distribution</p>
          <div className="h-52 w-full">
            {loading ? (
              <div className="h-full bg-slate-800/50 animate-pulse rounded-xl" />
            ) : byCategory && byCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byCategory} dataKey="revenue" nameKey="category" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={4}>
                    {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `$${v.toLocaleString()}`} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 font-medium">No categorical data</div>
            )}
          </div>
          <div className="space-y-2 mt-2">
            {byCategory.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-slate-400 truncate max-w-[110px]">{c.category}</span>
                </div>
                <span className="text-slate-300 font-semibold">${(c.revenue/1000).toFixed(0)}k</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Second Row: Region Bar + Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Region Bar */}
        <div className="lg:col-span-2 glass p-8">
          <h3 className="text-xl font-bold text-white mb-2">Revenue by Region</h3>
          <p className="text-slate-500 text-sm mb-6">Geographic performance</p>
          <div className="h-56 w-full">
            {loading ? (
              <div className="h-full bg-slate-800/50 animate-pulse rounded-xl" />
            ) : byRegion && byRegion.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byRegion} layout="vertical" margin={{ left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                  <YAxis type="category" dataKey="region" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} width={55} />
                  <Tooltip formatter={(v) => `$${v.toLocaleString()}`} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                  <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
                    {byRegion.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 font-medium">No regional data</div>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="lg:col-span-3 glass p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-bold text-white">Recent Transactions</h3>
              <p className="text-slate-500 text-sm mt-1">Latest sales records</p>
            </div>
          </div>
          <div className="space-y-3 overflow-y-auto max-h-64 pr-1 custom-scroll">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-slate-800/50 animate-pulse rounded-xl" />
              ))
            ) : (
              transactions.map((tx, i) => (
                <div key={tx.id || i} className="flex items-center justify-between p-3 bg-slate-800/40 hover:bg-slate-800/70 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <div>
                      <p className="text-sm font-semibold text-white">{tx.category}</p>
                      <p className="text-xs text-slate-500">{tx.region} · Qty {tx.quantity} · {tx.order_date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">${tx.sales?.toLocaleString()}</p>
                    <p className={`text-xs font-semibold ${tx.profit > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {tx.profit > 0 ? '+' : ''}${tx.profit?.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
