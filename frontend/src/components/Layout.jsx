import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Bell, LayoutDashboard, Package, TrendingUp, Brain, 
  Settings as SettingsIcon, LogOut, X, LineChart, 
  ExternalLink, Sparkles, CheckCheck, AlertTriangle, Command,
  Sun, Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { notificationsAPI } from '../services/api';
import { CommandCenter } from './CommandCenter';

const NAV_ITEMS = [
  { id: 'dashboard',   icon: LayoutDashboard, label: 'Real-Time Analytics' },
  { id: 'forecasting', icon: LineChart,       label: 'AI Forecasting Engine' },
  { id: 'inventory',   icon: Package,         label: 'Inventory Intelligence' },
  { id: 'insights',    icon: Brain,           label: 'Live Insights Chatbot' },
  { id: 'api',         icon: ExternalLink,    label: 'Developer Interface' },
  { id: 'settings',    icon: SettingsIcon,    label: 'Platform Settings' },
];

const PAGE_TITLES = {
  dashboard:   { title: 'Real-Time Dashboard',   sub: 'Live retail analytics and streaming metrics' },
  adminDashboard: { title: 'Admin Control Panel', sub: 'Platform management and system monitoring' },
  forecasting: { title: 'AI Forecasting Engine', sub: 'Ensemble ML prediction and SHAP explainability' },
  inventory:   { title: 'Inventory Intelligence',sub: 'Smart stock levels and optimization alerts' },
  insights:    { title: 'AI Insights Chatbot',   sub: 'Natural language business queries' },
  api:         { title: 'Developer API Interface', sub: 'Technical specifications and endpoints' },
  settings:    { title: 'Platform Settings',     sub: 'Manage data, users, and deployment health' },
};

const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
  <div
    onClick={onClick}
    className={`flex items-center space-x-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 ${
      active
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
        : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
    }`}
  >
    <Icon size={19} />
    <span className="font-medium text-sm">{label}</span>
    {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/80" />}
  </div>
);

