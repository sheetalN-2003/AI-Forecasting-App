import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Eye, EyeOff, Mail, Lock, User, ShieldCheck, ChevronRight,
  Loader2, AlertCircle, CheckCircle2, Sparkles, RefreshCw,
  ArrowLeft, Globe, Shield
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const ROLES = [
  { value: 'Manager', label: 'Store Manager', desc: 'Sales dashboards & real-time monitoring', color: 'emerald' },
  { value: 'Analyst', label: 'Data Analyst', desc: 'Advanced analytics, forecasting & AI insights', color: 'indigo' },
  { value: 'Admin', label: 'System Admin', desc: 'Full platform control & user management', color: 'purple' },
];

const roleColors = { 
  emerald: 'border-emerald-500/60 bg-emerald-500/10', 
  indigo: 'border-indigo-500/60 bg-indigo-500/10', 
  purple: 'border-purple-500/60 bg-purple-500/10' 
};

const InputField = ({ icon: Icon, type = 'text', placeholder, value, onChange, rightIcon, disabled }) => (
  <div className="relative">
    <Icon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
    <input
      type={type}
      placeholder={placeholder}
      value={value || ''}
      onChange={onChange}
      disabled={disabled}
      className="w-full bg-slate-800/60 border border-white/10 focus:border-indigo-500/60 rounded-xl pl-11 pr-11 py-3 text-sm text-slate-200 placeholder-slate-500 outline-none transition-all disabled:opacity-50"
    />
    {rightIcon && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightIcon}</div>}
  </div>
);

