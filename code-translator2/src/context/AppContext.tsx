import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Language, TranslationResult } from '../types';

export interface HistoryEntry {
  id: string;
  timestamp: number;
  sourceLang: Language;
  targetLang: Language;
  sourceCode: string;
  result: TranslationResult;
  isFavorite: boolean;
}

export interface LastTranslation {
  sourceCode: string;
  targetCode: string;
  sourceLang: Language;
  targetLang: Language;
  result: TranslationResult | null;
}

export interface AppState {
  theme: 'dark' | 'light';
  autoTranslate: boolean;
  translationMode: 'regex' | 'llm';
  history: HistoryEntry[];
  activeTab: string;
  lastTranslation: LastTranslation | null;
}

export interface AppContextType extends AppState {
  setTheme: (theme: 'dark' | 'light') => void;
  setAutoTranslate: (auto: boolean) => void;
  setTranslationMode: (mode: 'regex' | 'llm') => void;
  setLastTranslation: (translation: LastTranslation | null) => void;
  addToHistory: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void;
  toggleFavorite: (id: string) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;
  setActiveTab: (tab: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

function loadInitialState(): AppState {
  const saved = localStorage.getItem('code-translator-state');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Check for shared URL data
      const shared = localStorage.getItem('code-translator-shared');
      if (shared) {
        try {
          const data = JSON.parse(shared);
          if (data.s && data.t) {
            localStorage.removeItem('code-translator-shared');
            return {
              ...parsed,
              lastTranslation: {
                sourceCode: data.s,
                targetCode: data.t,
                sourceLang: (data.sl as Language) || 'python',
                targetLang: (data.tl as Language) || 'cpp',
                result: { translatedCode: data.t, comments: ['Loaded from shared URL'], confidence: 0.8 },
              },
            };
          }
        } catch {}
      }
      return parsed;
    } catch { /* ignore */ }
  }
  return {
    theme: 'dark',
    autoTranslate: false,
    translationMode: 'regex',
    history: [],
    activeTab: 'translate',
    lastTranslation: null,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadInitialState);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
  }, [state.theme]);

  const persist = useCallback((s: AppState) => {
    localStorage.setItem('code-translator-state', JSON.stringify(s));
  }, []);

  const setTheme = useCallback((theme: 'dark' | 'light') => {
    setState(prev => {
      const next = { ...prev, theme };
      persist(next);
      document.documentElement.setAttribute('data-theme', theme);
      return next;
    });
  }, [persist]);

  const setAutoTranslate = useCallback((auto: boolean) => {
    setState(prev => {
      const next = { ...prev, autoTranslate: auto };
      persist(next);
      return next;
    });
  }, [persist]);

  const setTranslationMode = useCallback((mode: 'regex' | 'llm') => {
    setState(prev => {
      const next = { ...prev, translationMode: mode };
      persist(next);
      return next;
    });
  }, [persist]);

  const addToHistory = useCallback((entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
    setState(prev => {
      const newEntry: HistoryEntry = {
        ...entry,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      };
      const next = {
        ...prev,
        history: [newEntry, ...prev.history].slice(0, 50),
      };
      persist(next);
      return next;
    });
  }, [persist]);

  const toggleFavorite = useCallback((id: string) => {
    setState(prev => {
      const next = {
        ...prev,
        history: prev.history.map(h =>
          h.id === id ? { ...h, isFavorite: !h.isFavorite } : h
        ),
      };
      persist(next);
      return next;
    });
  }, [persist]);

  const removeFromHistory = useCallback((id: string) => {
    setState(prev => {
      const next = { ...prev, history: prev.history.filter(h => h.id !== id) };
      persist(next);
      return next;
    });
  }, [persist]);

  const clearHistory = useCallback(() => {
    setState(prev => {
      const next = { ...prev, history: [] };
      persist(next);
      return next;
    });
  }, [persist]);

  const setActiveTab = useCallback((tab: string) => {
    setState(prev => ({ ...prev, activeTab: tab }));
  }, []);

  const setLastTranslation = useCallback((translation: LastTranslation | null) => {
    setState(prev => {
      const next = { ...prev, lastTranslation: translation };
      persist(next);
      return next;
    });
  }, [persist]);

  const value: AppContextType = {
    ...state,
    setTheme,
    setAutoTranslate,
    setTranslationMode,
    setLastTranslation,
    addToHistory,
    toggleFavorite,
    removeFromHistory,
    clearHistory,
    setActiveTab,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
