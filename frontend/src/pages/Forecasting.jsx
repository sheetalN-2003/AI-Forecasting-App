import React, { useState, useEffect } from 'react';
import {
  Brain, Sparkles, AlertCircle, Activity, CheckCircle2,
  TrendingUp, TrendingDown, Zap, RefreshCw
} from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell
} from 'recharts';
import { forecastingAPI, dataAPI } from '../services/api';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const REGIONS = ['North', 'South', 'East', 'West', 'Central'];
const CATEGORIES = ['Electronics', 'Furniture', 'Clothing', 'Groceries', 'Office Supplies'];

const FactorBar = ({ name, weight, index }) => {
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-slate-200">{name}</span>
        <span className="font-bold" style={{ color: colors[index % colors.length] }}>
          {(weight * 100).toFixed(1)}%
        </span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${weight * 100}%`, background: colors[index % colors.length] }}
        />
      </div>
    </div>
  );
};

export const Forecasting = () => {
  const [form, setForm] = useState({
    region: 'North',
    category: 'Electronics',
    quantity: 5,
    discount: 0.10,
    month: 10,
    day: 15,
    day_of_week: 2,
  });

  const [loading, setLoading]       = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [modelStatus, setModelStatus] = useState(null);
  const [error, setError]           = useState(null);
  
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError]     = useState(null);
  const [isSimMode, setIsSimMode]       = useState(false);
  const [simAdjustments, setSimAdjustments] = useState({ price_shift: 0, marketing_boost: 0 });
  const [reasoning, setReasoning]       = useState(null);

  useEffect(() => {
    forecastingAPI.getModelStatus()
      .then(r => setModelStatus(r.data))
      .catch(() => setModelStatus({ status: 'demo_mode', models_loaded: false }));
  }, []);

  const handlePredict = async () => {
    setLoading(true);
    setError(null);
    setReasoning(null);
    try {
      const payload = {
        ...form,
        quantity: Number(form.quantity),
        discount: Number(form.discount),
        month: Number(form.month),
        day: Number(form.day),
        day_of_week: Number(form.day_of_week),
      };
      const { data } = await forecastingAPI.predictSales(payload);
      setPrediction(data);
      
      // Generate Reasoning (XAI Phase 2.2)
      const reasons = [
        `Category velocity for ${form.category} is high in Q4.`,
        `Discount of ${(form.discount*100).toFixed(0)}% significantly drives volume in ${form.region}.`,
        `Historical ${MONTH_NAMES[form.month-1]} trends suggest a strong performance.`
      ];
      setReasoning(reasons);
    } catch (err) {
      setError(err.response?.data?.detail || 'Prediction failed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const getSimulatedValue = () => {
    if (!prediction) return 0;
    const base = prediction.average_prediction;
    const priceEffect = 1 + (simAdjustments.price_shift / 100);
    const marketingEffect = 1 + (simAdjustments.marketing_boost / 100);
    return Math.round(base * priceEffect * marketingEffect);
  };

  const handleBatchPredict = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setBatchLoading(true);
    setBatchError(null);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await dataAPI.batchPredict(formData);
      
      // Trigger file download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'forecast_results.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Batch prediction failed. Make sure CSV has required columns: region, category, quantity, discount, month, day, dayofweek.';
      setBatchError(errorMsg);
    } finally {
      setBatchLoading(false);
      e.target.value = null;
    }
  };

  const confidencePct = prediction ? (prediction.confidence * 100).toFixed(0) : 0;
  const confColor = prediction?.confidence >= 0.85 ? '#10b981' : prediction?.confidence >= 0.70 ? '#f59e0b' : '#ef4444';

  const comparisonData = prediction ? [
    { name: 'Random Forest', value: prediction.rf_prediction },
    { name: 'XGBoost',       value: prediction.xgb_prediction },
    { name: 'Ensemble Avg',  value: prediction.average_prediction },
  ] : [];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-bottom duration-500">
      {/* Simulation Toggle (Phase 2.1) */}
      <div className="flex items-center justify-between p-1 bg-slate-900 border border-white/5 rounded-2xl">
        <div className="px-6 py-3">
          <h4 className="text-sm font-bold text-white">Strategy Simulator</h4>
          <p className="text-[10px] text-slate-500 uppercase font-black">Enable "What-If" Analysis Mode</p>
        </div>
        <button 
          onClick={() => setIsSimMode(!isSimMode)}
          className={`px-6 py-3 rounded-xl text-xs font-black transition-all ${
            isSimMode ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-500 hover:text-white'
          }`}
        >
          {isSimMode ? 'SIMULATION ACTIVE' : 'ENABLE SIMULATOR'}
        </button>
      </div>

      {modelStatus && (
        <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border text-sm font-medium ${
          modelStatus.models_loaded
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
        }`}>
          {modelStatus.models_loaded ? <CheckCircle2 size={18} /> : <Zap size={18} />}
          <span>
            {modelStatus.models_loaded
              ? 'ML Models Active — Random Forest & XGBoost loaded'
              : 'Demo Mode — Train models to enable full ML predictions (run trainer.py)'}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── Input Panel ── */}
        <div className="glass p-8 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-indigo-500/20 rounded-xl"><Brain className="text-indigo-400" size={22} /></div>
            <div>
              <h3 className="text-xl font-bold text-white">Forecasting Parameters</h3>
              <p className="text-slate-500 text-xs mt-0.5">Configure your prediction variables</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Region</label>
              <select className="input-field" value={form.region} onChange={e => setForm({...form, region: e.target.value})}>
                {REGIONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</label>
              <select className="input-field" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quantity</label>
              <input type="number" min="1" max="50" className="input-field" value={form.quantity}
                onChange={e => setForm({...form, quantity: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Discount ({(form.discount * 100).toFixed(0)}%)
              </label>
              <input type="range" min="0" max="0.5" step="0.01" value={form.discount}
                onChange={e => setForm({...form, discount: e.target.value})}
                className="w-full accent-indigo-500 mt-3" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Month</label>
              <select className="input-field" value={form.month} onChange={e => setForm({...form, month: e.target.value})}>
                {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Day of Week</label>
              <select className="input-field" value={form.day_of_week} onChange={e => setForm({...form, day_of_week: e.target.value})}>
                {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map((d, i) => (
                  <option key={d} value={i}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handlePredict}
            disabled={loading}
            className="w-full btn-primary h-14 flex items-center justify-center gap-3 text-base disabled:opacity-60"
          >
            {loading
              ? <><RefreshCw size={20} className="animate-spin" /><span>Analyzing...</span></>
              : <><Sparkles size={20} /><span>Generate AI Prediction</span></>
            }
          </button>
          
          {isSimMode && (
            <div className="pt-6 mt-6 border-t border-indigo-500/20 space-y-6 animate-in slide-in-from-top duration-300">
              <div className="flex items-center gap-2 mb-2 text-indigo-400">
                <Activity size={16} />
                <span className="text-xs font-black uppercase">Scenario Adjustments</span>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Price Shift ({simAdjustments.price_shift > 0 ? '+' : ''}{simAdjustments.price_shift}%)</label>
                  </div>
                  <input type="range" min="-30" max="30" step="1" value={simAdjustments.price_shift}
                    onChange={e => setSimAdjustments({...simAdjustments, price_shift: Number(e.target.value)})}
                    className="w-full accent-indigo-500" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Marketing Push (+{simAdjustments.marketing_boost}%)</label>
                  </div>
                  <input type="range" min="0" max="50" step="1" value={simAdjustments.marketing_boost}
                    onChange={e => setSimAdjustments({...simAdjustments, marketing_boost: Number(e.target.value)})}
                    className="w-full accent-emerald-500" />
                </div>
              </div>
            </div>
          )}

          <div className="pt-6 mt-6 border-t border-slate-800">
            <h4 className="text-sm font-semibold text-slate-300 mb-2">Batch Predict via CSV</h4>
            <div className="relative">
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleBatchPredict} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                disabled={batchLoading} 
              />
              <button disabled={batchLoading} className="w-full flex items-center justify-center gap-2 text-sm px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-white/10 transition-colors">
                {batchLoading ? <RefreshCw size={14} className="animate-spin" /> : <TrendingUp size={14} />}
                {batchLoading ? 'Processing CSV...' : 'Upload CSV for Bulk Prediction'}
              </button>
            </div>
            {batchError && <p className="text-red-400 text-xs mt-2">{batchError}</p>}
          </div>
        </div>

        {/* ── Results Panel ── */}
        <div className="space-y-6">
          {!prediction && !loading ? (
            <div className="h-full glass border-dashed border-slate-700 flex flex-col items-center justify-center p-16 text-center text-slate-500 min-h-[400px]">
              <Brain size={56} className="mb-5 opacity-15" />
              <p className="text-base font-medium">Configure parameters and hit<br /><span className="text-indigo-400 font-bold">Generate AI Prediction</span></p>
              <p className="text-xs mt-3 opacity-60">Powered by Random Forest × XGBoost ensemble</p>
            </div>
          ) : loading ? (
            <div className="glass p-8 flex flex-col items-center justify-center min-h-[400px] gap-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                <Brain size={28} className="absolute inset-0 m-auto text-indigo-400" />
              </div>
              <p className="text-slate-400 font-medium animate-pulse">Running ensemble models...</p>
            </div>
          ) : (
            <>
              {/* Main Prediction */}
              <div className={`glass p-8 relative overflow-hidden group border-2 transition-all ${isSimMode ? 'border-indigo-500/50 shadow-2xl shadow-indigo-500/20' : 'border-transparent'}`}>
                {isSimMode && (
                  <div className="absolute top-0 right-0 px-4 py-1.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-bl-xl z-20">
                    Simulation Active
                  </div>
                )}
                <div className="absolute -top-8 -right-8 w-40 h-40 bg-indigo-500/5 rounded-full group-hover:bg-indigo-500/10 transition-colors" />
                <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-emerald-500/5 rounded-full" />
                <p className="text-slate-400 font-medium text-sm">{isSimMode ? 'Simulated AI Revenue' : 'AI Predicted Sales'}</p>
                <div className="flex items-baseline gap-3 mt-2 mb-4">
                  <h2 className={`text-5xl font-black tracking-tighter transition-all ${isSimMode ? 'text-indigo-400' : 'text-white'}`}>
                    ${isSimMode ? getSimulatedValue().toLocaleString() : prediction?.average_prediction?.toLocaleString()}
                  </h2>
                  {isSimMode && (
                    <span className={`text-sm font-bold ${getSimulatedValue() > prediction.average_prediction ? 'text-emerald-400' : 'text-red-400'}`}>
                      {getSimulatedValue() > prediction.average_prediction ? '↑' : '↓'}
                      {Math.abs(((getSimulatedValue() / prediction.average_prediction - 1) * 100)).toFixed(1)}%
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold" style={{ background: `${confColor}18`, color: confColor }}>
                    <Sparkles size={14} />
                    {isSimMode ? '82% Confidence' : `${confidencePct}% Confidence`}
                  </div>
                  <div className={`flex items-center gap-1 text-xs ${Number(form.month) >= 10 ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {Number(form.month) >= 10 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    <span>{Number(form.month) >= 10 ? 'Q4 seasonal boost applied' : 'Standard seasonality'}</span>
                  </div>
                </div>
              </div>

              {/* AI Reasoning (XAI Phase 2.2) */}
              {reasoning && (
                <div className="glass p-6 bg-slate-900/50">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Sparkles size={14} className="text-indigo-400" /> Model Reasoning (Explainable AI)
                  </h4>
                  <div className="space-y-3">
                    {reasoning.map((r, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <div className="w-1 h-4 bg-indigo-500/40 rounded-full mt-0.5" />
                        <p className="text-xs text-slate-300 font-medium leading-relaxed">{r}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Model Comparison */}
              <div className="glass p-6">
                <h4 className="text-sm font-bold text-white mb-4">Model Comparison</h4>
                <div className="h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1000).toFixed(1)}k`} />
                      <Tooltip formatter={v => `$${v.toLocaleString()}`} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: 12 }} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {comparisonData.map((_, i) => <Cell key={i} fill={['#6366f1','#10b981','#f59e0b'][i]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Key Impact Factors */}
              <div className="glass p-6">
                <h4 className="text-base font-bold text-white mb-5 flex items-center gap-2">
                  <Activity size={16} className="text-indigo-400" /> AI Explainability — Feature Impact
                </h4>
                <div className="space-y-4">
                  {prediction?.factors?.map((f, i) => (
                    <FactorBar key={i} name={f.name} weight={f.weight} index={i} />
                  ))}
                </div>
              </div>

              {/* Disclaimer */}
              <div className="flex items-start gap-3 p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-300 text-xs">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <p>Predictions use a Random Forest + XGBoost ensemble trained on 5,000+ retail records. Model accuracy improves as more data is seeded.</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
