import { useApp } from '../context/AppContext';

export default function SettingsPanel() {
  const { theme, autoTranslate, translationMode, setTheme, setAutoTranslate, setTranslationMode } = useApp();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', height: '100%', overflowY: 'auto' }}>
      {/* Theme */}
      <div style={{
        padding: '1rem',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
      }}>
        <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Appearance</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {(['dark', 'light'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              style={{
                flex: 1,
                padding: '0.6rem',
                backgroundColor: theme === t ? 'var(--accent)' : 'var(--bg-tertiary)',
                color: theme === t ? 'white' : 'var(--text-primary)',
                border: `1px solid ${theme === t ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: theme === t ? 500 : 400,
              }}
            >
              {t === 'dark' ? '🌙 Dark' : '☀️ Light'}
            </button>
          ))}
        </div>
      </div>

      {/* Translation settings */}
      <div style={{
        padding: '1rem',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
      }}>
        <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Translation</h3>
        
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
            Default Mode
          </label>
          <select
            value={translationMode}
            onChange={e => setTranslationMode(e.target.value as 'regex' | 'llm')}
            style={{
              width: '100%',
              padding: '0.5rem',
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
            }}
          >
            <option value="regex">⚡ Regex (Fast, offline)</option>
            <option value="llm">🤖 LLM (Smart, requires LM Studio)</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>Auto-translate</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Translate on every keystroke</div>
          </div>
          <label style={{
            position: 'relative',
            width: '44px',
            height: '24px',
            cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={autoTranslate}
              onChange={e => setAutoTranslate(e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: autoTranslate ? 'var(--accent)' : 'var(--bg-hover)',
              borderRadius: '12px',
              transition: 'background 150ms ease',
            }} />
            <span style={{
              position: 'absolute',
              top: '2px',
              left: autoTranslate ? '22px' : '2px',
              width: '20px',
              height: '20px',
              backgroundColor: 'white',
              borderRadius: '50%',
              transition: 'transform 150ms ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }} />
          </label>
        </div>
      </div>

      {/* LM Studio info */}
      <div style={{
        padding: '1rem',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
      }}>
        <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>LM Studio</h3>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <p style={{ marginBottom: '0.5rem' }}>
            LLM mode requires LM Studio running on <code style={{
              padding: '0.15rem 0.3rem',
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: '3px',
              fontSize: '0.8rem',
            }}>localhost:1234</code>
          </p>
          <p>
            Model: <code style={{
              padding: '0.15rem 0.3rem',
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: '3px',
              fontSize: '0.8rem',
            }}>google/gemma-4-e4b-qat</code>
          </p>
        </div>
      </div>

      {/* About */}
      <div style={{
        padding: '1rem',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
      }}>
        <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>About</h3>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <p style={{ marginBottom: '0.5rem' }}>
            <strong>Code Translator</strong> v2.0
          </p>
          <p style={{ marginBottom: '0.5rem' }}>
            Translate code between Python, C++, JavaScript, and more using regex rules or AI-powered LLM translations.
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Built with Vite + React + TypeScript + CodeMirror
          </p>
        </div>
      </div>
    </div>
  );
}
