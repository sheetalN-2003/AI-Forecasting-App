import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Activity, Server, Cpu, Database, 
  Settings, Lock, TrendingUp, DollarSign, BellRing, 
  Brain, ShieldCheck, BarChart3, DatabaseBackup, 
  Globe, Terminal, AlertTriangle, UserCheck, 
  FileJson, Zap, RefreshCcw, Search, MoreHorizontal,
  LayoutDashboard, Package, Shield, Trash2
} from 'lucide-react';
import { adminAPI, inventoryAPI, analyticsAPI } from '../services/api';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, LineChart, Line,
  BarChart, Bar, Cell
} from 'recharts';

// --- Shared Components ---

const SectionHeader = ({ title, sub, icon: Icon, colorClass, onRefresh }) => {
  const handleExportPDF = async () => {
    try {
      const response = await analyticsAPI.exportPDF();
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `RetailPulse_Admin_Audit_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("PDF Export failed:", err);
      alert("Failed to generate PDF. Ensure the backend has reportlab installed.");
    }
  };

  return (
    <div className="flex items-center justify-between mb-8">
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
          onClick={handleExportPDF}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-slate-300 transition-all"
        >
          Export Audit PDF
        </button>
        <button 
          onClick={onRefresh}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-indigo-600/20 transition-all"
        >
          Refresh Data
        </button>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, sub, icon: Icon, trend, colorClass }) => (
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
        <span className={`text-[10px] font-black px-2 py-1 rounded-full ${trend > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <div>
      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">{title}</p>
      <h3 className="text-2xl font-black text-white tabular-nums">{value}</h3>
      {sub && <p className="text-[10px] text-slate-500 font-medium mt-1">{sub}</p>}
    </div>
    <div className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r from-transparent via-${colorClass.split('-')[1]}-500/20 to-transparent w-full opacity-0 group-hover:opacity-100 transition-opacity`} />
  </motion.div>
);

// --- Section Components ---

const OverviewPanel = ({ data }) => {
  const { overview } = data;
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard title="Total Revenue" value={`$${(overview.total_revenue / 1000).toFixed(1)}k`} trend={12} icon={DollarSign} colorClass="text-emerald-400" />
        <MetricCard title="Total Users" value={overview.total_users} trend={5} icon={Users} colorClass="text-indigo-400" />
        <MetricCard title="Predictions" value={overview.total_predictions.toLocaleString()} trend={28} icon={Brain} colorClass="text-fuchsia-400" />
        <MetricCard title="Active Sessions" value={overview.active_sessions} trend={-2} icon={Activity} colorClass="text-amber-400" />
        <MetricCard title="Transactions" value={overview.live_transactions.toLocaleString()} trend={15} icon={TrendingUp} colorClass="text-blue-400" />
        <MetricCard title="Datasets" value={overview.total_datasets} icon={Database} colorClass="text-rose-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass p-8">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <BarChart3 size={18} className="text-indigo-400" /> Platform Growth Trend
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[
                { name: 'Mon', users: 400, revenue: 2400 },
                { name: 'Tue', users: 600, revenue: 3200 },
                { name: 'Wed', users: 550, revenue: 2800 },
                { name: 'Thu', users: 800, revenue: 4500 },
                { name: 'Fri', users: 950, revenue: 5800 },
                { name: 'Sat', users: 1100, revenue: 6500 },
                { name: 'Sun', users: 1200, revenue: 7200 },
              ]}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" fillOpacity={1} fill="url(#colorUsers)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass p-8">
          <h3 className="text-lg font-bold text-white mb-6">User Distribution</h3>
          <div className="space-y-6">
            {[
              { label: 'Admins', value: data.users.admins, color: 'bg-fuchsia-500' },
              { label: 'Analysts', value: data.users.analysts, color: 'bg-indigo-500' },
              { label: 'Viewers', value: data.users.viewers || 0, color: 'bg-emerald-500' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-slate-400 uppercase tracking-widest">{item.label}</span>
                  <span className="text-white">{item.value}</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className={`${item.color} h-full rounded-full`} style={{ width: `${(item.value / data.users.total) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const SystemMonitoring = ({ data }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
    <div className="glass p-8">
      <SectionHeader title="Server Performance" sub="Live hardware metrics and resource allocation" icon={Server} colorClass="text-indigo-400" />
      <div className="space-y-8">
        <div>
          <div className="flex justify-between items-end mb-3">
            <div className="flex items-center gap-2">
              <Cpu size={16} className="text-indigo-400" />
              <span className="text-sm font-bold text-slate-300">CPU LOAD</span>
            </div>
            <span className="text-2xl font-black text-white tabular-nums">{data.system.cpu_usage}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-3 p-0.5">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 h-2 rounded-full transition-all duration-500" style={{ width: `${data.system.cpu_usage}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between items-end mb-3">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-emerald-400" />
              <span className="text-sm font-bold text-slate-300">MEMORY UTILIZATION</span>
            </div>
            <span className="text-2xl font-black text-white tabular-nums">{data.system.memory_usage}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-3 p-0.5">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 h-2 rounded-full transition-all duration-500" style={{ width: `${data.system.memory_usage}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
          <div className="p-4 bg-slate-800/30 rounded-xl">
            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Response Time</p>
            <p className="text-xl font-black text-white">{data.system.api_response_time_ms}ms</p>
          </div>
          <div className="p-4 bg-slate-800/30 rounded-xl">
            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Database Health</p>
            <p className="text-xl font-black text-emerald-400 flex items-center gap-2">
              <ShieldCheck size={16} /> {data.system.db_health}
            </p>
          </div>
        </div>
      </div>
    </div>
    <div className="glass p-8">
      <h3 className="text-lg font-bold text-white mb-6">Real-Time Load Distribution</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[
            { time: '12:00', load: 45 },
            { time: '13:00', load: 52 },
            { time: '14:00', load: 78 },
            { time: '15:00', load: 61 },
            { time: '16:00', load: 48 },
          ]}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
            <XAxis dataKey="time" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
            <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#0f172a', border: 'none' }} />
            <Bar dataKey="load" radius={[4, 4, 0, 0]}>
              { [45, 52, 78, 61, 48].map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry > 70 ? '#f43f5e' : '#6366f1'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
);

const UserManagement = ({ data, onAction }) => (
  <div className="glass p-0 overflow-hidden">
    <div className="p-8 border-b border-white/5 bg-slate-900/20 flex justify-between items-center">
      <div>
        <h3 className="text-xl font-black text-white uppercase tracking-tight">Active Directory</h3>
        <p className="text-xs text-slate-500 font-bold">Manage {data.users.total} enterprise identities</p>
      </div>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead className="bg-slate-800/30 text-[10px] uppercase font-black text-slate-500 tracking-[0.2em]">
          <tr>
            <th className="px-8 py-5">Identity Profile</th>
            <th className="px-8 py-5">Organization / Dept</th>
            <th className="px-8 py-5">Role & Clearance</th>
            <th className="px-8 py-5">System Status</th>
            <th className="px-8 py-5 text-right">Audit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {(data.users.list || []).map(user => (
            <tr key={user.id} className="hover:bg-white/5 transition-all group">
              <td className="px-8 py-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-black shadow-inner">
                    {user.username?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-black text-white tracking-tight">{user.username}</p>
                    <p className="text-[10px] text-slate-500 font-bold">{user.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-8 py-5">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{user.organization || 'RetailPulse'}</span>
                  <span className="text-[10px] font-bold text-slate-500">{user.department || 'Main HQ'}</span>
                </div>
              </td>
              <td className="px-8 py-5">
                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                  user.role === 'Admin' ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' :
                  user.role === 'Analyst' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-slate-500/10 border-slate-500/30 text-slate-400'
                }`}>
                  {user.role}
                </span>
              </td>
              <td className="px-8 py-5">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${user.is_verified ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`} />
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{user.is_verified ? 'Verified' : 'Pending'}</span>
                </div>
              </td>
              <td className="px-8 py-5 text-right">
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={() => onAction(user.id, 'verify')} 
                    title={user.is_verified ? "Revoke Verification" : "Verify Identity"}
                    className={`p-2.5 border rounded-xl transition-all ${
                      user.is_verified 
                        ? 'bg-emerald-500/10 hover:bg-emerald-500 hover:text-white border-emerald-500/20 text-emerald-400' 
                        : 'bg-indigo-500/10 hover:bg-indigo-500 hover:text-white border-indigo-500/20 text-indigo-400'
                    }`}
                  >
                    <UserCheck size={14} />
                  </button>
                  <button 
                    onClick={() => onAction(user.id, 'delete')} 
                    title="Delete User"
                    className="p-2.5 bg-red-500/5 hover:bg-red-500 hover:text-white border border-red-500/10 rounded-xl text-red-400 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const DatasetManagement = ({ data }) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
    <div className="lg:col-span-2 glass p-8">
      <SectionHeader title="Dataset Repository" sub="Manage and validate incoming retail data feeds" icon={DatabaseBackup} colorClass="text-rose-400" />
      <div className="space-y-4">
        {data.datasets.map(ds => (
          <div key={ds.id} className="p-4 bg-slate-800/40 border border-white/5 rounded-2xl flex items-center justify-between group hover:border-white/10 transition-all">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${ds.status === 'Error' ? 'bg-red-500/10 text-red-400' : 'bg-slate-800 text-slate-400'}`}>
                <FileJson size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">{ds.name}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">{ds.id}</span>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">• {ds.size}</span>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">• BY {ds.uploaded_by}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className={`text-xs font-black ${ds.status === 'Processed' ? 'text-emerald-400' : ds.status === 'Error' ? 'text-red-400' : 'text-indigo-400'}`}>
                  {ds.status}
                </p>
                <p className="text-[10px] text-slate-500 font-bold">Quality: {ds.quality}</p>
              </div>
              <button className="p-2 bg-slate-900 rounded-lg text-slate-500 hover:text-red-400 transition-colors">
                <RefreshCcw size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
    <div className="glass p-8 flex flex-col items-center justify-center text-center space-y-6">
      <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 border border-rose-500/20">
        <RefreshCcw size={32} />
      </div>
      <div>
        <h4 className="text-lg font-bold text-white">Ingestion Engine</h4>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">Platform is ready for new data streams. Auto-validation is enabled for CSV, JSON and Parquet.</p>
      </div>
      <button 
        onClick={() => alert("Redirecting to Bulk Upload Workspace...")}
        className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-rose-600/20 transition-all"
      >
        Upload New Dataset
      </button>
    </div>
  </div>
);

const ModelManagement = ({ data }) => (
  <div className="space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {data.models.map(model => (
        <div key={model.id} className="glass p-6 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-6">
            <div className="p-3 bg-slate-800 rounded-xl text-emerald-400">
              <Brain size={20} />
            </div>
            <span className={`text-[10px] font-black px-2 py-1 rounded-full ${
              model.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-indigo-500/10 text-indigo-400'
            }`}>
              {model.status}
            </span>
          </div>
          <h4 className="text-white font-bold mb-1">{model.name}</h4>
          <p className="text-[10px] text-slate-500 font-black uppercase mb-4">{model.type} • {model.version}</p>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Production Accuracy</p>
              <p className="text-2xl font-black text-white tabular-nums">{model.accuracy}</p>
            </div>
            <button className="p-2 bg-white/5 rounded-lg text-slate-400 hover:text-white transition-all">
              <Settings size={14} />
            </button>
          </div>
          <div className="absolute bottom-0 left-0 h-1 w-full bg-emerald-500/20" />
        </div>
      ))}
    </div>
    
    <div className="glass p-8">
      <SectionHeader title="Pipeline Control" sub="Automated training loops and performance benchmarking" icon={RefreshCcw} colorClass="text-emerald-400" />
      <div className="flex gap-4">
        <button className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-2xl transition-all">Start Batch Retraining</button>
        <button className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white font-black text-sm rounded-2xl transition-all">Compare Versions</button>
      </div>
    </div>
  </div>
);

const ForecastMonitoring = ({ data }) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
    <div className="lg:col-span-2 glass p-8">
      <SectionHeader title="Prediction Audit Logs" sub="Real-time tracking of AI output and error states" icon={Terminal} colorClass="text-amber-400" />
      <div className="space-y-2">
        {data.forecast_monitoring.logs.map(log => (
          <div key={log.id} className="grid grid-cols-5 items-center p-3 text-xs bg-slate-900/50 rounded-lg border border-white/5 font-mono">
            <span className="text-amber-400 font-bold">{log.id}</span>
            <span className="text-slate-400">{log.timestamp}</span>
            <span className="text-white font-bold">{log.model}</span>
            <span className="text-emerald-400">{log.accuracy}</span>
            <span className={`text-right font-black ${log.status === 'Success' ? 'text-emerald-500' : 'text-red-500'}`}>{log.status}</span>
          </div>
        ))}
      </div>
    </div>
    <div className="space-y-6">
      <div className="glass p-6">
        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Today's Predictions</p>
        <p className="text-3xl font-black text-white">{data.forecast_monitoring.total_predictions_today}</p>
      </div>
      <div className="glass p-6">
        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Avg Accuracy</p>
        <p className="text-3xl font-black text-emerald-400">{data.forecast_monitoring.avg_accuracy_today}</p>
      </div>
      <div className="glass p-6 border-red-500/20 bg-red-500/5">
        <div className="flex justify-between items-center mb-2">
          <p className="text-[10px] text-red-400 font-bold uppercase">Critical Failures</p>
          <AlertTriangle size={16} className="text-red-500" />
        </div>
        <p className="text-3xl font-black text-white">{data.forecast_monitoring.failed_alerts}</p>
      </div>
    </div>
  </div>
);

const AlertCenter = ({ data }) => (
  <div className="glass p-8">
    <SectionHeader title="Notification Hub" sub="Centralized system alerts and business warnings" icon={BellRing} colorClass="text-indigo-400" />
    <div className="space-y-4">
      {[
        { title: 'Inventory Warning', msg: 'Stock level for SKU-4492 is below threshold (5 units left).', type: 'Warning', color: 'text-amber-400' },
        { title: 'API Anomaly', msg: 'Sudden spike in latency detected on /forecasting endpoint.', type: 'Alert', color: 'text-red-400' },
        { title: 'New Training Completed', msg: 'Random Forest v2.2 is ready for deployment.', type: 'Info', color: 'text-emerald-400' },
      ].map((alert, i) => (
        <div key={i} className="p-5 bg-slate-800/40 rounded-2xl border border-white/5 flex gap-5">
          <div className={`p-3 rounded-xl bg-slate-900 ${alert.color}`}>
            <BellRing size={18} />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h5 className="font-bold text-white">{alert.title}</h5>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-900 ${alert.color}`}>
                {alert.type}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">{alert.msg}</p>
          </div>
          <button className="ml-auto text-xs text-slate-500 hover:text-white font-bold uppercase tracking-wider">Dismiss</button>
        </div>
      ))}
    </div>
  </div>
);

const SecurityAccess = ({ data }) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
    <div className="lg:col-span-1 space-y-6">
      <div className="glass p-8 relative overflow-hidden">
        <div className="flex justify-between items-start mb-6">
          <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
            <Shield size={24} />
          </div>
          <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 uppercase tracking-widest animate-pulse">Live Radar</span>
        </div>
        <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Security Perimeter</h3>
        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-8">System Shield Operational</p>
        
        <div className="space-y-4">
          <div className="p-5 bg-slate-900/50 rounded-2xl border border-white/5 group hover:border-indigo-500/30 transition-all">
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">Active JWT Mesh</p>
            <p className="text-3xl font-black text-white tabular-nums">{data.security.jwt_active_tokens} <span className="text-xs text-indigo-400 font-bold">TOKENS</span></p>
          </div>
          <div className="p-5 bg-slate-900/50 rounded-2xl border border-white/5 group hover:border-emerald-500/30 transition-all">
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">System Integrity</p>
            <p className="text-3xl font-black text-emerald-400">99.9% <span className="text-xs font-bold">SECURE</span></p>
          </div>
        </div>
      </div>

      <div className="glass p-8 border-amber-500/20">
        <h4 className="text-xs font-black text-amber-500 uppercase tracking-widest mb-6 flex items-center gap-2">
          <AlertTriangle size={14} /> Security Alerts
        </h4>
        <div className="space-y-4">
          {(data.security.events || []).map(event => (
            <div key={event.id} className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-white uppercase">{event.type}</p>
                <p className="text-[9px] text-amber-500/70 font-bold uppercase">{event.ip} • {event.time}</p>
              </div>
              <span className="text-[9px] font-black px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full">{event.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>

    <div className="lg:col-span-2 glass p-0 overflow-hidden">
      <div className="p-8 border-b border-white/5 bg-slate-900/20 flex justify-between items-center">
        <div>
          <h3 className="text-xl font-black text-white uppercase tracking-tight">Active Identity Sessions</h3>
          <p className="text-xs text-slate-500 font-bold">Real-time enterprise authorization log</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <Activity size={14} className="text-emerald-400 animate-pulse" />
          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{data.security.sessions.length} ACTIVE</span>
        </div>
      </div>
      <div className="overflow-y-auto max-h-[600px] scrollbar-none">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-slate-900 text-[10px] uppercase font-black text-slate-500 tracking-widest z-10">
            <tr>
              <th className="px-8 py-5">Session Node</th>
              <th className="px-8 py-5">Device Architecture</th>
              <th className="px-8 py-5">Geolocation</th>
              <th className="px-8 py-5 text-right">Access Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {(data.security.sessions || []).map(session => (
              <tr key={session.id} className="hover:bg-white/5 transition-all">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-indigo-400">
                      <Terminal size={14} />
                    </div>
                    <span className="text-xs font-black text-white uppercase tabular-nums">{session.ip || 'INTERNAL'}</span>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <p className="text-[10px] text-slate-400 font-bold truncate max-w-[200px]">{session.device || 'Enterprise Workstation'}</p>
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-2">
                    <Globe size={12} className="text-slate-500" />
                    <span className="text-[10px] font-black text-slate-300 uppercase">{session.location || 'Encrypted'}</span>
                  </div>
                </td>
                <td className="px-8 py-5 text-right">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{new Date(session.time).toLocaleTimeString()}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

const ApiMonitoring = ({ data }) => (
  <div className="space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <MetricCard title="Total API Calls" value={data.api_monitoring.total_requests.toLocaleString()} icon={Globe} colorClass="text-blue-400" />
      <MetricCard title="Avg Latency" value={data.api_monitoring.avg_latency} icon={Zap} colorClass="text-emerald-400" />
      <MetricCard title="Error Rate" value={data.api_monitoring.error_rate} icon={Activity} colorClass="text-red-400" />
    </div>
    <div className="glass p-0 overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-slate-800/30 text-[10px] uppercase font-bold text-slate-500 tracking-widest">
          <tr>
            <th className="px-8 py-4">Endpoint</th>
            <th className="px-8 py-4">Traffic</th>
            <th className="px-8 py-4">Avg Time</th>
            <th className="px-8 py-4">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {data.api_monitoring.endpoints.map((ep, i) => (
            <tr key={i} className="hover:bg-white/5 transition-colors">
              <td className="px-8 py-4 font-mono text-xs text-indigo-400">{ep.path}</td>
              <td className="px-8 py-4 text-sm font-black text-white">{ep.calls.toLocaleString()}</td>
              <td className="px-8 py-4 text-sm text-slate-300 font-medium">{ep.avg_time}</td>
              <td className="px-8 py-4">
                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded text-[10px] font-black uppercase tracking-wider">
                  Operational
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const AdminAnalytics = ({ data }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
    <div className="glass p-8">
      <SectionHeader title="Usage Intelligence" sub="Internal platform adoption and analyst activity" icon={BarChart3} colorClass="text-indigo-400" />
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="p-4 bg-slate-800/40 rounded-2xl">
          <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Power Analyst</p>
          <p className="text-lg font-black text-white">{data.admin_analytics.most_active_analyst}</p>
        </div>
        <div className="p-4 bg-slate-800/40 rounded-2xl">
          <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Favored Engine</p>
          <p className="text-lg font-black text-white">{data.admin_analytics.most_used_model}</p>
        </div>
      </div>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.admin_analytics.daily_traffic.map((v, i) => ({ day: i + 1, traffic: v }))}>
            <XAxis dataKey="day" hide />
            <Tooltip cursor={{fill: '#ffffff05'}} contentStyle={{ backgroundColor: '#0f172a', border: 'none' }} />
            <Bar dataKey="traffic" fill="#6366f1" radius={[4, 4, 4, 4]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
    <div className="glass p-8">
      <h3 className="text-xl font-black text-white mb-6">Analyst Contribution</h3>
      <div className="space-y-6">
        {[
          { name: 'Sarah Wilson', tasks: 124, growth: 12 },
          { name: 'David Chen', tasks: 89, growth: 5 },
          { name: 'Maria Garcia', tasks: 156, growth: 18 },
        ].map((analyst, i) => (
          <div key={i} className="flex items-center justify-between p-4 bg-slate-800/20 rounded-2xl border border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xs">
                {analyst.name[0]}
              </div>
              <div>
                <p className="text-sm font-bold text-white">{analyst.name}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase">{analyst.tasks} Models Trained</p>
              </div>
            </div>
            <span className="text-xs font-black text-emerald-400">+{analyst.growth}% Efficiency</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const AuditTrail = ({ logs }) => (
  <div className="glass p-0 overflow-hidden">
    <div className="p-8 border-b border-white/5 bg-slate-900/20">
      <h3 className="text-xl font-black text-white">System Audit Log</h3>
      <p className="text-xs text-slate-500">Immutable record of all administrative interventions</p>
    </div>
    <div className="max-h-[500px] overflow-y-auto scrollbar-none">
      <table className="w-full text-left">
        <thead className="sticky top-0 bg-slate-900 text-[10px] uppercase font-bold text-slate-500 tracking-widest z-10">
          <tr>
            <th className="px-8 py-4">Timestamp</th>
            <th className="px-8 py-4">Actor</th>
            <th className="px-8 py-4">Action</th>
            <th className="px-8 py-4">Target Resource</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {(logs || []).map(log => (
            <tr key={log.id} className="hover:bg-white/5 transition-colors">
              <td className="px-8 py-4 text-[10px] text-slate-400 font-medium">
                {new Date(log.timestamp).toLocaleString()}
              </td>
              <td className="px-8 py-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] font-black">
                    {log.username?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                  <span className="text-xs font-bold text-white">{log.username}</span>
                </div>
              </td>
              <td className="px-8 py-4">
                <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                  log.action?.includes('DELETE') ? 'bg-red-500/10 text-red-400' :
                  log.action?.includes('APPROVE') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'
                }`}>
                  {log.action}
                </span>
              </td>
              <td className="px-8 py-4">
                <p className="text-xs text-slate-300 font-medium">{log.resource}</p>
                <p className="text-[10px] text-slate-500">{log.details}</p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// --- Main Dashboard Component ---

export const AdminDashboard = () => {
  const [data, setData] = useState({
    security: { jwt_active_tokens: 0, suspicious_activities: 0, login_history: [] },
    auditLogs: []
  });
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');
  const [pendingReorders, setPendingReorders] = useState([]);

  const fetchData = async () => {
    try {
      const res = await adminAPI.getMetrics();
      const logs = await adminAPI.getAuditLogs();
      setData({ ...res.data, auditLogs: logs.data });
    } catch (err) {
      console.error("Admin fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReorderAction = async (id, action) => {
    try {
      if (action === 'approve') await inventoryAPI.approveReorder(id);
      else await inventoryAPI.rejectReorder(id);
      setPendingReorders(prev => prev.filter(r => r.id !== id));
      fetchData(); // Refresh metrics
    } catch (err) {
      console.error("Failed to process reorder action:", err);
    }
  };

  const handleUserAction = async (userId, action, value) => {
    try {
      if (action === 'verify') await adminAPI.toggleVerify(userId);
      else if (action === 'role') await adminAPI.changeRole(userId, value);
      else if (action === 'delete') {
        if (!confirm('Are you sure you want to delete this user?')) return;
        await adminAPI.deleteUser(userId);
      } else if (action === 'active') await adminAPI.toggleActive(userId);
      fetchData(); // Refresh list
    } catch (err) {
      console.error("User management error:", err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); 

    // Real-Time WebSocket for "Live" feel
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = import.meta.env.VITE_WS_URL || `${protocol}//localhost:8000/ws/live-sales`;
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'NEW_SALE') {
        setData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            overview: {
              ...prev.overview,
              total_revenue: prev.overview.total_revenue + msg.data.sales,
              live_transactions: prev.overview.live_transactions + 1
            }
          };
        });
      } else if (msg.type === 'NEW_USER_REGISTERED') {
        setData(prev => {
          if (!prev) return prev;
          // Prevent duplicates
          if (prev.users.list.some(u => u.id === msg.data.id)) return prev;
          return {
            ...prev,
            overview: {
              ...prev.overview,
              total_users: prev.overview.total_users + 1
            },
            users: {
              ...prev.users,
              total: prev.users.total + 1,
              list: [msg.data, ...prev.users.list]
            }
          };
        });
      } else if (msg.type === 'PRICE_OPTIMIZATION') {
        console.log("🚀 Real-time AI Insight Received:", msg.data);
      } else if (msg.type === 'REORDER_REQUEST') {
        setPendingReorders(prev => [msg.data, ...prev].slice(0, 5));
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
      <p className="text-slate-500 font-black uppercase tracking-widest text-xs animate-pulse">Initializing Administrative Systems...</p>
    </div>
  );

  const sections = [
    { id: 'overview',   label: 'Overview',      icon: LayoutDashboard },
    { id: 'monitoring', label: 'System Health', icon: Activity },
    { id: 'users',      label: 'Users',          icon: Users },
    { id: 'audit',      label: 'Audit Trail',    icon: ShieldCheck },
    { id: 'datasets',   label: 'Data Hub',       icon: Database },
    { id: 'models',     label: 'ML Pipeline',   icon: Brain },
    { id: 'forecasts',  label: 'Predictions',   icon: TrendingUp },
    { id: 'alerts',     label: 'Alerts',         icon: BellRing },
    { id: 'security',   label: 'Security',       icon: ShieldCheck },
    { id: 'api',        label: 'API Stats',      icon: Terminal },
    { id: 'analytics',  label: 'Admin Stats',    icon: BarChart3 },
  ];

  const renderSection = () => {
    switch (activeSection) {
      case 'overview':   return <OverviewPanel data={data} onRefresh={fetchData} />;
      case 'monitoring': return <SystemMonitoring data={data} onRefresh={fetchData} />;
      case 'users':      return <UserManagement data={data} onAction={handleUserAction} />;
      case 'audit':      return <AuditTrail logs={data.auditLogs} />;
      case 'datasets':   return <DatasetManagement data={data} onRefresh={fetchData} />;
      case 'models':     return <ModelManagement data={data} onRefresh={fetchData} />;
      case 'forecasts':  return <ForecastMonitoring data={data} onRefresh={fetchData} />;
      case 'alerts':     return <AlertCenter data={data} onRefresh={fetchData} />;
      case 'security':   return <SecurityAccess data={data} onRefresh={fetchData} />;
      case 'api':        return <ApiMonitoring data={data} onRefresh={fetchData} />;
      case 'analytics':  return <AdminAnalytics data={data} onRefresh={fetchData} />;
      default:           return <OverviewPanel data={data} onRefresh={fetchData} />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Horizontal Internal Nav */}
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

      {/* Real-time Inventory Approval Toast/Banner */}
      {pendingReorders.length > 0 && (
        <div className="fixed bottom-8 right-8 z-[100] w-96 space-y-3">
          <AnimatePresence>
            {pendingReorders.map(order => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, x: 100, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 100, scale: 0.9 }}
                className="glass p-5 border-l-4 border-l-indigo-500 shadow-2xl relative group"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <Package size={16} className="text-indigo-400" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Reorder Request #{order.id}</span>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-full">{order.priority}</span>
                </div>
                <h4 className="text-sm font-bold text-white mb-1">Restock: {order.category}</h4>
                <p className="text-xs text-slate-400 mb-4">Quantity: <span className="text-white font-bold">{order.quantity} units</span> requested by System Automations.</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleReorderAction(order.id, 'approve')}
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black rounded-lg transition-all"
                  >
                    APPROVE
                  </button>
                  <button 
                    onClick={() => handleReorderAction(order.id, 'reject')}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-red-400 text-[10px] font-black rounded-lg transition-all"
                  >
                    REJECT
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
