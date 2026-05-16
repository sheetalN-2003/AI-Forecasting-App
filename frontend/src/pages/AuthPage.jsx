import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Eye, EyeOff, Mail, Lock, User, ShieldCheck, ChevronRight,
  Loader2, AlertCircle, CheckCircle2, Sparkles, RefreshCw,
  ArrowLeft, Globe
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const ROLES = [
  { value: 'Manager', label: 'Store Manager', desc: 'Sales dashboards & real-time monitoring', color: 'emerald' },
  { value: 'Analyst', label: 'Data Analyst', desc: 'Advanced analytics, forecasting & AI insights', color: 'indigo' },
  { value: 'Admin', label: 'System Admin', desc: 'Full platform control & user management', color: 'purple' },
];

const roleColors = { emerald: 'border-emerald-500/60 bg-emerald-500/10', indigo: 'border-indigo-500/60 bg-indigo-500/10', purple: 'border-purple-500/60 bg-purple-500/10' };

const InputField = ({ icon: Icon, type = 'text', placeholder, value, onChange, rightIcon, disabled }) => (
  <div className="relative">
    <Icon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className="w-full bg-slate-800/60 border border-white/10 focus:border-indigo-500/60 rounded-xl pl-11 pr-11 py-3 text-sm text-slate-200 placeholder-slate-500 outline-none transition-all disabled:opacity-50"
    />
    {rightIcon && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightIcon}</div>}
  </div>
);

