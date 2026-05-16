import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, TrendingDown, ArrowUpRight, CheckCircle2, Clock, BarChart3, RefreshCw, ShoppingCart, Loader2 } from 'lucide-react';
import { inventoryAPI } from '../services/api';

export const Inventory = () => {
  const [loading, setLoading] = useState(true);
  const [inventoryState, setInventoryState] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [reorderingId, setReorderingId] = useState(null);
  const [reorderMsg, setReorderMsg] = useState(null);

  const loadInventoryData = async () => {
    setLoading(true);
    try {
      const res = await inventoryAPI.getStatus();
      setInventoryState(res.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Inventory API Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventoryData();
    // Auto-refresh every 2 minutes as fallback
    const interval = setInterval(loadInventoryData, 120000);

    // WebSocket for real-time stock depletion
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = import.meta.env.VITE_WS_URL || `${protocol}//localhost:8000/ws/live-sales`;
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === 'NEW_SALE') {
        // Deplete stock for the sold category in real-time
        setInventoryState(prev => prev.map(item => {
          if (item.category === msg.data.category) {
            const newStock = Math.max(0, item.current_stock - msg.data.quantity);
            const newDays = newStock / Math.max(item.daily_units_sold, 0.1);
            let newStatus = item.status;
            if (newDays < 7) newStatus = 'CRITICAL_LOW';
            else if (newDays < 14) newStatus = 'WARNING';
            else if (newDays > 60) newStatus = 'OVERSTOCK';
            else newStatus = 'HEALTHY';
            return { ...item, current_stock: newStock, days_of_stock: parseFloat(newDays.toFixed(1)), status: newStatus };
          }
          return item;
        }));
        setLastUpdated(new Date());
      }

      if (msg.type === 'REORDER_APPROVED') {
        // Refresh full data after reorder approval
        loadInventoryData();
      }
    };

    return () => { clearInterval(interval); socket.close(); };
  }, []);

  const handleReorder = async (item) => {
    setReorderingId(item.id);
    setReorderMsg(null);
    try {
      const qty = Math.ceil(item.daily_units_sold * 30);
      await inventoryAPI.createReorder(item.category, qty, item.status === 'CRITICAL_LOW' ? 'HIGH' : 'MEDIUM');
      setReorderMsg({ type: 'success', text: `✅ Reorder request for ${item.category} (${qty} units) sent to admin for approval!` });
    } catch (err) {
      setReorderMsg({ type: 'error', text: `❌ Failed to send reorder: ${err.response?.data?.detail || 'Try again'}` });
    } finally {
      setReorderingId(null);
      setTimeout(() => setReorderMsg(null), 5000);
    }
  };

  if (loading) return (
    <div className="flex h-[70vh] items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
    </div>
  );
  const criticalCount = inventoryState.filter(i => i.status === 'CRITICAL_LOW').length;
  const warningCount = inventoryState.filter(i => i.status === 'WARNING').length;
  const healthyCount = inventoryState.filter(i => i.status === 'HEALTHY').length;
  const overstockCount = inventoryState.filter(i => i.status === 'OVERSTOCK').length;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-bottom duration-500">
      {/* Reorder Message Banner */}
      {reorderMsg && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
          reorderMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {reorderMsg.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
          <p className="text-sm font-bold">{reorderMsg.text}</p>
        </div>
      )}

      {/* Header with real-time status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 rounded-xl">
            <Package className="text-amber-400" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Smart Inventory Intelligence</h2>
            <p className="text-slate-400 text-sm mt-1">Real-time stock monitoring & AI replenishment alerts</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock size={14} />
            {lastUpdated && <span>Updated {lastUpdated.toLocaleTimeString()}</span>}
          </div>
          <button
            onClick={loadInventoryData}
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-white px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-all"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass p-6 border-l-4 border-l-red-500">
          <div className="flex items-center gap-2 text-red-400 mb-2 font-bold">
            <AlertTriangle size={18} /> Critical Low Stock
          </div>
          <p className="text-3xl font-black text-white">{criticalCount}</p>
          <p className="text-sm text-slate-500 mt-1">Categories requiring immediate action</p>
        </div>
        <div className="glass p-6 border-l-4 border-l-amber-500">
          <div className="flex items-center gap-2 text-amber-400 mb-2 font-bold">
            <TrendingDown size={18} /> Warning Level
          </div>
          <p className="text-3xl font-black text-white">{warningCount}</p>
          <p className="text-sm text-slate-500 mt-1">Items needing attention soon</p>
        </div>
        <div className="glass p-6 border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-2 text-emerald-400 mb-2 font-bold">
            <CheckCircle2 size={18} /> Healthy Levels
          </div>
          <p className="text-3xl font-black text-white">{healthyCount}</p>
          <p className="text-sm text-slate-500 mt-1">Categories perfectly balanced</p>
        </div>
        <div className="glass p-6 border-l-4 border-l-purple-500">
          <div className="flex items-center gap-2 text-purple-400 mb-2 font-bold">
            <BarChart3 size={18} /> Overstock
          </div>
          <p className="text-3xl font-black text-white">{overstockCount}</p>
          <p className="text-sm text-slate-500 mt-1">Excess inventory detected</p>
        </div>
      </div>

      {/* Detailed Inventory Analysis */}
      <div className="glass overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h3 className="text-lg font-bold text-white">AI-Powered Inventory Analysis</h3>
          <p className="text-slate-400 text-sm mt-1">Based on real sales velocity and demand patterns</p>
        </div>
        <div className="divide-y divide-white/5">
          {inventoryState.map((item) => (
            <div key={item.id} className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h4 className="text-lg font-bold text-white">{item.category}</h4>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    item.status === 'CRITICAL_LOW' ? 'bg-red-500/20 text-red-400' :
                    item.status === 'WARNING' ? 'bg-amber-500/20 text-amber-400' :
                    item.status === 'OVERSTOCK' ? 'bg-purple-500/20 text-purple-400' :
                    'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {item.status.replace('_', ' ')}
                  </span>
                </div>
                
                {/* Key Metrics Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                  <div>
                    <p className="text-slate-500 text-xs uppercase font-semibold">Daily Velocity</p>
                    <p className="text-white font-bold">{item.daily_units_sold} units/day</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs uppercase font-semibold">Days of Stock</p>
                    <p className={`font-bold ${item.days_of_stock < 7 ? 'text-red-400' : item.days_of_stock < 14 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {item.days_of_stock} days
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs uppercase font-semibold">Monthly Revenue</p>
                    <p className="text-white font-bold">${item.monthly_revenue?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs uppercase font-semibold">Avg Sale Value</p>
                    <p className="text-white font-bold">${item.avg_sale_value?.toFixed(2)}</p>
                  </div>
                </div>

                <p className="text-sm text-slate-300 bg-white/5 p-3 rounded-lg border border-white/10">
                  <span className="font-semibold text-indigo-400">AI Recommendation:</span> {item.recommendation}
                </p>
              </div>
              
              <div className="flex flex-col gap-4 text-right lg:w-72">
                <div className="flex gap-8 justify-end">
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">Current Stock</p>
                    <p className="text-xl font-bold text-white">{item.current_stock} Units</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">Demand Score</p>
                    <p className="text-xl font-bold text-white flex items-center gap-1 justify-end">
                      {item.demand_velocity} 
                      <ArrowUpRight size={14} className={
                        item.demand_velocity > 80 ? 'text-red-400' :
                        item.demand_velocity > 60 ? 'text-amber-400' : 'text-emerald-400'
                      } />
                    </p>
                  </div>
                </div>

                {/* Reorder Button */}
                {(item.status === 'CRITICAL_LOW' || item.status === 'WARNING') && (
                  <button
                    onClick={() => handleReorder(item)}
                    disabled={reorderingId === item.id}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-indigo-600/20"
                  >
                    {reorderingId === item.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <ShoppingCart size={14} />
                    )}
                    {reorderingId === item.id ? 'PROCESSING...' : 'REORDER NOW'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Critical Alerts Section */}
      {criticalCount > 0 && (
        <div className="glass border-l-4 border-l-red-500 p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="text-red-400" size={24} />
            <div>
              <h3 className="text-lg font-bold text-white">Urgent Action Required</h3>
              <p className="text-red-400 text-sm">{criticalCount} categories need immediate restocking</p>
            </div>
          </div>
          <div className="space-y-2">
            {inventoryState
              .filter(item => item.status === 'CRITICAL_LOW')
              .map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                  <div>
                    <p className="font-bold text-white">{item.category}</p>
                    <p className="text-red-400 text-sm">Only {item.days_of_stock} days of stock remaining</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">Reorder: {Math.ceil(item.daily_units_sold * 30)} units</p>
                    <p className="text-red-400 text-sm">Priority: HIGH</p>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
};
