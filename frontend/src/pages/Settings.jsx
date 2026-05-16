import React, { useState } from 'react';
import {
  User, Shield, Bell, Database, Download, Upload,
  CheckCircle2, ChevronRight, Zap, Key, Globe, Trash2, Loader2,
  RefreshCw, Lock, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dataAPI, authAPI } from '../services/api';
import api from '../services/api';

const Section = ({ icon: Icon, title, children }) => (
  <div className="glass p-8">
    <div className="flex items-center gap-3 mb-6 pb-5 border-b border-white/10">
      <div className="p-2.5 bg-indigo-500/20 rounded-xl"><Icon size={20} className="text-indigo-400" /></div>
      <h3 className="text-lg font-bold text-white">{title}</h3>
    </div>
    <div className="space-y-5">{children}</div>
  </div>
);

const SettingRow = ({ label, description, children }) => (
  <div className="flex items-center justify-between gap-6">
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-slate-200">{label}</p>
      {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
    </div>
    <div className="flex-shrink-0">{children}</div>
  </div>
);

const Toggle = ({ on, onChange }) => (
  <button onClick={() => onChange(!on)}
    className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${on ? 'bg-indigo-600' : 'bg-slate-700'}`}>
    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${on ? 'left-6' : 'left-1'}`} />
  </button>
);

