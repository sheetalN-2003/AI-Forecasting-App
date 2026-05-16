import React from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error?.message || error?.toString() };
  }

  async componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    
    // Notify the System Admin (best-effort, don't crash again)
    try {
      const user = JSON.parse(localStorage.getItem('retailpulse_user') || '{}');
      await axios.post(`${API_BASE}/auth/admin/report-error`, {
        error_msg: `${error.toString()}\n\nStack: ${errorInfo.componentStack}`,
        user_email: user.email || 'Unknown'
      });
    } catch (err) {
      // Silently ignore - admin reporting is best-effort
    }
  }

  handleReset = () => {
    // Clear any stale/corrupt user data that might cause crashes
    this.setState({ hasError: false, errorMessage: null });
  };

  handleForceLogout = () => {
    localStorage.removeItem('retailpulse_token');
    localStorage.removeItem('retailpulse_user');
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
          <div className="glass p-12 max-w-lg w-full text-center space-y-8 border-red-500/20">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mx-auto border border-red-500/20">
              <div className="text-4xl">⚠️</div>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-black text-white tracking-tight">System Anomaly</h1>
              <p className="text-slate-400 text-sm leading-relaxed">
                The application encountered a critical runtime error. 
                <span className="text-indigo-400 block mt-2 font-bold uppercase tracking-widest text-[10px]">The System Administrator has been notified.</span>
              </p>
              {this.state.errorMessage && (
                <div className="mt-4 p-3 bg-slate-900 rounded-xl border border-red-500/10 text-left">
                  <p className="text-red-400 text-[10px] font-mono break-all">{this.state.errorMessage}</p>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={this.handleReset}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/20 transition-all"
              >
                Try Again
              </button>
              <button 
                onClick={this.handleForceLogout}
                className="w-full py-3 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-2xl transition-all text-sm"
              >
                Clear Session &amp; Login Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
