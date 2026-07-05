import { useState, useEffect } from 'react';
import {
  Refrigerator, UtensilsCrossed, ShoppingCart,
  CalendarDays, Settings, Sun, Moon, Wifi, WifiOff,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { getHealth } from '../lib/api';
import { cn } from '../lib/utils';

type Page = 'inventory' | 'meals' | 'shopping' | 'planner' | 'settings';

interface Props {
  page: Page;
  onNavigate: (p: Page) => void;
}

const NAV_ITEMS: { id: Page; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'inventory', label: 'Fridge',    icon: ({ className }) => <Refrigerator className={className} /> },
  { id: 'meals',     label: 'Meals',     icon: ({ className }) => <UtensilsCrossed className={className} /> },
  { id: 'shopping',  label: 'Shopping',  icon: ({ className }) => <ShoppingCart className={className} /> },
  { id: 'planner',   label: 'Planner',   icon: ({ className }) => <CalendarDays className={className} /> },
  { id: 'settings',  label: 'Settings',  icon: ({ className }) => <Settings className={className} /> },
];

export default function Navbar({ page, onNavigate }: Props) {
  const { theme, toggle } = useTheme();
  const [aiOk, setAiOk] = useState<boolean | null>(null);
  const [model, setModel] = useState('');

  useEffect(() => {
    const check = () =>
      getHealth()
        .then(h => { setAiOk(h.ok); setModel(h.model); })
        .catch(() => setAiOk(false));
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-4
        bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Refrigerator className="w-6 h-6 text-brand-500" />
          <span className="font-bold text-gray-900 dark:text-white text-lg tracking-tight">
            FridgeAI
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* LM Studio status */}
          <div className={cn(
            'hidden sm:flex items-center gap-1.5 text-xs px-2 py-1 rounded-full',
            aiOk === true  ? 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-400' :
            aiOk === false ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400' :
                             'bg-gray-100 dark:bg-gray-800 text-gray-500',
          )}>
            {aiOk === true  ? <Wifi className="w-3 h-3" />    :
             aiOk === false ? <WifiOff className="w-3 h-3" /> :
             <span className="w-3 h-3 rounded-full bg-gray-400 animate-pulse" />}
            <span className="max-w-[120px] truncate">
              {aiOk === true ? model || 'AI Connected' : aiOk === false ? 'AI Offline' : 'Checking…'}
            </span>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="w-8 h-8 flex items-center justify-center rounded-lg
              text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white
              hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-14 bottom-0 w-16 flex-col items-center gap-1 pt-4
        bg-white/80 dark:bg-gray-900/80 backdrop-blur border-r border-gray-200 dark:border-gray-800 z-30">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            title={label}
            className={cn(
              'w-12 h-12 flex flex-col items-center justify-center rounded-xl gap-0.5 transition-all text-xs font-medium',
              page === id
                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white',
            )}
          >
            <Icon className="w-5 h-5" />
          </button>
        ))}
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 flex items-center justify-around
        bg-white/90 dark:bg-gray-900/90 backdrop-blur border-t border-gray-200 dark:border-gray-800">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={cn(
              'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all',
              page === id
                ? 'text-brand-500'
                : 'text-gray-400 dark:text-gray-500',
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
