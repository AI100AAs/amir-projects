import React, { useState, useEffect } from 'react';
import { Activity, Home, MessageSquare, Settings as SettingsIcon, Sun, Moon } from 'lucide-react';
import { AppProvider, useAppContext } from './context/AppContext';
import Dashboard from './components/Dashboard';
import Assistant from './components/Assistant';
import Settings from './components/Settings';
import './index.css';

function MainApp() {
  const [activeTab, setActiveTab] = useState('home');
  const { theme, setTheme } = useAppContext();

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div className="mobile-wrapper" data-theme={theme}>
      <div className="header">
        <h1>Aura Health</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <div 
            style={{
              width: '40px', height: '40px', borderRadius: '50%', 
              background: 'linear-gradient(135deg, var(--accent-ai), var(--accent-aqi))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(183, 148, 244, 0.3)'
            }}
          >
            <Activity size={20} color="#fff" />
          </div>
        </div>
      </div>

      <div className="content-area">
        {activeTab === 'home' && <Dashboard />}
        {activeTab === 'chat' && <Assistant />}
        {activeTab === 'settings' && <Settings />}
      </div>

      <div className="bottom-nav">
        <button 
          className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          <Home size={24} />
          <span>Home</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <MessageSquare size={24} />
          <span>Aura AI</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <SettingsIcon size={24} />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