export const AuthPage = () => {
  const { login } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [step, setStep] = useState('form'); // 'form' | 'otp'
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  const [form, setForm] = useState({
    username: '', email: '', password: '', role: 'Manager', otp: ['', '', '', '', '', ''],
    forgotEmail: ''
  });

  // — OTP digit input handler —
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

  // Auto-fill OTP from backend (dev mode)
  const autoFillOtp = (code) => {
    const digits = code.toString().split('').slice(0, 6);
    setForm(p => ({ ...p, otp: digits }));
    setSuccess(`✉️ Code sent! Auto-filled for demo (${code}). In production this arrives via email.`);
  };

  const f = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));
  const otpCode = form.otp.join('');

  // ── Request OTP ──
  const requestOTP = async () => {
    if (!form.email) { setError('Please enter your email.'); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      const { data } = await axios.post(`${API_BASE}/auth/request-verification`, { email: form.email });
      if (data.code) autoFillOtp(data.code);
      else setSuccess('Verification code sent! Check your email.');
      setStep('otp');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send verification code.');
    } finally { setLoading(false); }
  };

  // ── Verify OTP ──
  const verifyOTP = async () => {
    if (otpCode.length < 6) { setError('Enter all 6 digits.'); return; }
    setLoading(true); setError('');
    try {
      await axios.post(`${API_BASE}/auth/verify-code`, { email: form.email, code: otpCode });
      await handleRegister();
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid code. Try again.');
      setLoading(false);
    }
  };

  // ── Register ──
  const handleRegister = async () => {
    try {
      const { data } = await axios.post(`${API_BASE}/auth/register`, {
        username: form.username,
        email: form.email,
        password: form.password,
        role: form.role
      });
      login(data.access_token, data.user);
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed.');
      setLoading(false);
    }
  };

  // ── Login ──
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
      if (data.user?.two_factor_required) {
        setStep('2fa');
      } else {
        login(data.access_token, data.user);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid username or password.');
    } finally { setLoading(false); }
  };

  // ── Forgot Password ──
  const handleForgotPassword = async () => {
    if (!form.forgotEmail) { setError('Enter your email address.'); return; }
    setLoading(true); setError('');
    try {
      const { data } = await axios.post(`${API_BASE}/auth/forgot-password`, { email: form.forgotEmail });
      setSuccess(`✅ ${data.message}${data.debug_token ? ' (Dev token: ' + data.debug_token.slice(0, 12) + '...)' : ''}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send reset email.');
    } finally { setLoading(false); }
  };

  // ── Google Login ──
  const handleGoogleLogin = async () => {
    setLoading(true); setError('');
    try {
      const { data } = await axios.post(`${API_BASE}/auth/google-login`, { token: 'mock-google-oauth-token' });
      login(data.access_token, data.user);
    } catch (err) {
      setError(err.response?.data?.detail || 'Google sign-in unavailable. Register manually.');
      setLoading(false);
    }
  };

  const switchMode = (m) => { setMode(m); setStep('form'); setError(''); setSuccess(''); setForm(p => ({ ...p, otp: ['','','','','',''] })); };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/30">
              <Sparkles size={22} className="text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-black text-white tracking-tight">RetailPulse</h1>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">AI Enterprise Platform</p>
            </div>
          </div>
        </div>

        <div className="glass p-8 space-y-6">
          {/* ─────────── FORGOT PASSWORD ─────────── */}
          {mode === 'forgot' && (
            <>
              <div className="flex items-center gap-3 mb-2">
                <button onClick={() => switchMode('login')} className="text-slate-400 hover:text-white">
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <h2 className="text-xl font-bold text-white">Reset Password</h2>
                  <p className="text-xs text-slate-500 mt-0.5">We'll send a reset link to your email</p>
                </div>
              </div>
              <InputField icon={Mail} placeholder="your@email.com" value={form.forgotEmail} onChange={f('forgotEmail')} />
              {error && <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs"><AlertCircle size={14} />{error}</div>}
              {success && <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs"><CheckCircle2 size={14} />{success}</div>}
              <button onClick={handleForgotPassword} disabled={loading} className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </>
          )}

          {/* ─────────── LOGIN ─────────── */}
          {mode === 'login' && (
            <>
              <div className="flex gap-1 p-1 bg-slate-900/60 rounded-xl">
                {['login', 'register'].map(tab => (
                  <button key={tab} onClick={() => switchMode(tab)}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === tab ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-500 hover:text-slate-300'}`}>
                    {tab === 'login' ? '🔐 Login' : '✨ Register'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <InputField icon={User} placeholder="Username" value={form.username} onChange={f('username')} />
                <InputField icon={Lock} type={showPass ? 'text' : 'password'} placeholder="Password" value={form.password} onChange={f('password')}
                  rightIcon={
                    <button type="button" onClick={() => setShowPass(s => !s)} className="text-slate-500 hover:text-white">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />
                {error && <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs"><AlertCircle size={14} />{error}</div>}
                <button type="submit" disabled={loading} className="w-full btn-primary py-3.5 flex items-center justify-center gap-2 text-base font-bold disabled:opacity-50">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <ChevronRight size={18} />}
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              <div className="relative flex items-center gap-4">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-[11px] text-slate-600 font-bold uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <button onClick={handleGoogleLogin} disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-slate-300 transition-all disabled:opacity-50">
                <Globe size={18} className="text-blue-400" />
                Continue with Google
              </button>

              <div className="text-center">
                <button onClick={() => switchMode('forgot')} className="text-xs text-slate-500 hover:text-indigo-400 transition-colors">
                  Forgot your password?
                </button>
              </div>

              {/* Demo credentials */}
              <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Demo Credentials</p>
                <div className="space-y-1.5">
                  {[
                    { user: 'admin', pass: 'admin123', role: 'Admin', color: 'purple' },
                    { user: 'analyst', pass: 'analyst123', role: 'Analyst', color: 'indigo' },
                    { user: 'manager', pass: 'manager123', role: 'Manager', color: 'emerald' },
                  ].map(c => (
                    <button key={c.user} onClick={() => { setForm(p => ({ ...p, username: c.user, password: c.pass })); }}
                      className="w-full flex items-center justify-between px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all group">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full bg-${c.color}-500/20 text-${c.color}-400`}>{c.role}</span>
                        <span className="text-xs text-slate-400 font-mono">{c.user} / {c.pass}</span>
                      </div>
                      <ChevronRight size={12} className="text-slate-600 group-hover:text-white transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ─────────── REGISTER ─────────── */}
          {mode === 'register' && step === 'form' && (
            <>
              <div className="flex gap-1 p-1 bg-slate-900/60 rounded-xl">
                {['login', 'register'].map(tab => (
                  <button key={tab} onClick={() => switchMode(tab)}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === tab ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-500 hover:text-slate-300'}`}>
                    {tab === 'login' ? '🔐 Login' : '✨ Register'}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                {/* Role Selection */}
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Select Your Role</p>
                  <div className="space-y-2">
                    {ROLES.map(r => (
                      <button key={r.value} onClick={() => setForm(p => ({ ...p, role: r.value }))}
                        className={`w-full flex items-center gap-4 p-3.5 rounded-xl border-2 transition-all text-left ${form.role === r.value ? roleColors[r.color] : 'border-white/5 bg-white/5 hover:bg-white/10'}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${form.role === r.value ? `bg-${r.color}-500/30` : 'bg-slate-800'}`}>
                          <ShieldCheck size={16} className={form.role === r.value ? `text-${r.color}-400` : 'text-slate-500'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold ${form.role === r.value ? 'text-white' : 'text-slate-400'}`}>{r.label}</p>
                          <p className="text-[10px] text-slate-500 truncate">{r.desc}</p>
                        </div>
                        {form.role === r.value && <CheckCircle2 size={16} className={`text-${r.color}-400 flex-shrink-0`} />}
                      </button>
                    ))}
                  </div>
                </div>

                <InputField icon={User} placeholder="Username (e.g. john_doe)" value={form.username} onChange={f('username')} />
                <InputField icon={Mail} placeholder="Email address" type="email" value={form.email} onChange={f('email')} />
                <InputField icon={Lock} type={showPass ? 'text' : 'password'} placeholder="Password (12+ chars, A-Z, 0-9, symbols)"
                  value={form.password} onChange={f('password')}
                  rightIcon={
                    <button type="button" onClick={() => setShowPass(s => !s)} className="text-slate-500 hover:text-white">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />

                {error && <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs"><AlertCircle size={14} />{error}</div>}

                <button onClick={requestOTP} disabled={loading}
                  className="w-full btn-primary py-3.5 flex items-center justify-center gap-2 text-base font-bold disabled:opacity-50">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
                  {loading ? 'Sending Code...' : 'Verify Email & Continue'}
                </button>
              </div>
            </>
          )}

          {/* ─────────── OTP VERIFICATION ─────────── */}
          {mode === 'register' && step === 'otp' && (
            <>
              <div className="flex items-center gap-3">
                <button onClick={() => setStep('form')} className="text-slate-400 hover:text-white"><ArrowLeft size={18} /></button>
                <div>
                  <h2 className="text-lg font-bold text-white">Verify Your Email</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Code sent to <span className="text-indigo-400 font-bold">{form.email}</span></p>
                </div>
              </div>

              {success && <div className="flex items-start gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs"><CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" /><span>{success}</span></div>}

              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">Enter 6-Digit Code</p>
                <div className="flex items-center justify-center gap-2">
                  {form.otp.map((digit, i) => (
                    <input key={i} ref={otpRefs[i]} type="text" inputMode="numeric" maxLength={1} value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      className="w-12 h-14 text-center text-xl font-black bg-slate-800/60 border-2 border-white/10 focus:border-indigo-500 rounded-xl text-white outline-none transition-all"
                    />
                  ))}
                </div>
              </div>

              {error && <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs"><AlertCircle size={14} />{error}</div>}

              <button onClick={verifyOTP} disabled={loading || otpCode.length < 6}
                className="w-full btn-primary py-3.5 flex items-center justify-center gap-2 text-base font-bold disabled:opacity-50">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>

              <button onClick={requestOTP} disabled={loading} className="w-full flex items-center justify-center gap-2 text-xs text-slate-500 hover:text-slate-300 disabled:opacity-50">
                <RefreshCw size={12} /> Resend code
              </button>
            </>
          )}
        </div>

        <p className="text-center text-[10px] text-slate-600 mt-6">
          RetailPulse AI · Enterprise Edition · Protected by JWT Auth
        </p>
      </div>
    </div>
  );
};
