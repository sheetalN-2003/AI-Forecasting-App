import React, { useState, useEffect } from 'react';
import { Sparkles, Bot, Send, RefreshCw, TrendingUp, AlertTriangle, Lightbulb, ShoppingBag } from 'lucide-react';

const colorMap = {
  positive: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-400', icon: TrendingUp },
  negative: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', badge: 'bg-red-500/20 text-red-400', icon: AlertTriangle },
  neutral:  { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-400', icon: Lightbulb },
  medium:   { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-400', badge: 'bg-indigo-500/20 text-indigo-400', icon: ShoppingBag },
};

const STARTER_PROMPTS = [
  'Which category has the highest profit margin?',
  'What are my growth trends?',
  'Which region should I prioritise for Q4?',
  'How does discount rate affect profit?',
  'Show me my top performing products',
  'What insights do you have about my business?'
];

import { insightsAPI } from '../services/api';

const formatMessageText = (text) => {
  if (!text) return '';
  
  return text.split('\n').map((line, idx) => {
    let cleanLine = line.trim();
    if (!cleanLine) return <div key={idx} className="h-2" />;
    
    // Bold parser: **text** -> <strong>text</strong>
    const boldRegex = /\*\*(.*?)\*\//g; // Or simple regex matching bold
    const boldRegexMatched = /\*\*(.*?)\*\*/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    
    while ((match = boldRegexMatched.exec(cleanLine)) !== null) {
      if (match.index > lastIndex) {
        parts.push(cleanLine.substring(lastIndex, match.index));
      }
      parts.push(<strong key={match.index} className="font-extrabold text-indigo-300">{match[1]}</strong>);
      lastIndex = boldRegexMatched.lastIndex;
    }
    if (lastIndex < cleanLine.length) {
      parts.push(cleanLine.substring(lastIndex));
    }
    
    // List item check: • or - or *
    if (cleanLine.startsWith('•') || cleanLine.startsWith('-') || cleanLine.startsWith('*')) {
      const bulletContent = cleanLine.substring(1).trim();
      return (
        <li key={idx} className="list-disc list-inside ml-2 mt-1.5 text-slate-300">
          {parts.length > 0 ? parts : bulletContent}
        </li>
      );
    }
    
    return <p key={idx} className="mb-2 text-slate-300 leading-relaxed">{parts.length > 0 ? parts : cleanLine}</p>;
  });
};

export const Insights = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: '👋 Hi! I\'m your AI retail analyst. I\'m currently connected to your live database with real sales data. Ask me anything about your sales trends, performance, or forecasting strategy!' }
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [autoInsights, setAutoInsights] = useState([]);
  const [loadingInsights, setLoadingInsights] = useState(true);

  const loadAutoInsights = async () => {
    try {
      const { data } = await insightsAPI.getAutoInsights();
      setAutoInsights(data);
    } catch (err) {
      console.error('Failed to load auto insights:', err);
      // Fallback insights if API fails
      setAutoInsights([
        {
          id: 'welcome',
          type: 'positive',
          title: 'AI Insights Ready',
          text: 'Your business intelligence system is analyzing real sales data. Ask questions to get personalized insights.',
          priority: 'medium'
        }
      ]);
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    loadAutoInsights();
    // Refresh insights every 5 minutes
    const interval = setInterval(loadAutoInsights, 300000);
    return () => clearInterval(interval);
  }, []);

  const sendMessage = async (text) => {
    const userMsg = text || input.trim();
    if (!userMsg) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setTyping(true);

    try {
      const { data } = await insightsAPI.chat(userMsg);
      setMessages(prev => [...prev, { role: 'assistant', text: data.response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: '❌ Failed to reach AI service. Please check your connection and try again.' }]);
    } finally {
      setTyping(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4 p-6 glass">
        <div className="p-3 bg-indigo-500/20 rounded-2xl">
          <Bot size={28} className="text-indigo-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">AI Business Insights</h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Powered by ML model analysis · Ask questions or explore auto-generated insights
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          AI Online
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Chat */}
        <div className="lg:col-span-3 glass flex flex-col" style={{ height: '580px' }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scroll">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center mr-3 flex-shrink-0 mt-1">
                    <Bot size={16} className="text-indigo-400" />
                  </div>
                )}
                <div className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-sm'
                    : 'bg-slate-800/80 text-slate-200 rounded-tl-sm'
                }`}>
                  {formatMessageText(msg.text)}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center mr-3 flex-shrink-0">
                  <Bot size={16} className="text-indigo-400" />
                </div>
                <div className="px-4 py-3 bg-slate-800/80 rounded-2xl rounded-tl-sm">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Starters */}
          <div className="px-6 pt-2 pb-3 flex flex-wrap gap-2">
            {STARTER_PROMPTS.map((p, i) => (
              <button key={i} onClick={() => sendMessage(p)}
                className="text-xs px-3 py-1.5 bg-slate-800/60 hover:bg-indigo-500/20 border border-white/10 hover:border-indigo-500/50 rounded-full text-slate-400 hover:text-indigo-300 transition-all">
                {p}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/10 flex gap-3">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Ask about sales trends, margins, regions..."
              className="input-field flex-1 py-2.5 text-sm"
            />
            <button onClick={() => sendMessage()} disabled={!input.trim() || typing}
              className="btn-primary px-4 flex items-center gap-2 disabled:opacity-50">
              <Send size={16} />
            </button>
          </div>
        </div>

        {/* Insight Cards */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider px-1">Auto-Generated Insights</h3>
            <button 
              onClick={loadAutoInsights}
              className="text-xs text-slate-500 hover:text-slate-300 p-1 rounded"
              disabled={loadingInsights}
            >
              <RefreshCw size={14} className={loadingInsights ? 'animate-spin' : ''} />
            </button>
          </div>
          
          {loadingInsights ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass p-5 animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-slate-700 rounded-xl"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-slate-700 rounded mb-2"></div>
                    <div className="h-3 bg-slate-800 rounded mb-1"></div>
                    <div className="h-3 bg-slate-800 rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            autoInsights.map((insight, i) => {
              const c = colorMap[insight.type] || colorMap.medium;
              const IconComponent = c.icon;
              return (
                <div key={insight.id} className={`glass p-5 border ${c.border} hover:${c.bg} transition-all duration-300 group cursor-pointer`}>
                  <div className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-xl ${c.bg} flex-shrink-0`}>
                      <IconComponent size={18} className={c.text} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <h4 className="font-bold text-white text-sm">{insight.title}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${c.badge}`}>
                          {insight.priority?.toUpperCase() || 'INFO'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{insight.text}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          
          {!loadingInsights && autoInsights.length === 0 && (
            <div className="glass p-8 text-center">
              <Lightbulb size={32} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No insights available yet. Try asking questions in the chat to generate personalized insights.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
