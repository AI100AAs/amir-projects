import { useState, useRef, useCallback } from 'react';
import {
  Sparkles, AlertTriangle, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { streamMeals, addShoppingItems, saveMealPlanEntry } from '../lib/api';
import { tryParseRecipes } from '../lib/utils';
import type { Recipe } from '../types';
import RecipeCard from '../components/RecipeCard';

type State = 'idle' | 'streaming' | 'done' | 'error';

export default function Meals() {
  const [state, setState]         = useState<State>('idle');
  const [rawText, setRawText]     = useState('');
  const [recipes, setRecipes]     = useState<Recipe[]>([]);
  const [prioritise, setPrioritise] = useState(false);
  const [errorMsg, setErrorMsg]   = useState('');
  const [planTarget, setPlanTarget] = useState<{ recipe: Recipe } | null>(null);
  const rawRef = useRef('');

  const generate = useCallback(() => {
    setState('streaming');
    setRawText('');
    setRecipes([]);
    setErrorMsg('');
    rawRef.current = '';

    streamMeals(
      prioritise,
      (token) => {
        rawRef.current += token;
        setRawText(rawRef.current);
        const parsed = tryParseRecipes(rawRef.current);
        if (parsed) setRecipes(parsed);
      },
      () => {
        const parsed = tryParseRecipes(rawRef.current);
        if (parsed && parsed.length > 0) {
          setRecipes(parsed);
          setState('done');
        } else {
          setErrorMsg('Could not parse recipes from AI response. Try again.');
          setState('error');
        }
      },
      (e) => {
        setErrorMsg(e.message);
        setState('error');
      },
    );
  }, [prioritise]);

  const handleAddToShopping = async (missing: string[]) => {
    try {
      await addShoppingItems(
        missing.map(name => ({ name, quantity: '1', unit: '', category: 'Other', source: 'recipe' }))
      );
    } catch (e: any) { toast.error(e.message); }
  };

  const handleAddToPlanner = async (recipe: Recipe) => {
    setPlanTarget({ recipe });
  };

  const confirmAddToPlanner = async (dayIndex: number, slot: string) => {
    if (!planTarget) return;
    try {
      await saveMealPlanEntry(dayIndex, slot, planTarget.recipe);
      toast.success(`${planTarget.recipe.title} added to planner`);
      setPlanTarget(null);
    } catch (e: any) { toast.error(e.message); }
  };

  const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Meal Suggestions</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">AI-powered recipes from your fridge</p>
      </div>

      {/* Controls */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <label className="flex items-center gap-3 cursor-pointer flex-1">
            <div
              onClick={() => setPrioritise(p => !p)}
              className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                prioritise ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-700'
              }`}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                prioritise ? 'translate-x-5' : ''
              }`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                <AlertTriangle className={`w-4 h-4 ${prioritise ? 'text-orange-500' : 'text-gray-400'}`} />
                Prioritise expiring items
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Use ingredients that expire soon first — reduce waste
              </p>
            </div>
          </label>

          <button
            onClick={generate}
            disabled={state === 'streaming'}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl
              bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed
              text-white font-semibold text-sm transition-colors shadow-lg shadow-brand-500/20"
          >
            {state === 'streaming' ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Generating…</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Suggest meals</>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {state === 'error' && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-400">Error generating meals</p>
            <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Streaming raw preview while waiting for full parse */}
      {state === 'streaming' && recipes.length === 0 && rawText && (
        <div className="rounded-2xl border border-brand-200 dark:border-brand-900 bg-brand-50 dark:bg-brand-950/20 p-4">
          <p className="text-xs font-medium text-brand-600 dark:text-brand-400 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" /> AI is thinking…
          </p>
          <p className={`text-xs text-gray-600 dark:text-gray-400 font-mono whitespace-pre-wrap line-clamp-6 ${state === 'streaming' ? 'cursor-blink' : ''}`}>
            {rawText.slice(-300)}
          </p>
        </div>
      )}

      {/* Streaming skeleton cards */}
      {state === 'streaming' && recipes.length === 0 && !rawText && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="h-32 shimmer bg-gray-100 dark:bg-gray-800" />
              <div className="p-4 space-y-2">
                <div className="h-4 w-3/4 rounded shimmer bg-gray-100 dark:bg-gray-800" />
                <div className="h-3 w-1/2 rounded shimmer bg-gray-100 dark:bg-gray-800" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recipe cards */}
      {recipes.length > 0 && (
        <>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {state === 'streaming' ? `Generating… (${recipes.length} found so far)` : `${recipes.length} recipe${recipes.length !== 1 ? 's' : ''} suggested`}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {recipes.map((r, i) => (
              <div key={i} className="fade-in">
                <RecipeCard
                  recipe={r}
                  onAddToShopping={handleAddToShopping}
                  onAddToPlanner={handleAddToPlanner}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {state === 'idle' && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-6xl mb-4">🍳</span>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">Ready to cook?</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
            Click "Suggest meals" and the AI will generate recipes from what's in your fridge.
          </p>
        </div>
      )}

      {/* Add to planner modal */}
      {planTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setPlanTarget(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6 w-full max-w-sm fade-in"
            onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Add "{planTarget.recipe.title}" to planner
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {DAYS.map((day, i) => (
                <button
                  key={day}
                  onClick={() => confirmAddToPlanner(i, 'dinner')}
                  className="px-3 py-2 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700
                    text-gray-700 dark:text-gray-300 hover:bg-brand-50 dark:hover:bg-brand-950/30
                    hover:border-brand-500 hover:text-brand-700 dark:hover:text-brand-300 transition-all"
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}