import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, LayoutDashboard, Package, TrendingUp, 
  Brain, Settings, Users, Terminal, Globe,
  ChevronRight, Command, X
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', title: 'User Dashboard', icon: LayoutDashboard, keywords: 'main home admin analyst' },
  { id: 'inventory', title: 'Inventory Analytics', icon: Package, keywords: 'stock warehouse' },
  { id: 'forecasting', title: 'Sales Forecasting', icon: Brain, keywords: 'ai prediction' },
  { id: 'insights', title: 'AI Business Insights', icon: Globe, keywords: 'chat genai' },
  { id: 'api', title: 'Developer API', icon: Terminal, keywords: 'system control endpoint' },
  { id: 'settings', title: 'System Settings', icon: Settings, keywords: 'profile config' },
];

export const CommandCenter = ({ setActiveTab }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(NAV_ITEMS);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [close]);

  useEffect(() => {
    if (!query) {
      setResults(NAV_ITEMS);
      return;
    }
    const filtered = NAV_ITEMS.filter(item => 
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.keywords.toLowerCase().includes(query.toLowerCase())
    );
    setResults(filtered);
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = (id) => {
    if (setActiveTab) setActiveTab(id);
    close();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      setSelectedIndex(prev => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex].id);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] px-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={close}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="w-full max-w-xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden relative"
          >
            <div className="p-4 border-b border-white/5 flex items-center gap-4">
              <Search className="text-slate-500" size={20} />
              <input
                autoFocus
                placeholder="Search tools, dashboards, or system configs..."
                className="flex-1 bg-transparent border-none outline-none text-white text-lg placeholder-slate-600"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
              />
              <div className="flex items-center gap-1 px-2 py-1 bg-slate-800 rounded-md border border-white/5">
                <span className="text-[10px] text-slate-400 font-bold">ESC</span>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2 scrollbar-none">
              {results.length > 0 ? (
                results.map((item, i) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                      selectedIndex === i ? 'bg-indigo-600/20 border border-indigo-500/30' : 'border border-transparent hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${selectedIndex === i ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                        <item.icon size={18} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-white">{item.title}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{item.id}</p>
                      </div>
                    </div>
                    {selectedIndex === i && (
                      <div className="flex items-center gap-2 text-indigo-400">
                        <span className="text-[10px] font-black tracking-widest uppercase">Select</span>
                        <ChevronRight size={14} />
                      </div>
                    )}
                  </button>
                ))
              ) : (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Search className="text-slate-500" size={20} />
                  </div>
                  <p className="text-slate-400 text-sm font-bold">No results found for "{query}"</p>
                  <p className="text-xs text-slate-600 mt-1">Try searching for 'Inventory' or 'Admin'</p>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-white/5 bg-slate-900/50 flex justify-between items-center px-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-slate-800 border border-white/10 rounded text-[9px] text-slate-400 font-bold">↑↓</kbd>
                  <span className="text-[9px] text-slate-500 font-black uppercase">Navigate</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-slate-800 border border-white/10 rounded text-[9px] text-slate-400 font-bold">⏎</kbd>
                  <span className="text-[9px] text-slate-500 font-black uppercase">Open</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Command size={10} className="text-slate-500" />
                <span className="text-[9px] text-slate-500 font-black uppercase">RetailPulse Omni-Search</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
