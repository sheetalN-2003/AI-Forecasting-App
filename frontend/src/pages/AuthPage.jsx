import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Eye, EyeOff, Mail, Lock, User, ShieldCheck, ChevronRight,
  Loader2, AlertCircle, CheckCircle2, Sparkles, RefreshCw,
  ArrowLeft, Globe, Shield, Terminal
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const ROLES = [
  { value: 'User', label: 'Store User', color: 'emerald' },
  { value: 'Analyst', label: 'Data Analyst', color: 'indigo' },
  { value: 'Admin', label: 'System Admin', color: 'purple' },
];

const InputField = ({ icon: Icon, type = 'text', placeholder, value, onChange, rightIcon, disabled, label, id, name }) => (
  <div className="space-y-1.5">
    {label && <label htmlFor={id} className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{label}</label>}
    <div className="relative">
      <Icon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
      <input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value || ''}
        onChange={onChange}
        disabled={disabled}
        className="w-full bg-slate-900/50 border border-white/5 focus:border-indigo-500/40 rounded-xl pl-11 pr-11 py-3 text-sm text-slate-200 placeholder-slate-600 outline-none transition-all disabled:opacity-50"
      />
      {rightIcon && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightIcon}</div>}
    </div>
  </div>
);

export const AuthPage = () => {
  const { login } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register' 
  const [step, setStep] = useState('form'); // 'form' | 'otp'
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  const [form, setForm] = useState({
    name: '', username: '', email: '', password: '', confirmPassword: '',
    role: 'User', otp: ['', '', '', '', '', '']
  });

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...form.otp];
    newOtp[index] = value.slice(-1);
    setForm(p => ({ ...p, otp: newOtp }));
    if (value && index < 5) otpRefs[index + 1].current?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !form.otp[index] && index > 0) otpRefs[index - 1].current?.focus();
  };

  const f = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));
  const otpCode = form.otp.join('');

  // --- FLOW 1: Registration ---
  const handleRegisterInit = async (e) => {
    e?.preventDefault();
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      const { data } = await axios.post(`${API_BASE}/auth/register-init`, {
        name: form.name, username: form.username, email: form.email,
        password: form.password, role: form.role
      });
      setSuccess(data.message);
      if (data.code) {
        // Auto-fill for demo
        const digits = data.code.toString().split('').slice(0, 6);
        setForm(p => ({ ...p, otp: digits }));
      }
      setStep('otp');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally { setLoading(false); }
  };

  const handleVerifyRegistration = async () => {
    setLoading(true); setError('');
    try {
      const { data } = await axios.post(`${API_BASE}/auth/verify-registration`, {
        email: form.email,
        otp: otpCode,
        registration_data: {
          name: form.name, username: form.username, email: form.email,
          password: form.password, role: form.role
        }
      });
      login(data.access_token, data.user);
    } catch (err) {
      setError(err.response?.data?.detail || 'Verification failed');
    } finally { setLoading(false); }
  };

  // --- FLOW 2: Login ---
  const handleLogin = async (e) => {
    e?.preventDefault();
    setLoading(true); setError('');
    try {
      const payload = new URLSearchParams();
      payload.append('username', form.username);
      payload.append('password', form.password);
      const { data } = await axios.post(`${API_BASE}/auth/login`, payload);
      login(data.access_token, data.user);
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#05070a] text-slate-300 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Neural background mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(17,24,39,1)_0%,rgba(5,7,10,1)_100%)]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full opacity-20 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      <div className="w-full max-w-lg relative z-10">
        <div className="text-center mb-10 space-y-2">
          <div className="inline-flex items-center gap-3 p-2 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 mb-4">
            <Shield size={28} className="text-indigo-500" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter">RetailPulse <span className="text-indigo-500">AI</span></h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">Secure Enterprise Gateway</p>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 shadow-2xl shadow-black/50">
          {/* Mode Switcher */}
          {step === 'form' && (
            <div className="flex p-1 bg-black/40 rounded-2xl mb-8">
              {['login', 'register'].map(m => (
                <button key={m} onClick={() => { setMode(m); setError(''); }}
                  className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === m ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300'}`}>
                  {m === 'login' ? 'Authenticate' : 'Onboard'}
                </button>
              ))}
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <InputField id="login-username" name="username" icon={User} label="Identity" placeholder="Username" value={form.username} onChange={f('username')} />
              <InputField id="login-password" name="password" icon={Lock} label="Access Key" type={showPass ? 'text' : 'password'} placeholder="••••••••" value={form.password} onChange={f('password')}
                rightIcon={<button type="button" onClick={() => setShowPass(!showPass)} className="text-slate-600">{showPass ? <EyeOff size={16} /> : <Eye size={16} />}</button>}
              />
              {error && <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl text-red-400 text-[10px] font-bold flex items-center gap-3"><AlertCircle size={16} />{error}</div>}
              <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 transition-all active:scale-[0.98]">
                {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Enter Environment'}
              </button>
            </form>
          ) : (
            <>
              {step === 'form' ? (
                <form onSubmit={handleRegisterInit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <InputField id="reg-name" name="name" icon={User} label="Full Name" placeholder="John Doe" value={form.name} onChange={f('name')} />
                    <InputField id="reg-username" name="username" icon={Terminal} label="Username" placeholder="jdoe" value={form.username} onChange={f('username')} />
                  </div>
                  <InputField id="reg-email" name="email" icon={Mail} label="Corporate Email" placeholder="name@company.com" value={form.email} onChange={f('email')} />
                  <div className="grid grid-cols-2 gap-4">
                    <InputField id="reg-password" name="password" icon={Lock} label="Secret Key" type="password" placeholder="••••••••" value={form.password} onChange={f('password')} />
                    <InputField id="reg-confirm" name="confirmPassword" icon={ShieldCheck} label="Confirm Key" type="password" placeholder="••••••••" value={form.confirmPassword} onChange={f('confirmPassword')} />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">System Authorization</label>
                    <div className="grid grid-cols-3 gap-2">
                      {ROLES.map(r => (
                        <button type="button" key={r.value} onClick={() => setForm({ ...form, role: r.value })}
                          className={`py-2.5 rounded-xl border-2 text-[10px] font-black transition-all ${form.role === r.value ? `border-${r.color}-500/50 bg-${r.color}-500/10 text-white` : 'border-white/5 bg-white/5 text-slate-500 hover:text-slate-300'}`}>
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {error && <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl text-red-400 text-[10px] font-bold flex items-center gap-3"><AlertCircle size={16} />{error}</div>}
                  <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all">
                    {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Request Verification'}
                  </button>
                </form>
              ) : (
                <div className="space-y-8 animate-in fade-in zoom-in duration-300">
                  <div className="text-center">
                    <button onClick={() => setStep('form')} className="text-slate-500 hover:text-indigo-400 transition-colors flex items-center gap-2 text-[10px] font-black uppercase mb-4 mx-auto">
                      <ArrowLeft size={14} /> Back to Details
                    </button>
                    <h2 className="text-xl font-bold text-white mb-2">Verify Identity</h2>
                    <p className="text-xs text-slate-500">Security token dispatched to <span className="text-indigo-400 font-bold">{form.email}</span></p>
                  </div>

                  <div className="flex justify-center gap-3">
                    {form.otp.map((d, i) => (
                      <input key={i} ref={otpRefs[i]} type="text" maxLength={1} value={d} onChange={e => handleOtpChange(i, e.target.value)} onKeyDown={e => handleOtpKeyDown(i, e)}
                        className="w-12 h-16 text-center text-2xl font-black bg-black/40 border border-white/10 rounded-2xl text-white outline-none focus:border-indigo-500 transition-all"
                      />
                    ))}
                  </div>

                  {error && <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl text-red-400 text-[10px] font-bold flex items-center gap-3"><AlertCircle size={16} />{error}</div>}
                  <button onClick={handleVerifyRegistration} disabled={loading || otpCode.length < 6} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20">
                    {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Finalize Onboarding'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-12 flex flex-col items-center gap-4">
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-1">
              <ShieldCheck size={16} className="text-emerald-500" />
              <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">RSA-4096</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <RefreshCw size={16} className="text-indigo-500" />
              <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">JWT-ROTATE</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Terminal size={16} className="text-purple-500" />
              <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">TLS-SECURE</span>
            </div>
          </div>
          <p className="text-[9px] text-slate-700 font-bold uppercase tracking-[0.4em]">Multi-Tenant Intelligence Mesh</p>
        </div>
      </div>
    </div>
  );
};