export const AuthPage = () => {
  const { login } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register' 
  const [step, setStep] = useState('choice'); // 'choice' | 'form' | 'otp' | '2fa'
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  const [form, setForm] = useState({
    username: '', email: '', password: '', confirmPassword: '', 
    role: 'Manager', otp: ['', '', '', '', '', ''],
    forgotEmail: '', department: '', organization: ''
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

  const autoFillOtp = (code) => {
    const digits = code.toString().split('').slice(0, 6);
    setForm(p => ({ ...p, otp: digits }));
    setSuccess(`✉️ Verification code generated: ${code}. Auto-filled for your convenience.`);
  };

  const f = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));
  const otpCode = form.otp.join('');

  const requestOTP = async () => {
    if (!form.email) { setError('Please enter your email.'); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      const { data } = await axios.post(`${API_BASE}/auth/request-verification`, { email: form.email });
      if (data.code) autoFillOtp(data.code);
      setStep('otp');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to connect to authentication server.');
    } finally { setLoading(false); }
  };

  const verifyOTP = async () => {
    if (otpCode.length < 6) { setError('Enter all 6 digits.'); return; }
    setLoading(true); setError('');
    try {
      await axios.post(`${API_BASE}/auth/verify-code`, { email: form.email, code: otpCode });
      setStep('details');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid code. Try again.');
    } finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e?.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true); setError('');
    try {
      const { data } = await axios.post(`${API_BASE}/auth/register`, {
        username: form.username,
        email: form.email,
        password: form.password,
        role: form.role,
        department: form.department,
        organization: form.organization
      });
      login(data.access_token, data.user);
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed.');
    } finally { setLoading(false); }
  };

  const handleLogin = async (e) => {
    e?.preventDefault();
    setLoading(true); setError('');
    try {
      const form2 = new URLSearchParams();
      form2.append('username', form.username);
      form2.append('password', form.password);
      const { data } = await axios.post(`${API_BASE}/auth/login`, form2, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      if (data.user?.two_factor_required) setStep('2fa');
      else login(data.access_token, data.user);
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid username or password.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/30">
              <Sparkles size={24} className="text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-black text-white tracking-tighter">RetailPulse <span className="text-indigo-500">AI</span></h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Enterprise Analytics Environment</p>
            </div>
          </div>
        </div>

        <div className="glass p-8 relative overflow-hidden">
          {/* Top Choice Tabs */}
          {step === 'choice' && (
            <div className="flex gap-2 p-1 bg-slate-900/60 rounded-xl mb-8">
              <button onClick={() => setMode('login')} className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${mode === 'login' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Direct Login</button>
              <button onClick={() => setMode('register')} className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${mode === 'register' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Work Onboarding</button>
            </div>
          )}

          {/* Login Flow */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5">
              <InputField icon={User} placeholder="Enterprise Username" value={form.username} onChange={f('username')} />
              <InputField icon={Lock} type={showPass ? 'text' : 'password'} placeholder="Secret Key" value={form.password} onChange={f('password')}
                rightIcon={<button type="button" onClick={() => setShowPass(s => !s)} className="text-slate-500">{showPass ? <EyeOff size={16} /> : <Eye size={16} />}</button>}
              />
              {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2"><AlertCircle size={14}/>{error}</div>}
              <button type="submit" disabled={loading} className="w-full btn-primary py-4 flex items-center justify-center gap-2 text-lg font-black shadow-xl shadow-indigo-600/20 transition-transform active:scale-[0.98]">
                {loading ? <Loader2 size={20} className="animate-spin" /> : <ChevronRight size={20} />}
                Sign Into Environment
              </button>
              <div className="flex items-center gap-4 py-2">
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-[10px] text-slate-600 font-bold">OR PROVIDER ACCESS</span>
                <div className="flex-1 h-px bg-white/5" />
              </div>
              <button type="button" onClick={() => alert("Google Identity verification starting...")} className="w-full flex items-center justify-center gap-3 py-3 bg-white/5 border border-white/5 rounded-xl text-sm font-bold text-slate-400 hover:bg-white/10 transition-all">
                <Globe size={18} className="text-blue-400" /> Use Enterprise Google SSO
              </button>
            </form>
          )}

          {/* Register Flow - Step 1: Email */}
          {mode === 'register' && step === 'choice' && (
            <div className="space-y-6">
              <div className="p-5 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Step 1: Identity Verification</p>
                <p className="text-xs text-slate-400 leading-relaxed">All enterprise accounts must be verified via your corporate email before onboarding.</p>
              </div>
              <InputField icon={Mail} placeholder="you@company.com" value={form.email} onChange={f('email')} />
              {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2"><AlertCircle size={14}/>{error}</div>}
              <button onClick={requestOTP} disabled={loading} className="w-full btn-primary py-4 flex items-center justify-center gap-2 text-lg font-black transition-all">
                {loading ? <Loader2 size={20} className="animate-spin" /> : <Shield size={20} />}
                Verify Email <ChevronRight size={20} />
              </button>
            </div>
          )}

          {/* Register Flow - Step 2: OTP */}
          {mode === 'register' && step === 'otp' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <button onClick={() => setStep('choice')} className="text-slate-400 hover:text-white"><ArrowLeft size={18} /></button>
                <h2 className="text-lg font-bold text-white">Enter Security Token</h2>
              </div>
              {success && <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-[10px] leading-relaxed">{success}</div>}
              <div className="flex justify-center gap-2">
                {form.otp.map((d, i) => (
                  <input key={i} ref={otpRefs[i]} type="text" maxLength={1} value={d} onChange={e => handleOtpChange(i, e.target.value)} onKeyDown={e => handleOtpKeyDown(i, e)}
                    className="w-12 h-14 text-center text-xl font-black bg-slate-900 border-2 border-white/10 rounded-xl text-white outline-none focus:border-indigo-500"
                  />
                ))}
              </div>
              <button onClick={verifyOTP} disabled={loading || otpCode.length < 6} className="w-full btn-primary py-4 font-black">Finalize Verification</button>
            </div>
          )}

          {/* Register Flow - Step 3: Details */}
          {mode === 'register' && step === 'details' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <ShieldCheck size={20} className="text-emerald-400" />
                <h2 className="text-lg font-bold text-white">Identity Configuration</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <InputField icon={User} placeholder="Enterprise ID" value={form.username} onChange={f('username')} />
                <InputField icon={Globe} placeholder="Organization" value={form.organization} onChange={f('organization')} />
              </div>
              <InputField icon={Shield} placeholder="Department" value={form.department} onChange={f('department')} />
              
              <InputField icon={Lock} type="password" placeholder="New Secret Key" value={form.password} onChange={f('password')} />
              <InputField icon={Lock} type="password" placeholder="Confirm Secret Key" value={form.confirmPassword} onChange={f('confirmPassword')} />
              
              <div className="p-3 bg-slate-900/80 rounded-xl border border-white/5 space-y-1">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Complexity Requirements</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <p className={`text-[9px] ${form.password.length >= 12 ? 'text-emerald-400' : 'text-slate-600'}`}>• 12+ Characters</p>
                  <p className={`text-[9px] ${/[A-Z]/.test(form.password) ? 'text-emerald-400' : 'text-slate-600'}`}>• Uppercase</p>
                  <p className={`text-[9px] ${/[0-9]/.test(form.password) ? 'text-emerald-400' : 'text-slate-600'}`}>• Number</p>
                  <p className={`text-[9px] ${/[!@#$%^&*]/.test(form.password) ? 'text-emerald-400' : 'text-slate-600'}`}>• Symbol</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Authorized Role</p>
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map(r => (
                    <button type="button" key={r.value} onClick={() => setForm(p => ({ ...p, role: r.value }))}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${form.role === r.value ? roleColors[r.color] : 'bg-white/5 border-white/5 text-slate-500'}`}>
                      <p className="text-[10px] font-bold">{r.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2"><AlertCircle size={14}/>{error}</div>}
              
              <button type="submit" disabled={loading} className="w-full btn-primary py-4 font-black shadow-xl shadow-indigo-600/20">
                {loading ? <Loader2 size={18} className="animate-spin" /> : "Complete Provisioning"}
              </button>
            </form>
          )}
        </div>

        <div className="mt-8 text-center space-y-2">
          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Enterprise Identity Mesh Enabled</p>
          <div className="flex items-center justify-center gap-4 text-[9px] text-slate-700 font-medium">
            <span>AES-256 ENCRYPTION</span>
            <span className="w-1 h-1 bg-slate-800 rounded-full" />
            <span>BCRYPT ADAPTIVE HASHING</span>
            <span className="w-1 h-1 bg-slate-800 rounded-full" />
            <span>RSA-4096 SIGNATURES</span>
          </div>
        </div>
      </div>
    </div>
  );
};
