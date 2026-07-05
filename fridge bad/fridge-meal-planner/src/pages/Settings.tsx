import { useState, useEffect } from 'react';
import {
  Save, RefreshCw, Users, Heart,
  AlertCircle, Sun, Moon, Sliders,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getPrefs, savePrefs } from '../lib/api';
import {
  DIETARY_OPTIONS, COMMON_ALLERGIES, type Preferences,
} from '../types';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';

export default function Settings() {
  const { theme, toggle } = useTheme();
  const [prefs, setPrefs]   = useState<Preferences>({
    dietary: [],
    allergies: [],
    household_size: '2',
    theme: 'dark',
    expiry_warning_days: '3',
  });
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    getPrefs()
      .then(p => setPrefs(prev => ({ ...prev, ...p })))
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  const togglePref = (key: 'dietary' | 'allergies', val: string) => {
    setPrefs(p => ({
      ...p,
      [key]: p[key].includes(val)
        ? p[key].filter(x => x !== val)
        : [...p[key], val],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await savePrefs(prefs);
      toast.success('Preferences saved');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded-2xl shimmer bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Personalise your meal suggestions</p>
      </div>

      {/* Household */}
      <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-brand-500" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Household</h2>
        </div>
        <div>
          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
            Number of people in household
          </label>
          <div className="flex gap-2">
            {['1','2','3','4','5','6+'].map(n => (
              <button
                key={n}
                onClick={() => setPrefs(p => ({ ...p, household_size: n }))}
                className={cn(
                  'w-10 h-10 rounded-xl border text-sm font-medium transition-all',
                  prefs.household_size === n
                    ? 'border-brand-500 bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                    : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-brand-500',
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Dietary preferences */}
      <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="w-4 h-4 text-brand-500" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Dietary Preferences</h2>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          These are included in every AI meal suggestion prompt
        </p>
        <div className="flex flex-wrap gap-2">
          {DIETARY_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => togglePref('dietary', opt)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium border transition-all',
                prefs.dietary.includes(opt)
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300'
                  : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400',
              )}
            >
              {opt}
            </button>
          ))}
        </div>
        {prefs.dietary.length > 0 && (
          <p className="text-xs text-brand-500 dark:text-brand-400 mt-2">
            Active: {prefs.dietary.join(', ')}
          </p>
        )}
      </section>

      {/* Allergies */}
      <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Allergies & Intolerances</h2>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          The AI will avoid these ingredients in all suggestions
        </p>
        <div className="flex flex-wrap gap-2">
          {COMMON_ALLERGIES.map(a => (
            <button
              key={a}
              onClick={() => togglePref('allergies', a)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium border transition-all',
                prefs.allergies.includes(a)
                  ? 'border-red-400 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                  : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400',
              )}
            >
              {a}
            </button>
          ))}
        </div>
        {prefs.allergies.length > 0 && (
          <p className="text-xs text-red-500 dark:text-red-400 mt-2">
            Avoiding: {prefs.allergies.join(', ')}
          </p>
        )}
      </section>

      {/* App settings */}
      <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sliders className="w-4 h-4 text-brand-500" />
          <h2 className="font-semibold text-gray-900 dark:text-white">App Settings</h2>
        </div>

        {/* Theme */}
        <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Theme</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Dark or light mode</p>
          </div>
          <button
            onClick={toggle}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700
              text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            {theme === 'dark' ? 'Dark' : 'Light'}
          </button>
        </div>

        {/* Expiry warning */}
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Expiry warning</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Warn when items expire within this many days</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={14}
              value={prefs.expiry_warning_days}
              onChange={e => setPrefs(p => ({ ...p, expiry_warning_days: e.target.value }))}
              className="w-16 px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-700
                bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm text-center
                focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <span className="text-sm text-gray-500">days</span>
          </div>
        </div>
      </section>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
          bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed
          text-white font-semibold transition-colors shadow-lg shadow-brand-500/20"
      >
        {saving ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save preferences</>}
      </button>
    </div>
  );
}