export const Layout = ({ children, activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [globalAlert, setGlobalAlert] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const notifRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  const page = (activeTab === 'dashboard' && user?.role === 'Admin') 
    ? PAGE_TITLES.adminDashboard 
    : (PAGE_TITLES[activeTab] || PAGE_TITLES.dashboard);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await notificationsAPI.get();
      setNotifications(data);
    } catch (err) {}
  }, []);

  const markAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (err) {}
  };

  const dismissNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  useEffect(() => {
    fetchNotifications();
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = import.meta.env.VITE_WS_URL || `${protocol}//localhost:8000/ws/live-sales`;
    // Pass user info for presence tracking (Phase 3.1)
    const socket = new WebSocket(`${wsUrl}?username=${user?.username || 'Guest'}&role=${user?.role || 'Viewer'}`);

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'NEW_SALE' && msg.alert) {
        fetchNotifications();
      } else if (msg.type === 'ANOMALY_DETECTED') {
        setGlobalAlert(msg.data);
        fetchNotifications();
        setTimeout(() => setGlobalAlert(null), 8000);
      } else if (msg.type === 'PRESENCE_UPDATE') {
        setActiveUsers(msg.data);
      }
    };

    const interval = setInterval(fetchNotifications, 10000); 
    return () => {
      clearInterval(interval);
      socket.close();
    };
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => n.is_read === 0).length;

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <CommandCenter setActiveTab={setActiveTab} />

      <AnimatePresence>
        {globalAlert && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[10000] w-full max-w-2xl px-4"
          >
            <div className={`glass p-4 border-l-4 ${globalAlert.type === 'SPIKE' ? 'border-l-indigo-500' : 'border-l-red-500'} shadow-2xl flex items-center justify-between gap-4 overflow-hidden relative group`}>
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-4 relative z-10">
                <div className={`p-2 rounded-xl ${globalAlert.type === 'SPIKE' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-red-500/20 text-red-400'}`}>
                  <AlertTriangle size={20} className="animate-pulse" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">AI Engine Alert • {globalAlert.category}</p>
                  <p className="text-sm font-bold text-white">{globalAlert.message}</p>
                </div>
              </div>
              <button onClick={() => setGlobalAlert(null)} className="p-2 text-slate-500 hover:text-white transition-colors relative z-10">
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <aside className="w-64 border-r border-white/10 bg-slate-900/50 backdrop-blur-xl p-6 flex flex-col justify-between flex-shrink-0">
        <div className="space-y-8">
          <div className="p-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <TrendingUp size={24} className="text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black text-white tracking-tight">Retail<span className="text-indigo-400">Pulse</span></span>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">AI Platform</span>
            </div>
          </div>

          <nav className="space-y-1.5 flex-1 mt-6">
            {NAV_ITEMS.map(item => (
              <SidebarItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                active={activeTab === item.id}
                onClick={() => setActiveTab(item.id)}
              />
            ))}
          </nav>
        </div>

        <div>


          {/* User */}
          <div className="p-4 bg-slate-800/50 rounded-2xl border border-white/5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-black text-white">
                {user?.username?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{user?.username ?? 'User'}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.role ?? 'Member'}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center justify-center space-x-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 py-2 rounded-lg transition-all"
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto relative">
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between px-8 py-4 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
          <div>
            <h2 className="text-xl font-bold text-white">{page.title}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{page.sub}</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Live Session Counter */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Live: 14 Active Sessions</span>
            </div>

            <div className="flex items-center gap-6">
            {/* Theme Toggle (Phase 4.2) */}
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2.5 bg-slate-900 rounded-xl text-slate-400 hover:text-white border border-white/5 transition-all"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Presence Avatars (Phase 3.1) */}
            <div className="hidden md:flex items-center -space-x-2 mr-2">
              {activeUsers.slice(0, 4).map((u, i) => (
                <div 
                  key={u.username}
                  title={`${u.username} (${u.role})`}
                  className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[10px] font-black text-indigo-400 group relative"
                >
                  {u.username[0].toUpperCase()}
                  <div className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border border-slate-900" />
                </div>
              ))}
              {activeUsers.length > 4 && (
                <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[9px] font-bold text-slate-500">
                  +{activeUsers.length - 4}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="relative p-2.5 bg-slate-900 rounded-xl text-slate-400 hover:text-white border border-white/5 hover:border-indigo-500/50 transition-all"
            >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full text-[9px] font-black text-white flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifs && (
                <div className="absolute right-0 mt-3 w-96 glass border border-white/10 shadow-2xl z-50 overflow-hidden rounded-2xl">
                  <div className="p-4 border-b border-white/5 flex justify-between items-center bg-slate-900/90">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">Live Alerts</h4>
                      {unreadCount > 0 && <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full">{unreadCount} New</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllRead}
                          className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-emerald-400 font-bold uppercase tracking-widest transition-colors"
                        >
                          <CheckCheck size={12} /> All Read
                        </button>
                      )}
                      <button onClick={() => setShowNotifs(false)} className="text-slate-500 hover:text-white">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto bg-slate-950/90 divide-y divide-white/5">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <Bell size={24} className="text-slate-700 mx-auto mb-2" />
                        <p className="text-slate-500 text-xs font-bold">No active alerts</p>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`p-4 hover:bg-white/5 transition-colors group relative ${n.is_read ? 'opacity-50' : ''}`}>
                          <div className="flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.is_read ? 'bg-slate-700' : n.type === 'alert' ? 'bg-red-400 animate-pulse' : 'bg-indigo-400 animate-pulse'}`} />
                            <div className="flex-1 min-w-0">
                              {n.title && <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">{n.title}</p>}
                              <p className="text-xs text-slate-200 leading-relaxed font-medium">{n.message}</p>
                              <p className="text-[10px] text-slate-600 mt-1">{new Date(n.created_at).toLocaleTimeString()}</p>
                            </div>
                            <button
                              onClick={() => dismissNotification(n.id)}
                              className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-white transition-all flex-shrink-0 mt-0.5"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="h-5 w-px bg-white/10" />
            <button onClick={() => setActiveTab('forecasting')} className="btn-primary flex items-center gap-2 py-2">
              <Sparkles size={14} />
              <span className="text-sm">New Forecast</span>
            </button>
          </div>
        </header>

        {/* Verification Banner */}
        {user?.is_verified === 0 && (
          <div className="mx-8 mt-6 p-4 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                <Bell size={20} className="text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Verify your enterprise email</p>
                <p className="text-xs text-indigo-300/70">Please verify your account to unlock advanced AI forecasting features.</p>
              </div>
            </div>
            <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-indigo-600/20">
              Resend Verification
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
};
