import { useState, useEffect, useCallback } from 'react';
import { useApp } from './context/AppContext';
import { useToast } from './context/ToastContext';
import TranslationPanel from './components/TranslationPanel';
import TestCasesPanel from './components/TestCasesPanel';
import DiffView from './components/DiffView';
import ChatPanel from './components/ChatPanel';
import HistoryPanel from './components/HistoryPanel';
import SettingsPanel from './components/SettingsPanel';
import ComparisonPanel from './components/ComparisonPanel';
import ReportPanel from './components/ReportPanel';
import type { TranslationResult } from './types';

type TabId = 'translate' | 'compare' | 'report' | 'tests' | 'diff' | 'history' | 'chat' | 'settings';

interface Tab {
  id: TabId;
  label: string;
  icon: string;
  shortcut?: string;
}

const TABS: Tab[] = [
  { id: 'translate', label: 'Translate', icon: '⚡', shortcut: '1' },
  { id: 'compare', label: 'Compare', icon: '🔀', shortcut: '2' },
  { id: 'report', label: 'Report', icon: '📄', shortcut: '8' },
  { id: 'tests', label: 'Test Cases', icon: '🧪', shortcut: '3' },
  { id: 'diff', label: 'Diff', icon: '📊', shortcut: '4' },
  { id: 'history', label: 'History', icon: '📜', shortcut: '5' },
  { id: 'chat', label: 'AI Chat', icon: '💬', shortcut: '6' },
  { id: 'settings', label: 'Settings', icon: '⚙️', shortcut: '7' },
];

const SHORTCUTS = [
  { key: 'Ctrl+1', action: 'Translate tab' },
  { key: 'Ctrl+2', action: 'Compare tab' },
  { key: 'Ctrl+3', action: 'Test Cases tab' },
  { key: 'Ctrl+4', action: 'Diff tab' },
  { key: 'Ctrl+5', action: 'History tab' },
  { key: 'Ctrl+6', action: 'AI Chat tab' },
  { key: 'Ctrl+7', action: 'Settings tab' },
  { key: 'Ctrl+8', action: 'Report tab' },
  { key: 'Ctrl+/', action: 'Show shortcuts' },
  { key: 'Ctrl+Shift+S', action: 'Share translation' },
];