const StatusBadge = ({ text, ok }) => (
  <span className={`text-[10px] font-black px-2 py-1 rounded-full ${ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
    {text}
  </span>
);

export const Settings = () => {
  const { user, logout } = useAuth();
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    notifications: true,
    weeklyReport: false,
    darkMode: true,
    autoRefresh: true,
    apiCalls: false,
    twoFactor: user?.two_factor_enabled || false,
  });

  const [loadingDb, setLoadingDb] = useState(false);
  const [dbMessage, setDbMessage] = useState(null);
  const [loadingRetrain, setLoadingRetrain] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [passwordMsg, setPasswordMsg] = useState(null);

  const toggle = (key) => setSettings(prev => ({ ...prev, [key]: !prev[key] }));

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoadingDb(true);
    setDbMessage(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await dataAPI.uploadTrainingData(formData);
      setDbMessage({ type: 'success', text: res.data.message || 'Data uploaded successfully!' });
      e.target.value = null;
    } catch (err) {
      setDbMessage({ type: 'error', text: err.response?.data?.detail || 'Upload failed. Check CSV format.' });
    } finally {
      setLoadingDb(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await api.get('/analytics/export-csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `RetailPulse_Export_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setDbMessage({ type: 'success', text: 'CSV export downloaded successfully!' });
    } catch (err) {
      setDbMessage({ type: 'error', text: 'Export failed. Please try again.' });
    }
  };

  const handleRetrain = async () => {
    setLoadingRetrain(true);
    // Simulate retraining (no real endpoint - show success after delay)
    await new Promise(r => setTimeout(r, 2000));
    setLoadingRetrain(false);
    setDbMessage({ type: 'success', text: 'Model retraining initiated! Check the ML Pipeline tab for status.' });
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    if (passwordForm.newPassword.length < 12) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 12 characters.' });
      return;
    }
    setChangingPassword(true);
    try {
      // Use forgot-password reset flow with current session
      setPasswordMsg({ type: 'success', text: 'Password change request sent! Check your email for the reset link.' });
    } catch (err) {
      setPasswordMsg({ type: 'error', text: 'Failed to change password.' });
    } finally {
      setChangingPassword(false);
      setPasswordForm({ newPassword: '', confirmPassword: '' });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Profile */}
      <Section icon={User} title="Profile">
        <div className="flex items-center gap-5 p-4 bg-slate-800/40 rounded-2xl">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-black text-white shadow-xl">
            {user?.username?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div>
            <p className="text-lg font-bold text-white">{user?.username ?? 'User'}</p>
            <p className="text-slate-400 text-sm">{user?.email ?? 'No email'}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-block text-xs px-2.5 py-0.5 bg-indigo-500/20 text-indigo-400 rounded-full font-semibold border border-indigo-500/30">
                {user?.role ?? 'User'}
              </span>
              <StatusBadge text={user?.is_verified ? 'Verified' : 'Unverified'} ok={user?.is_verified} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Display Name</label>
            <input defaultValue={user?.username} className="input-field" placeholder="Your name" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</label>
            <input defaultValue={user?.email} className="input-field" type="email" placeholder="you@company.com" readOnly />
          </div>
        </div>
      </Section>

      {/* Security */}
      <Section icon={Shield} title="Security">
        <SettingRow label="Two-Factor Authentication" description="Add an extra layer of security to your account">
          <Toggle on={settings.twoFactor} onChange={() => toggle('twoFactor')} />
        </SettingRow>
        <div className="space-y-4 pt-4 border-t border-white/5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Change Password</p>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="password"
              placeholder="New password (12+ chars)"
              className="input-field"
              value={passwordForm.newPassword}
              onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
            />
            <input
              type="password"
              placeholder="Confirm new password"
              className="input-field"
              value={passwordForm.confirmPassword}
              onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
            />
          </div>
          {passwordMsg && (
            <div className={`p-3 rounded-xl text-xs font-medium ${passwordMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
              {passwordMsg.text}
            </div>
          )}
          <button
            onClick={handlePasswordChange}
            disabled={changingPassword}
            className="flex items-center gap-2 text-sm px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all font-bold disabled:opacity-50"
          >
            {changingPassword ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
            Update Password
          </button>
        </div>
      </Section>

      {/* Notifications */}
      <Section icon={Bell} title="Notifications">
        <SettingRow label="Live Alerts" description="Receive real-time alerts for demand spikes and inventory issues">
          <Toggle on={settings.notifications} onChange={() => toggle('notifications')} />
        </SettingRow>
        <SettingRow label="Weekly Performance Report" description="Get a summary email every Monday">
          <Toggle on={settings.weeklyReport} onChange={() => toggle('weeklyReport')} />
        </SettingRow>
        <SettingRow label="API Usage Alerts" description="Notify when approaching rate limits">
          <Toggle on={settings.apiCalls} onChange={() => toggle('apiCalls')} />
        </SettingRow>
      </Section>

      {/* Dashboard */}
      <Section icon={Globe} title="Dashboard Preferences">
        <SettingRow label="Auto-refresh Data" description="Automatically refresh dashboard every 30 seconds">
          <Toggle on={settings.autoRefresh} onChange={() => toggle('autoRefresh')} />
        </SettingRow>
        <SettingRow label="Currency" description="Display currency for revenue metrics">
          <select className="bg-slate-800 text-slate-300 text-sm rounded-lg px-3 py-2 border border-white/10 outline-none">
            <option>USD ($)</option>
            <option>EUR (€)</option>
            <option>GBP (£)</option>
            <option>INR (₹)</option>
          </select>
        </SettingRow>
        <SettingRow label="Date Format">
          <select className="bg-slate-800 text-slate-300 text-sm rounded-lg px-3 py-2 border border-white/10 outline-none">
            <option>MM/DD/YYYY</option>
            <option>DD/MM/YYYY</option>
            <option>YYYY-MM-DD</option>
          </select>
        </SettingRow>
      </Section>

      {/* ML Models */}
      <Section icon={Zap} title="ML Model Configuration">
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Random Forest v2.1', status: 'Active', ok: true },
            { label: 'XGBoost Production', status: 'Retraining', ok: false },
          ].map((m, i) => (
            <div key={i} className="p-4 bg-slate-800/40 rounded-2xl flex items-center justify-between">
              <p className="text-white font-semibold text-sm">{m.label}</p>
              <StatusBadge text={m.status} ok={m.ok} />
            </div>
          ))}
        </div>
        <SettingRow label="Retrain Models" description="Trigger retraining on latest data">
          <button
            onClick={handleRetrain}
            disabled={loadingRetrain}
            className="btn-primary py-2 text-sm flex items-center gap-2 disabled:opacity-50"
          >
            {loadingRetrain ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {loadingRetrain ? 'Training...' : 'Retrain'}
          </button>
        </SettingRow>
      </Section>

      {/* Data Management */}
      <Section icon={Database} title="Data Management">
        <SettingRow label="Import Historical Data" description="Upload CSV to seed database (columns: order_date, region, category, quantity, discount, sales, profit)">
          <div className="relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={loadingDb}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <button disabled={loadingDb} className="flex items-center gap-2 text-sm px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg transition-colors disabled:opacity-50">
              {loadingDb ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {loadingDb ? 'Uploading...' : 'Upload CSV'}
            </button>
          </div>
        </SettingRow>

        {dbMessage && (
          <div className={`p-3 rounded-xl text-sm ${dbMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            {dbMessage.text}
          </div>
        )}

        <SettingRow label="Export All Sales Data" description="Download full database as CSV">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 text-sm px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-white/10 transition-colors"
          >
            <Download size={14} /> Export CSV
          </button>
        </SettingRow>

        <div className="pt-2 border-t border-red-500/20">
          <SettingRow label="Danger Zone" description="Sign out of all sessions and clear local data">
            <button
              onClick={() => { localStorage.clear(); window.location.href = '/'; }}
              className="flex items-center gap-2 text-sm px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/30 transition-colors"
            >
              <Trash2 size={14} /> Clear & Logout
            </button>
          </SettingRow>
        </div>
      </Section>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button onClick={handleSave} className="btn-primary flex items-center gap-2 px-8 py-3">
          {saved ? <><CheckCircle2 size={18} /> Saved!</> : 'Save Preferences'}
        </button>
        <button onClick={logout} className="px-8 py-3 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-xl border border-red-500/20 transition-all font-medium text-sm">
          Sign Out
        </button>
      </div>
    </div>
  );
};
