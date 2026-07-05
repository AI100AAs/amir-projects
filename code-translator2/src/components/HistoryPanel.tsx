import { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { HistoryEntry } from '../context/AppContext';
import CodeEditor from './CodeEditor';

export default function HistoryPanel() {
  const { history, toggleFavorite, removeFromHistory, clearHistory } = useApp();
  const [search, setSearch] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);

  const filtered = history.filter(entry => {
    const matchesSearch = !search ||
      entry.sourceCode.toLowerCase().includes(search.toLowerCase()) ||
      entry.sourceLang.toLowerCase().includes(search.toLowerCase()) ||
      entry.targetLang.toLowerCase().includes(search.toLowerCase());
    const matchesFav = !showFavoritesOnly || entry.isFavorite;
    return matchesSearch && matchesFav;
  });

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
      {/* Search & filters */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        padding: '0.5rem',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
      }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search translations..."
          style={{
            flex: 1,
            padding: '0.4rem 0.6rem',
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            outline: 'none',
          }}
        />
        <button
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          style={{
            padding: '0.4rem 0.6rem',
            backgroundColor: showFavoritesOnly ? 'var(--warning-bg)' : 'var(--bg-tertiary)',
            color: showFavoritesOnly ? 'var(--warning)' : 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          ⭐
        </button>
        <button
          onClick={clearHistory}
          disabled={history.length === 0}
          style={{
            padding: '0.4rem 0.6rem',
            backgroundColor: 'var(--error-bg)',
            color: 'var(--error)',
            border: '1px solid var(--error)',
            borderRadius: 'var(--radius-sm)',
            cursor: history.length ? 'pointer' : 'not-allowed',
            fontSize: '0.85rem',
          }}
        >
          Clear
        </button>
      </div>

      {/* Stats */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '0.4rem 0.75rem',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
      }}>
        <span>{filtered.length} translation{filtered.length !== 1 ? 's' : ''}</span>
        <span>{history.length} total</span>
      </div>

      {/* History list or detail view */}
      {selectedEntry ? (
        <DetailView entry={selectedEntry} onBack={() => setSelectedEntry(null)} />
      ) : (
        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem',
        }}>
          {filtered.map(entry => (
            <div
              key={entry.id}
              onClick={() => setSelectedEntry(entry)}
              style={{
                padding: '0.6rem 0.75rem',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '0.15rem 0.4rem',
                    backgroundColor: 'var(--accent-bg)',
                    color: 'var(--accent)',
                    borderRadius: 'var(--radius-sm)',
                  }}>
                    {entry.sourceLang} → {entry.targetLang}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    {entry.sourceCode.split('\n')[0]?.trim().slice(0, 50)}...
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {formatTime(entry.timestamp)}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); toggleFavorite(entry.id); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      color: entry.isFavorite ? 'var(--warning)' : 'var(--text-muted)',
                    }}
                  >
                    {entry.isFavorite ? '★' : '☆'}
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); removeFromHistory(entry.id); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.9rem',
            }}>
              {history.length === 0 ? 'No translations yet' : 'No matching translations'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailView({ entry, onBack }: { entry: HistoryEntry; onBack: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onBack} style={{
          padding: '0.3rem 0.6rem',
          backgroundColor: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          fontSize: '0.8rem',
        }}>
          ← Back
        </button>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button
            onClick={() => {
              navigator.clipboard.writeText(entry.result.translatedCode);
            }}
            style={{
              padding: '0.3rem 0.6rem',
              backgroundColor: 'var(--success-bg)',
              color: 'var(--success)',
              border: '1px solid var(--success)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontSize: '0.8rem',
            }}
          >
            Copy Output
          </button>
        </div>
      </div>
      <div style={{
        padding: '0.5rem',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
      }}>
        {entry.sourceLang} → {entry.targetLang} • {new Date(entry.timestamp).toLocaleString()}
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
        <div style={{
          padding: '0.4rem 0.75rem',
          backgroundColor: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border)',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
        }}>
          Translated Code ({entry.targetLang})
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <CodeEditor value={entry.result.translatedCode} language={entry.targetLang} readOnly height="100%" />
        </div>
      </div>
    </div>
  );
}
