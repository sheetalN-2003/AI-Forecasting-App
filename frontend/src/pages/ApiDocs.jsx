import React from 'react';
import { Terminal, Code, Cpu, Shield, Globe, Zap, Copy, ExternalLink, Database } from 'lucide-react';

const ENDPOINTS = [
  {
    method: 'GET',
    path: '/analytics/dashboard',
    desc: 'Retrieve high-level KPI metrics (revenue, profit, orders) for the dashboard.',
    params: [],
    response: '{"total_revenue": 105200, "total_profit": 23400, ...}'
  },
  {
    method: 'POST',
    path: '/forecasting/predict',
    desc: 'Generate sales forecast using Random Forest and XGBoost ensemble.',
    params: ['region', 'category', 'quantity', 'discount', 'month'],
    response: '{"rf_prediction": 1200, "xgb_prediction": 1150, "average_prediction": 1175, ...}'
  },
  {
    method: 'GET',
    path: '/inventory/status',
    desc: 'Get real-time inventory levels and AI-driven restocking alerts.',
    params: [],
    response: '[{"category": "Electronics", "status": "CRITICAL_LOW", ...}]'
  },
  {
    method: 'WS',
    path: '/ws/live-sales',
    desc: 'WebSocket stream for real-time transaction updates and anomaly detection alerts.',
    params: [],
    response: '{"type": "NEW_SALE", "data": {...}, "alert": "Demand Spike!"}'
  }
];

export const ApiDocs = () => {
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-bottom duration-500 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4 p-8 glass overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Terminal size={120} />
        </div>
        <div className="p-4 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-600/30 relative z-10">
          <Code size={32} className="text-white" />
        </div>
        <div className="relative z-10">
          <h2 className="text-3xl font-black text-white">Developer API Interface</h2>
          <p className="text-slate-400 mt-1 max-w-xl">
            Integrate RetailPulse AI's predictive engine into your existing POS or ERP systems with our enterprise REST API and WebSockets.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Authentication</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              All requests must include a Bearer token in the header. Tokens can be generated via the <span className="text-indigo-400">/auth/login</span> endpoint.
            </p>
            <div className="p-3 bg-slate-900 rounded-lg font-mono text-[10px] text-indigo-300 border border-indigo-500/20">
              Authorization: Bearer {'<token>'}
            </div>
          </div>

          <div className="glass p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Base URL</h3>
            <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg group">
              <code className="text-xs text-emerald-400">https://api.retailpulse.ai/v1</code>
              <button 
                onClick={() => copyToClipboard('https://api.retailpulse.ai/v1')}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>

          <div className="p-6 bg-indigo-600/10 border border-indigo-600/20 rounded-2xl">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm mb-2">
              <Zap size={16} /> Python SDK
            </div>
            <p className="text-xs text-slate-400 mb-3">Install our wrapper to simplify integrations.</p>
            <div className="p-2.5 bg-slate-950 rounded text-[10px] font-mono text-slate-300">
              pip install retailpulse-sdk
            </div>
          </div>
        </div>

        {/* Documentation Content */}
        <div className="lg:col-span-3 space-y-8">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Database size={20} className="text-indigo-400" /> API Endpoints
          </h3>
          
          {ENDPOINTS.map((api, i) => (
            <div key={i} className="glass overflow-hidden border-l-4" style={{ borderColor: api.method === 'POST' ? '#8b5cf6' : api.method === 'WS' ? '#f59e0b' : '#6366f1' }}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-[10px] font-black ${
                      api.method === 'POST' ? 'bg-purple-500/20 text-purple-400' : 
                      api.method === 'WS' ? 'bg-amber-500/20 text-amber-400' : 
                      'bg-indigo-500/20 text-indigo-400'
                    }`}>
                      {api.method}
                    </span>
                    <code className="text-sm font-bold text-white">{api.path}</code>
                  </div>
                  <button className="text-slate-500 hover:text-white transition-colors">
                    <ExternalLink size={16} />
                  </button>
                </div>
                
                <p className="text-sm text-slate-400 mb-6">{api.desc}</p>
                
                {api.params.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-xs font-bold text-slate-300 uppercase mb-3">Request Parameters</h4>
                    <div className="flex flex-wrap gap-2">
                      {api.params.map(p => (
                        <span key={p} className="px-2.5 py-1 bg-slate-800 rounded-md text-[11px] text-slate-400 font-mono">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-slate-300 uppercase">Response Example</h4>
                    <span className="text-[10px] text-slate-500 font-mono">application/json</span>
                  </div>
                  <pre className="p-4 bg-slate-900 rounded-xl font-mono text-xs text-indigo-300 border border-white/5 overflow-x-auto">
                    {api.response}
                  </pre>
                </div>
              </div>
            </div>
          ))}

          {/* Webhook info */}
          <div className="p-8 border border-dashed border-slate-700 rounded-3xl space-y-4">
            <div className="flex items-center gap-3">
              <Globe size={20} className="text-indigo-400" />
              <h3 className="text-lg font-bold text-white">Event Webhooks</h3>
            </div>
            <p className="text-sm text-slate-500">
              Configure webhooks in your settings to receive POST requests for specific events like Low Stock Alerts or Anomaly Detected.
            </p>
            <button className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
              Read Webhook Documentation <ExternalLink size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
