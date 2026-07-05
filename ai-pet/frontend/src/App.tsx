import { useState, useEffect, useRef } from 'react'
import './App.css'
import BootScreen from './BootScreen'

interface Message {
  role: string;
  content: string;
}

function App() {
  const [isBooting, setIsBooting] = useState(true);
  const [activeTab, setActiveTab] = useState('CHAT');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [stats, setStats] = useState({ hunger: 0, happiness: 100 });
  const [journal, setJournal] = useState({ date: '', mood: '', thought: '' });
  const [isThinking, setIsThinking] = useState(false);
  const [gameWord, setGameWord] = useState('');
  const [gameState, setGameState] = useState('IDLE'); // IDLE, PLAYING, WON
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/status');
        const data = await res.json();
        setStats(data.stats);
        if (data.user.name) {
          setMessages([{ role: 'aura', content: `WELCOME BACK, ${data.user.name.toUpperCase()}.` }]);
        } else {
          setMessages([{ role: 'aura', content: 'HELLO. I AM AURA.' }]);
        }
      } catch (e) {
        setMessages([{ role: 'aura', content: 'OFFLINE MODE.' }]);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, activeTab]);

  const fetchJournal = async () => {
    const res = await fetch('http://localhost:3001/api/journal');
    const data = await res.json();
    setJournal(data);
  };

  const startGame = () => {
    const words = messages.filter(m => m.role === 'user').flatMap(m => m.content.split(' ')).filter(w => w.length > 4);
    if (words.length === 0) {
      setMessages(prev => [...prev, { role: 'aura', content: 'WE NEED TO CHAT MORE BEFORE WE CAN PLAY.' }]);
      setActiveTab('CHAT');
      return;
    }
    const target = words[Math.floor(Math.random() * words.length)].replace(/[^a-zA-Z]/g, '').toUpperCase();
    setGameWord(target);
    setGameState('PLAYING');
    setMessages(prev => [...prev, { role: 'aura', content: `ECHO MATCH: WHAT WAS THE LONG WORD YOU USED EARLIER?` }]);
  };

  const handleGameInput = (val: string) => {
    if (val.toUpperCase() === gameWord) {
      setGameState('WON');
      handleAction('play');
      setMessages(prev => [...prev, { role: 'aura', content: 'CORRECT! YOU REMEMBERED.' }]);
    } else {
      setMessages(prev => [...prev, { role: 'aura', content: 'TRY AGAIN.' }]);
    }
    setInput('');
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    if (gameState === 'PLAYING') {
      handleGameInput(input);
      return;
    }

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    try {
      const res = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'aura', content: data.response.toUpperCase() }]);
      setStats(data.stats);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'aura', content: 'ERROR: SIGNAL LOST.' }]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleAction = async (action: string) => {
    setIsThinking(true);
    try {
      const res = await fetch('http://localhost:3001/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'aura', content: data.response.toUpperCase() }]);
      setStats(data.stats);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'aura', content: 'ACTION FAILED.' }]);
    } finally {
      setIsThinking(false);
    }
  };

  const moodClass = stats.happiness > 70 ? 'happy' : stats.happiness < 30 ? 'sad' : '';

  return (
    <div className={`handheld-shell ${isDarkTheme ? 'dark-theme' : 'light-theme'}`}>
      {isBooting && <BootScreen onComplete={() => setIsBooting(false)} />}
      <button className="theme-toggle-btn" onClick={() => setIsDarkTheme(!isDarkTheme)}>
        {isDarkTheme ? '📟 LCD' : '🩻 CYBER'}
      </button>
      
      <div className="screen-container">
        <div className="stats-bar">
          <div className="stat-item">
            <span>HNG</span>
            <div className="stat-fill"><div className="stat-value" style={{ width: `${stats.hunger}%` }}></div></div>
          </div>
          <div className="stat-item">
            <span>HAP</span>
            <div className="stat-fill"><div className="stat-value" style={{ width: `${stats.happiness}%` }}></div></div>
          </div>
        </div>

        <div className="sprite-stage">
          <div className={`aura-sprite ${moodClass} ${isThinking ? 'thinking' : ''}`}></div>
          {isThinking && (
            <div className="thinking-overlay">
              <span className="blink">THINKING...</span>
            </div>
          )}
        </div>

        <div className="chat-overlay" ref={scrollRef}>
          {activeTab === 'CHAT' && messages.map((m, i) => (
            <div key={i} style={{ marginBottom: '8px', color: m.role === 'user' ? '#888' : 'var(--accent-color)' }}>
              {m.role === 'user' ? 'USR> ' : 'AUR> '}{m.content}
            </div>
          ))}
          {activeTab === 'JOURNAL' && (
            <div style={{ fontSize: '8px', fontFamily: 'var(--font-pixel)', padding: '10px' }}>
              <div style={{ color: 'var(--accent-color)', marginBottom: '10px' }}>LOG: {journal.date}</div>
              <div style={{ marginBottom: '10px' }}>MOOD: {journal.mood}</div>
              <div style={{ lineHeight: '1.6' }}>THOUGHT: {journal.thought}</div>
            </div>
          )}
          {activeTab === 'GAME' && (
            <div style={{ textAlign: 'center', paddingTop: '20px' }}>
              <div style={{ color: 'var(--accent-color)', marginBottom: '15px', fontFamily: 'var(--font-pixel)', fontSize: '10px' }}>ECHO MATCH</div>
              {gameState !== 'PLAYING' ? (
                <button className="neon-btn" onClick={startGame}>START CHALLENGE</button>
              ) : (
                <div style={{ fontSize: '8px' }}>CHALLENGE ACTIVE. TYPE IN CHAT.</div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="controls-grid">
        <div className="nav-tabs">
          {['CHAT', 'JOURNAL', 'GAME'].map(tab => (
            <button 
              key={tab} 
              className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(tab);
                if (tab === 'JOURNAL') fetchJournal();
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="input-area">
          <input 
            type="text" 
            value={input} 
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={gameState === 'PLAYING' ? "TYPE THE WORD..." : "COMMUNICATE..."}
            disabled={activeTab !== 'CHAT' && gameState !== 'PLAYING'}
          />
          <button className="neon-btn" onClick={handleSend} disabled={isThinking}>
            {isThinking ? '...' : 'SEND'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
          <button className="neon-btn" onClick={() => handleAction('feed')}>FEED</button>
          <button className="neon-btn" onClick={() => handleAction('play')}>PLAY</button>
        </div>
      </div>
    </div>
  )
}

export default App
