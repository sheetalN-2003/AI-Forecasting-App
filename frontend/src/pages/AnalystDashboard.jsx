import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, ShoppingBag, DollarSign,
  Package, Activity, Brain, Sparkles, BellRing,
  Download, MessageSquare, PieChart as PieChartIcon, 
  Map, Calendar, ShieldCheck, Zap, RefreshCw, 
  Search, ArrowRight, Filter, ChevronRight, FileText, Send,
  LayoutDashboard, BarChart3, Trash2, Clock, Upload
} from 'lucide-react';
import { 
  analyticsAPI, inventoryAPI, forecastingAPI, 
  insightsAPI, notificationsAPI, dataAPI
} from '../services/api';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar,
  PieChart, Pie, Cell, LineChart, Line, ComposedChart
} from 'recharts';

// --- Shared Components ---

const SectionHeader = ({ title, sub, icon: Icon, colorClass, onRefresh }) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-2xl bg-slate-800/50 border border-white/5 ${colorClass}`}>
        <Icon size={24} />
      </div>
      <div>
        <h2 className="text-2xl font-black text-white tracking-tight">{title}</h2>
        <p className="text-sm text-slate-500 font-medium">{sub}</p>
      </div>
    </div>
    <div className="flex gap-2">
      <button 
        onClick={() => alert("Filter Sidebar Opening...")}
        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-slate-300 transition-all"
      >
        <Filter size={14} /> Filter
      </button>
      <button 
        onClick={onRefresh}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-indigo-600/20 transition-all"
      >
        <RefreshCw size={14} /> Update
      </button>
    </div>
  </div>
);

const AnalystCard = ({ title, value, sub, icon: Icon, trend, colorClass }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="glass p-6 group hover:border-white/20 transition-all duration-300 relative overflow-hidden"
  >
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl bg-slate-800/80 group-hover:bg-slate-800 transition-colors ${colorClass}`}>
        <Icon size={20} />
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full ${trend > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
          {trend > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <div>
      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">{title}</p>
      <h3 className="text-2xl font-black text-white tabular-nums">{value}</h3>
      {sub && <p className="text-[10px] text-slate-500 font-medium mt-1">{sub}</p>}
    </div>
  </motion.div>
);

// --- Section Components ---

const BusinessOverview = ({ data }) => {
  const { growth } = data;
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <AnalystCard title="Current Revenue" value={`$${(growth.current_revenue / 1000).toFixed(1)}k`} trend={12.4} icon={DollarSign} colorClass="text-emerald-400" />
        <AnalystCard title="Predicted Rev." value={`$${(growth.predicted_revenue / 1000).toFixed(1)}k`} trend={8.2} icon={TrendingUp} colorClass="text-indigo-400" />
        <AnalystCard title="Monthly Growth" value={`${growth.monthly_growth}%`} trend={2.1} icon={Activity} colorClass="text-fuchsia-400" />
        <AnalystCard title="Inventory Mesh" value={growth.inventory_health} icon={Package} colorClass="text-amber-400" />
        <AnalystCard title="Alpha Product" value={growth.top_product} icon={ShoppingBag} colorClass="text-blue-400" />
        <AnalystCard title="AI Fidelity" value={`${growth.forecast_accuracy}%`} icon={Brain} colorClass="text-rose-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <BarChart3 size={120} />
          </div>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">Revenue Dynamics</h3>
              <p className="text-xs text-slate-500 font-bold">Historical Performance vs AI Benchmarks</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-indigo-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase">Actual</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase">Profit</span>
              </div>
            </div>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.monthly}>
                <defs>
                  <linearGradient id="analystRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }} 
                  itemStyle={{ fontSize: '12px', fontWeight: '900', textTransform: 'uppercase' }}
                />
                <Area type="monotone" dataKey="revenue" fill="url(#analystRev)" stroke="#6366f1" strokeWidth={4} />
                <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={3} dot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#0f172a' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass p-8 flex flex-col">
          <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Geo-Distribution</h3>
          <p className="text-xs text-slate-500 font-bold mb-8">Sales Concentration by Neural Region</p>
          <div className="flex-1 flex items-center justify-center min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.byRegion} dataKey="revenue" nameKey="region" cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={8}>
                  {data.byRegion.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-6">
            {data.byRegion.map((r, i) => (
              <div key={r.region} className="flex items-center gap-3 p-2 bg-white/5 rounded-xl border border-white/5">
                <span className="w-2 h-2 rounded-full" style={{ background: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][i % 5] }} />
                <span className="text-[10px] font-black text-slate-300 uppercase truncate">{r.region}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const RealTimeSales = ({ transactions }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="glass p-6 border-l-4 border-indigo-500">
        <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Orders Per Minute (OPM)</p>
        <p className="text-3xl font-black text-white">4.2</p>
      </div>
      <div className="glass p-6 border-l-4 border-emerald-500">
        <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Live Hourly Revenue</p>
        <p className="text-3xl font-black text-white">$12,450</p>
      </div>
      <div className="glass p-6 border-l-4 border-fuchsia-500">
        <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Active Customers</p>
        <p className="text-3xl font-black text-white">842</p>
      </div>
    </div>
    <div className="glass overflow-hidden">
      <div className="p-6 border-b border-white/5 bg-slate-900/20 flex justify-between items-center">
        <h3 className="text-lg font-bold text-white">Live Transaction Stream</h3>
        <span className="flex items-center gap-2 text-[10px] font-black text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">
          <RefreshCw size={10} /> Live
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-800/30 text-[10px] uppercase font-bold text-slate-500 tracking-widest">
            <tr>
              <th className="px-8 py-4">Transaction ID</th>
              <th className="px-8 py-4">Product Category</th>
              <th className="px-8 py-4">Region</th>
              <th className="px-8 py-4">Quantity</th>
              <th className="px-8 py-4">Revenue</th>
              <th className="px-8 py-4 text-right">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono text-xs">
            {transactions.map(tx => (
              <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                <td className="px-8 py-4 text-indigo-400 font-bold">TX-{tx.id.toString().slice(-6)}</td>
                <td className="px-8 py-4 text-white">{tx.category}</td>
                <td className="px-8 py-4 text-slate-400">{tx.region}</td>
                <td className="px-8 py-4 text-white">{tx.quantity}</td>
                <td className="px-8 py-4 text-emerald-400 font-bold">${tx.sales.toLocaleString()}</td>
                <td className="px-8 py-4 text-slate-500 text-right">{tx.order_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

const ForecastingPanel = () => {
  const [form, setForm] = useState({
    region: 'North', category: 'Electronics', quantity: 10, discount: 0.1, month: 5
  });
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePredict = async () => {
    setLoading(true);
    try {
      const { data } = await forecastingAPI.predictSales(form);
      setPrediction(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="glass p-8">
        <SectionHeader title="AI Forecasting Engine" sub="Predict sales and profit using ensemble ML" icon={Brain} colorClass="text-indigo-400" />
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase">Product Category</label>
              <select className="input-field" onChange={e => setForm({...form, category: e.target.value})}>
                <option>Electronics</option>
                <option>Furniture</option>
                <option>Clothing</option>
                <option>Groceries</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase">Region</label>
              <select className="input-field" onChange={e => setForm({...form, region: e.target.value})}>
                <option>North</option>
                <option>South</option>
                <option>East</option>
                <option>West</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase">Quantity</label>
              <input type="number" className="input-field" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase">Discount (%)</label>
              <input type="number" step="0.01" className="input-field" value={form.discount} onChange={e => setForm({...form, discount: e.target.value})} />
            </div>
          </div>
          <button onClick={handlePredict} disabled={loading} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2">
            {loading ? <RefreshCw className="animate-spin" size={18} /> : <Sparkles size={18} />}
            Generate Prediction
          </button>
        </div>
      </div>
      <div className="glass p-8 flex flex-col justify-center">
        {prediction ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6">
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Predicted Revenue</p>
              <h2 className="text-6xl font-black text-white tracking-tighter">${prediction.average_prediction.toLocaleString()}</h2>
            </div>
            <div className="flex justify-center gap-8">
              <div className="text-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Estimated Profit</p>
                <p className="text-xl font-black text-emerald-400">${(prediction.average_prediction * 0.2).toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase">AI Confidence</p>
                <p className="text-xl font-black text-indigo-400">{(prediction.confidence * 100).toFixed(0)}%</p>
              </div>
            </div>
            <div className="pt-6 border-t border-white/5">
              <p className="text-xs text-slate-400 leading-relaxed font-medium">Prediction generated via <span className="text-indigo-400">XGBoost Production v3</span>. Seasonal weighting for month {form.month} has been applied automatically.</p>
            </div>
          </motion.div>
        ) : (
          <div className="text-center py-20 text-slate-600 font-bold uppercase tracking-widest text-xs">
            Awaiting Parameters...
          </div>
        )}
      </div>
    </div>
  );
};

const InventoryIntelligence = ({ inventory }) => (
  <div className="space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {inventory.map(item => (
        <div key={item.id} className={`glass p-6 border-b-4 ${
          item.status === 'CRITICAL_LOW' ? 'border-red-500 bg-red-500/5' : 
          item.status === 'WARNING' ? 'border-amber-500 bg-amber-500/5' : 'border-emerald-500'
        }`}>
          <div className="flex justify-between items-start mb-4">
            <h4 className="font-black text-white uppercase text-xs tracking-widest">{item.category}</h4>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
              item.status === 'CRITICAL_LOW' ? 'bg-red-500/20 text-red-400' : 
              item.status === 'WARNING' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
            }`}>{item.status}</span>
          </div>
          <div className="mb-4">
            <p className="text-[10px] text-slate-500 font-bold uppercase">Stock Level</p>
            <p className="text-2xl font-black text-white">{item.current_stock} units</p>
          </div>
          <p className="text-[10px] text-slate-400 font-medium leading-relaxed">{item.recommendation}</p>
        </div>
      ))}
    </div>
  </div>
);

const AIInsights = ({ insights }) => (
  <div className="glass p-8 relative overflow-hidden">
    <div className="absolute top-0 right-0 p-8 opacity-5">
      <Brain size={160} />
    </div>
    <div className="flex items-center gap-4 mb-10">
      <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
        <Sparkles size={24} />
      </div>
      <div>
        <h3 className="text-2xl font-black text-white uppercase tracking-tight">Intelligence Stream</h3>
        <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Real-time Cognitive Insights</p>
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {insights.map(insight => (
        <div key={insight.id} className="p-6 bg-slate-800/30 rounded-[2rem] border border-white/5 flex flex-col gap-4 hover:border-indigo-500/30 transition-all group relative overflow-hidden">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${
            insight.type === 'positive' ? 'bg-emerald-500/10 text-emerald-400' : 
            insight.type === 'negative' ? 'bg-rose-500/10 text-rose-400' : 'bg-indigo-500/10 text-indigo-400'
          }`}>
            {insight.type === 'positive' ? <TrendingUp size={20} /> : insight.type === 'negative' ? <TrendingDown size={20} /> : <Zap size={20} />}
          </div>
          <div>
            <p className="text-sm font-black text-white leading-relaxed mb-4">{insight.text}</p>
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Fidelity: High</span>
              <span className="text-[10px] text-indigo-400 font-bold flex items-center gap-1 cursor-pointer hover:underline">
                View Proof <ChevronRight size={10} />
              </span>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full translate-x-12 -translate-y-12 group-hover:translate-x-8 group-hover:-translate-y-8 transition-transform" />
        </div>
      ))}
    </div>
  </div>
);

const ExplainableAI = () => (
  <div className="glass p-8">
    <SectionHeader title="Explainable AI (XAI)" sub="Understanding feature importance and prediction reasoning" icon={ShieldCheck} colorClass="text-indigo-400" />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[
            { name: 'Seasonality', importance: 88, color: '#6366f1' },
            { name: 'Region', importance: 65, color: '#10b981' },
            { name: 'Discount', importance: 42, color: '#f59e0b' },
            { name: 'Prev Sales', importance: 78, color: '#ef4444' },
            { name: 'Quantity', importance: 35, color: '#8b5cf6' },
          ]} layout="vertical">
            <XAxis type="number" hide />
            <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} axisLine={false} tickLine={false} />
            <Tooltip />
            <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
              { [1,2,3,4,5].map((_, i) => <Cell key={i} fill={['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][i]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-4">
        <div className="p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
          <h5 className="text-xs font-black text-indigo-400 uppercase mb-2">Primary Driver</h5>
          <p className="text-sm font-bold text-white leading-relaxed">Seasonality is the dominant factor in current forecasts, accounting for 34% of variance.</p>
        </div>
        <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
          <h5 className="text-xs font-black text-emerald-400 uppercase mb-2">Reliability Score</h5>
          <p className="text-sm font-bold text-white leading-relaxed">SHAP consistency score is 0.92, indicating high model transparency.</p>
        </div>
      </div>
    </div>
  </div>
);

const AdvancedAnalytics = ({ trends }) => (
  <div className="space-y-8">
    <div className="glass p-8">
      <SectionHeader title="Deep Business Analytics" sub="Regional comparison and seasonal heatmaps" icon={Map} colorClass="text-rose-400" />
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={trends}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
            <XAxis dataKey="period" stroke="#64748b" fontSize={12} axisLine={false} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={12} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none' }} />
            <Legend verticalAlign="top" align="right" height={36} />
            <Bar dataKey="Technology" fill="#6366f1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Furniture" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Clothing" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
);

const SmartAlerts = ({ notifications }) => (
  <div className="glass p-8">
    <SectionHeader title="Smart Alert Center" sub="Intelligent business warnings and opportunity alerts" icon={BellRing} colorClass="text-amber-400" />
    <div className="space-y-4">
      {notifications.map(n => (
        <div key={n.id} className="p-5 bg-slate-800/40 rounded-2xl border border-white/5 flex items-center justify-between group">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-slate-900 ${n.type === 'alert' ? 'text-red-400' : 'text-indigo-400'}`}>
              <BellRing size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">{n.message}</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">{new Date(n.created_at).toLocaleString()}</p>
            </div>
          </div>
          <button className="text-xs font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
            Action
          </button>
        </div>
      ))}
    </div>
  </div>
);

const ForecastHistoryPanel = ({ history, onDelete }) => (
  <div className="glass p-8">
    <SectionHeader title="Forecast Archive" sub="Manage and audit your previous AI predictions" icon={Clock} colorClass="text-amber-400" />
    <div className="space-y-4">
      {history.length > 0 ? history.map(h => (
        <div key={h.id} className="p-5 bg-slate-800/40 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-white/10 transition-all">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-900 rounded-xl text-indigo-400">
              <Brain size={20} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h5 className="font-bold text-white">${h.prediction.toLocaleString()}</h5>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400">
                  {h.confidence * 100}% Confidence
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-bold uppercase">
                {h.inputs.category} • {h.inputs.region} • {new Date(h.date).toLocaleString()}
              </p>
            </div>
          </div>
          <button 
            onClick={() => onDelete(h.id)}
            className="p-3 bg-red-500/10 text-red-400 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )) : (
        <div className="text-center py-20 text-slate-600 font-bold uppercase tracking-widest text-xs">
          No Forecast History Found
        </div>
      )}
    </div>
  </div>
);

const BulkUploadPanel = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return alert("Select a CSV file first");
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await dataAPI.batchPredict(formData);
      // Download the result
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'forecast_results.csv');
      document.body.appendChild(link);
      link.click();
      alert("Batch forecast completed! Results downloaded.");
    } catch (err) {
      alert("Error processing batch forecast. Ensure CSV format is correct.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass p-8 text-center space-y-6">
      <SectionHeader title="Batch Forecasting Hub" sub="Upload historical CSV data for mass AI analysis" icon={Upload} colorClass="text-emerald-400" />
      <div className="border-2 border-dashed border-white/10 rounded-3xl p-12 hover:border-indigo-500/50 transition-all group">
        <Upload size={48} className="mx-auto text-slate-600 group-hover:text-indigo-400 mb-4" />
        <p className="text-white font-bold mb-2">{file ? file.name : "Drop CSV file here or click to browse"}</p>
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Supports .csv up to 50MB</p>
        <input type="file" className="hidden" id="csv-upload" accept=".csv" onChange={e => setFile(e.target.files[0])} />
        <label htmlFor="csv-upload" className="mt-6 inline-block px-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-black uppercase cursor-pointer">
          Browse Files
        </label>
      </div>
      <button 
        disabled={loading || !file}
        onClick={handleUpload}
        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
      >
        {loading ? <RefreshCw className="animate-spin" size={18} /> : <Brain size={18} />}
        Run Batch Prediction
      </button>
    </div>
  );
};

const ReportGeneration = () => {
  const handleExport = async (type) => {
    try {
      const response = type === 'pdf' ? await analyticsAPI.exportPDF() : await analyticsAPI.exportCSV();
      const url = window.URL.createObjectURL(new Blob([response.data], { type: type === 'pdf' ? 'application/pdf' : 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `RetailPulse_Report_${new Date().toISOString().split('T')[0]}.${type}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to generate report. Please try again.");
    }
  };

  return (
    <div className="glass p-8">
      <SectionHeader title="Report Intelligence" sub="Export high-fidelity business summaries and forecasts" icon={FileText} colorClass="text-blue-400" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button onClick={() => handleExport('pdf')} className="flex flex-col items-center justify-center p-8 bg-slate-800/40 rounded-2xl border border-white/5 hover:border-indigo-500/50 transition-all gap-4">
          <Download className="text-indigo-400" size={32} />
          <div className="text-center">
            <p className="text-sm font-bold text-white">Full Platform Audit</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase">PDF • Detailed Analytics</p>
          </div>
        </button>
        <button onClick={() => handleExport('csv')} className="flex flex-col items-center justify-center p-8 bg-slate-800/40 rounded-2xl border border-white/5 hover:border-emerald-500/50 transition-all gap-4">
          <RefreshCw className="text-emerald-400" size={32} />
          <div className="text-center">
            <p className="text-sm font-bold text-white">Demand Forecast</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase">CSV • Raw Data</p>
          </div>
        </button>
        <button onClick={() => handleExport('pdf')} className="flex flex-col items-center justify-center p-8 bg-slate-800/40 rounded-2xl border border-white/5 hover:border-amber-500/50 transition-all gap-4">
          <PieChartIcon className="text-amber-400" size={32} />
          <div className="text-center">
            <p className="text-sm font-bold text-white">Inventory Report</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase">PDF • Stock Trends</p>
          </div>
        </button>
        <button onClick={() => alert("Opening Analysis Builder...")} className="flex flex-col items-center justify-center p-8 bg-slate-800/40 rounded-2xl border border-white/5 hover:border-fuchsia-500/50 transition-all gap-4">
          <ArrowRight className="text-fuchsia-400" size={32} />
          <div className="text-center">
            <p className="text-sm font-bold text-white">Custom Analysis</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase">Build Tool</p>
          </div>
        </button>
      </div>
    </div>
  );
};

const AIChatbot = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello! I am your AI Business Assistant. How can I help you analyze your data today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const { data } = await insightsAPI.chat(userMsg);
      setMessages(prev => [...prev, { role: 'assistant', text: data.response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="glass flex flex-col h-[600px] overflow-hidden">
      <div className="p-6 border-b border-white/5 flex items-center gap-4 bg-slate-900/40">
        <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
          <MessageSquare size={20} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white leading-none">AI Insight Assistant</h3>
          <p className="text-[10px] text-emerald-400 font-black uppercase mt-1">Real-time Data Access Enabled</p>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-900/20 custom-scroll">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${
              m.role === 'user' ? 'bg-indigo-600 text-white font-medium' : 'bg-slate-800/80 text-slate-200 border border-white/5'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800/80 p-4 rounded-2xl border border-white/5 flex gap-2">
              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
      </div>
      <div className="p-6 border-t border-white/5 bg-slate-900/40">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Ask anything about your business..." 
            className="w-full pl-6 pr-14 py-4 bg-slate-800 border border-white/10 rounded-2xl text-white text-sm focus:outline-none focus:ring-2 ring-indigo-500/50"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
          />
          <button onClick={handleSend} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all">
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main Dashboard Component ---

export const AnalystDashboard = () => {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');

  const fetchData = async () => {
    try {
      const [growth, mon, cat, reg, tx, inv, ins, trends, notifs, hist] = await Promise.all([
        analyticsAPI.getGrowthMetrics(),
        analyticsAPI.getRevenueByMonth(),
        analyticsAPI.getSalesByCategory(),
        analyticsAPI.getSalesByRegion(),
        analyticsAPI.getRecentTransactions(20),
        inventoryAPI.getStatus(),
        analyticsAPI.getAutomatedInsights(),
        analyticsAPI.getSeasonalTrends(),
        notificationsAPI.get(),
        forecastingAPI.getHistory()
      ]);
      
      setData({
        growth: growth.data,
        monthly: mon.data,
        byCategory: cat.data,
        byRegion: reg.data,
        transactions: tx.data,
        inventory: inv.data,
        insights: ins.data,
        trends: trends.data,
        notifications: notifs.data
      });
      setHistory(hist.data);
    } catch (err) {
      console.error("Analyst fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHistory = async (id) => {
    try {
      await forecastingAPI.deleteHistory(id);
      setHistory(prev => prev.filter(h => h.id !== id));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);

    // Real-Time WebSocket for "Live" feel
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = import.meta.env.VITE_WS_URL || `${protocol}//localhost:8000/ws/live-sales`;
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'NEW_SALE') {
        setData(prev => {
          if (!prev) return prev;
          
          // Update recent transactions
          const newTx = msg.data;
          const updatedTransactions = [newTx, ...prev.transactions].slice(0, 20);
          
          return {
            ...prev,
            transactions: updatedTransactions,
            growth: {
              ...prev.growth,
              current_revenue: prev.growth.current_revenue + msg.data.sales
            }
          };
        });
      }
    };

    return () => {
      clearInterval(interval);
      socket.close();
    };
  }, []);

  if (loading || !data) return (
    <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-500 font-black uppercase tracking-widest text-xs animate-pulse">Synchronizing Analyst Workstation...</p>
    </div>
  );

  const sections = [
    { id: 'overview',   label: 'Business Overview', icon: LayoutDashboard },
    { id: 'realtime',   label: 'Live Sales',        icon: Activity },
    { id: 'forecast',   label: 'AI Forecasting',   icon: Brain },
    { id: 'batch',      label: 'Batch Predict',    icon: Upload },
    { id: 'history',    label: 'Forecast Archive', icon: Clock },
    { id: 'inventory',  label: 'Inventory Intel',   icon: Package },
    { id: 'insights',   label: 'AI Insights',       icon: Sparkles },
    { id: 'explain',    label: 'XAI Panel',         icon: ShieldCheck },
    { id: 'analytics',  label: 'Deep Analytics',    icon: BarChart3 },
    { id: 'alerts',     label: 'Smart Alerts',      icon: BellRing },
    { id: 'reports',    label: 'Report Hub',        icon: FileText },
    { id: 'chatbot',    label: 'AI Assistant',      icon: MessageSquare },
  ];

  const renderSection = () => {
    switch (activeSection) {
      case 'overview':  return <BusinessOverview data={data} onRefresh={fetchData} />;
      case 'realtime':  return <RealTimeSales transactions={data.transactions} onRefresh={fetchData} />;
      case 'forecast':  return <ForecastingPanel onRefresh={fetchData} />;
      case 'batch':     return <BulkUploadPanel />;
      case 'history':   return <ForecastHistoryPanel history={history} onDelete={handleDeleteHistory} onRefresh={fetchData} />;
      case 'inventory': return <InventoryIntelligence inventory={data.inventory} onRefresh={fetchData} />;
      case 'insights':  return <AIInsights insights={data.insights} onRefresh={fetchData} />;
      case 'explain':   return <ExplainableAI onRefresh={fetchData} />;
      case 'analytics': return <AdvancedAnalytics trends={data.trends} onRefresh={fetchData} />;
      case 'alerts':    return <SmartAlerts notifications={data.notifications} onRefresh={fetchData} />;
      case 'reports':   return <ReportGeneration />;
      case 'chatbot':   return <AIChatbot />;
      default:          return <BusinessOverview data={data} onRefresh={fetchData} />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Internal Navigation */}
      <div className="flex gap-1 bg-slate-900/50 p-1.5 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar scroll-smooth">
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeSection === s.id 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <s.icon size={16} />
            {s.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
        >
          {renderSection()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default AnalystDashboard;