export default function App() {
  const { activeTab, setActiveTab, history, theme, setTheme, lastTranslation, setLastTranslation } = useApp();
  const { addToast } = useToast();
  const [lmStudioOnline, setLmStudioOnline] = useState<boolean | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [shareUrl, setShareUrl] = useState('');


  const checkLmStudio = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:1234/v1/models', { method: 'GET', signal: AbortSignal.timeout(3000) });
      setLmStudioOnline(res.ok);
    } catch {
      setLmStudioOnline(false);
    }
  }, []);

  useEffect(() => {
    checkLmStudio();
    const interval = setInterval(checkLmStudio, 30000);
    return () => clearInterval(interval);
  }, [checkLmStudio]);

  const handleTranslationComplete = (result: TranslationResult, source: string, target: string, srcLang: string, tgtLang: string) => {
    setLastTranslation({
      sourceCode: source,
      targetCode: target,
      sourceLang: srcLang as any,
      targetLang: tgtLang as any,
      result,
    });
  };

  const handleShare = useCallback(() => {
    if (!lastTranslation?.sourceCode || !lastTranslation?.targetCode) {
      addToast('Nothing to share - translate some code first!', 'warning');
      return;
    }
    const data = btoa(JSON.stringify({
      s: lastTranslation.sourceCode,
      t: lastTranslation.targetCode,
      sl: lastTranslation.sourceLang,
      tl: lastTranslation.targetLang,
    }));
    const url = `${window.location.origin}${window.location.pathname}#share/${data}`;
    setShareUrl(url);
    setShowShare(true);
  }, [lastTranslation, addToast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.shiftKey && e.key === 'S') {
          e.preventDefault();
          handleShare();
          return;
        }
        const tabMap: Record<string, TabId> = {
          '1': 'translate', '2': 'compare', '3': 'tests',
          '4': 'diff', '5': 'history', '6': 'chat', '7': 'settings', '8': 'report',
        };
        const tabId = tabMap[e.key];
        if (tabId) {
          e.preventDefault();
          setActiveTab(tabId);
        }
        if (e.key === '/') {
          e.preventDefault();
          setShowShortcuts(prev => !prev);
        }
      }
      if (e.key === 'Escape') {
        setShowShortcuts(false);
        setShowShare(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTab, lastTranslation, handleShare]);

  const handleCopyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      addToast('Share URL copied!', 'success');
    } catch {
      addToast('Failed to copy', 'error');
    }
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'translate':
        return <TranslationPanel onTranslationComplete={handleTranslationComplete} />;
      case 'compare':
        return <ComparisonPanel onTranslationComplete={handleTranslationComplete} />;
      case 'report':
        return (
          <ReportPanel
            sourceCode={lastTranslation?.sourceCode || ''}
            targetCode={lastTranslation?.targetCode || ''}
            sourceLang={lastTranslation?.sourceLang || 'python'}
            targetLang={lastTranslation?.targetLang || 'cpp'}
            result={lastTranslation?.result || null}
          />
        );
      case 'tests':
        return <TestCasesPanel />;
      case 'diff':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{
              padding: '0.75rem', backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
              marginBottom: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)',
            }}>
              Line-by-line diff between source and translated code.
            </div>
            <div style={{ flex: 1, minHeight: 0, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <DiffView
                original={lastTranslation?.sourceCode || 'Translate code first to see the diff here...'}
                modified={lastTranslation?.targetCode || ''}
              />
            </div>
          </div>
        );
      case 'history':
        return <HistoryPanel />;
      case 'chat':
        return (
          <ChatPanel
            translationResult={lastTranslation?.result || null}
            sourceCode={lastTranslation?.sourceCode || ''}
            targetCode={lastTranslation?.targetCode || ''}
            sourceLang={lastTranslation?.sourceLang || ''}
            targetLang={lastTranslation?.targetLang || ''}
          />
        );
      case 'settings':
        return <SettingsPanel />;
      default:
        return null;
    }
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw',
      backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', overflow: 'hidden',
    }}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.5rem 1rem', backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.25rem' }}>⚡</span>
          <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, letterSpacing: '-0.02em' }}>
            Code Translator
          </h1>
          <span style={{
            fontSize: '0.65rem', padding: '0.15rem 0.4rem',
            backgroundColor: 'var(--accent-bg)', color: 'var(--accent)',
            borderRadius: 'var(--radius-sm)', fontWeight: 600,
          }}>
            v2.0
          </span>
          <span style={{
            fontSize: '0.6rem', padding: '0.15rem 0.3rem',
            backgroundColor: 'var(--success-bg)', color: 'var(--success)',
            borderRadius: 'var(--radius-sm)',
          }}>
            stable
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }} title={lmStudioOnline ? 'LM Studio is online' : lmStudioOnline === false ? 'LM Studio is offline' : 'Checking...'}>
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
              backgroundColor: lmStudioOnline ? 'var(--success)' : lmStudioOnline === false ? 'var(--error)' : 'var(--warning)',
              display: 'inline-block',
            }} />
            <span>LM Studio</span>
          </div>
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} style={iconButtonStyle} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button onClick={handleShare} style={iconButtonStyle} title="Share translation">🔗</button>
          <button onClick={() => setShowShortcuts(true)} style={iconButtonStyle} title="Keyboard shortcuts">⌨️</button>
          <span>{history.length} translations</span>
        </div>
      </header>

      {/* Navigation */}
      <nav style={{
        display: 'flex', backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)', flexShrink: 0, overflowX: 'auto',
      }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '0.6rem 1rem', backgroundColor: 'transparent',
            color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)',
            border: 'none', borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
            cursor: 'pointer', fontSize: '0.8rem', fontWeight: activeTab === tab.id ? 600 : 400,
            display: 'flex', alignItems: 'center', gap: '0.4rem', transition: 'all var(--transition)',
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.shortcut && (
              <span style={{
                fontSize: '0.6rem', padding: '0.1rem 0.3rem',
                backgroundColor: 'var(--bg-tertiary)', borderRadius: '3px',
                color: 'var(--text-muted)',
              }}>
                {tab.shortcut}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'hidden', padding: '0.75rem' }}>
        {renderTab()}
      </main>

      {/* Footer */}
      <footer style={{
        padding: '0.4rem 1rem', backgroundColor: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border)', fontSize: '0.7rem',
        color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <span>Regex + LLM powered • Review all translations before use</span>
        <span>Ctrl+1-8: Tabs • Ctrl+/: Shortcuts • Ctrl+Shift+S: Share</span>
      </footer>

      {/* Shortcuts Modal */}
      {showShortcuts && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, animation: 'fadeIn 0.15s ease',
        }} onClick={() => setShowShortcuts(false)}>
          <div style={{
            backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)', padding: '1.5rem', maxWidth: '420px',
            width: '90%', maxHeight: '80vh', overflow: 'auto',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem' }}>⌨️ Keyboard Shortcuts</h2>
              <button onClick={() => setShowShortcuts(false)} style={{
                background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-secondary)',
              }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {SHORTCUTS.map((s, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.4rem 0.5rem', borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-tertiary)',
                }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{s.action}</span>
                  <kbd style={{
                    padding: '0.2rem 0.5rem', backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border)', borderRadius: '4px',
                    fontSize: '0.75rem', fontFamily: 'var(--font-mono)',
                  }}>{s.key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShare && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, animation: 'fadeIn 0.15s ease',
        }} onClick={() => setShowShare(false)}>
          <div style={{
            backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)', padding: '1.5rem', maxWidth: '500px',
            width: '90%',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem' }}>🔗 Share Translation</h2>
              <button onClick={() => setShowShare(false)} style={{
                background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-secondary)',
              }}>✕</button>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              Share this translation via URL. Anyone with the link can view the source and translated code.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                value={shareUrl}
                readOnly
                style={{
                  flex: 1, padding: '0.5rem', backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)',
                }}
              />
              <button onClick={handleCopyShareUrl} style={primaryButtonStyle}>Copy</button>
            </div>
            <div style={{
              marginTop: '1rem', padding: '0.75rem', backgroundColor: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--text-secondary)',
            }}>
              <strong>Tip:</strong> You can also paste the URL back into the app to load the translation.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const iconButtonStyle: React.CSSProperties = {
  padding: '0.3rem 0.5rem', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)',
  border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
  fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', transition: 'all var(--transition)',
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '0.4rem 0.8rem', backgroundColor: 'var(--accent)', color: 'white', border: 'none',
  borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500,
};
