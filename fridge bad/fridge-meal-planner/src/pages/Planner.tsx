import { useState, useEffect } from 'react';
import {
  CalendarDays, Sparkles, RefreshCw, Trash2, X,
  Clock, ChefHat, Flame, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getMealPlan, generateWeeklyPlan, removeMealPlanEntry, clearMealPlan,
} from '../lib/api';
import type { MealPlanEntry, Recipe } from '../types';
import { DAYS, cn } from '../lib/utils';
import RecipeCard from '../components/RecipeCard';

type ModalContent = { recipe: Recipe; day: string; slot: string } | null;

export default function Planner() {
  const [plan, setPlan]       = useState<MealPlanEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [modal, setModal]     = useState<ModalContent>(null);

  const load = async () => {
    try { setPlan(await getMealPlan()); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleGenerate = async () => {
    if (!confirm('This will replace your current weekly plan. Continue?')) return;
    setGenerating(true);
    try {
      await generateWeeklyPlan();
      await load();
      toast.success('Weekly meal plan generated!');
    } catch (e: any) {
      toast.error('Failed to generate plan: ' + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('Clear the entire meal plan?')) return;
    try {
      await clearMealPlan();
      setPlan([]);
      toast.success('Meal plan cleared');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleRemove = async (dayIndex: number, slot: string) => {
    try {
      await removeMealPlanEntry(dayIndex, slot);
      setPlan(prev => prev.filter(p => !(p.day_index === dayIndex && p.slot === slot)));
    } catch (e: any) { toast.error(e.message); }
  };

  const getEntry = (dayIndex: number, slot: string) =>
    plan.find(p => p.day_index === dayIndex && p.slot === slot);

  // Weekly nutrition totals
  const allRecipes = plan.map(p => { try { return JSON.parse(p.recipe_json) as Recipe; } catch { return null; } }).filter(Boolean) as Recipe[];
  const totalCals = allRecipes.reduce((s, r) => s + (r.nutrition_per_serving?.calories || 0), 0);
  const avgCals = allRecipes.length ? Math.round(totalCals / allRecipes.length) : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Weekly Planner</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {plan.length} of {DAYS.length} days planned
          </p>
        </div>
        <div className="flex gap-2">
          {plan.length > 0 && (
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 dark:border-red-900
                text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" /> Clear
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600
              disabled:opacity-50 disabled:cursor-not-allowed
              text-white font-semibold text-sm transition-colors shadow-lg shadow-brand-500/20"
          >
            {generating
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generating…</>
              : <><Sparkles className="w-4 h-4" /> Plan my week</>
            }
          </button>
        </div>
      </div>

      {/* Nutrition summary */}
      {allRecipes.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900 text-center">
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{Math.round(totalCals)}</p>
            <p className="text-xs text-orange-500 dark:text-orange-500">total kcal</p>
          </div>
          <div className="rounded-xl p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{avgCals}</p>
            <p className="text-xs text-blue-500">avg kcal/meal</p>
          </div>
          <div className="rounded-xl p-3 bg-brand-50 dark:bg-brand-950/30 border border-brand-100 dark:border-brand-900 text-center">
            <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">{allRecipes.length}</p>
            <p className="text-xs text-brand-500 dark:text-brand-400">meals planned</p>
          </div>
        </div>
      )}

      {generating && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-brand-50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-900">
          <Sparkles className="w-5 h-5 text-brand-500 animate-pulse shrink-0" />
          <div>
            <p className="text-sm font-medium text-brand-700 dark:text-brand-400">AI is planning your week…</p>
            <p className="text-xs text-brand-500 dark:text-brand-500 mt-0.5">This may take 20–30 seconds</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl shimmer bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {DAYS.map((day, i) => {
            const entry = getEntry(i, 'dinner');
            const recipe: Recipe | null = entry ? (() => { try { return JSON.parse(entry.recipe_json); } catch { return null; } })() : null;

            return (
              <div key={day} className={cn(
                'rounded-2xl border overflow-hidden transition-all',
                recipe
                  ? 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'
                  : 'border-dashed border-gray-300 dark:border-gray-700',
              )}>
                {/* Day header */}
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                  <CalendarDays className="w-4 h-4 text-brand-500 shrink-0" />
                  <span className="font-semibold text-gray-900 dark:text-white text-sm">{day}</span>
                  {!recipe && (
                    <span className="ml-auto text-xs text-gray-400">No meal planned</span>
                  )}
                </div>

                {recipe ? (
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => setModal({ recipe, day, slot: 'dinner' })}
                          className="text-left"
                        >
                          <h4 className="font-semibold text-gray-900 dark:text-white hover:text-brand-500 dark:hover:text-brand-400 transition-colors">
                            {recipe.title}
                          </h4>
                        </button>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{recipe.description}</p>
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />{recipe.prep_time + recipe.cook_time}min
                          </span>
                          <span className="flex items-center gap-1">
                            <ChefHat className="w-3 h-3" />{recipe.difficulty}
                          </span>
                          {recipe.nutrition_per_serving?.calories && (
                            <span className="flex items-center gap-1 text-orange-500">
                              <Flame className="w-3 h-3" />{recipe.nutrition_per_serving.calories} kcal
                            </span>
                          )}
                          {recipe.missing?.length > 0 && (
                            <span className="flex items-center gap-1 text-orange-400">
                              <AlertTriangle className="w-3 h-3" /> {recipe.missing.length} missing
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemove(i, 'dinner')}
                        className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg
                          text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="px-4 py-3 flex items-center justify-center">
                    <span className="text-xs text-gray-400">
                      Generate a plan or add from Meals tab
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty CTA */}
      {!loading && plan.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <span className="text-6xl mb-4">📅</span>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">No meals planned yet</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
            Click "Plan my week" to auto-fill from your fridge inventory
          </p>
        </div>
      )}

      {/* Recipe detail modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto fade-in" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setModal(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center
                rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <RecipeCard recipe={modal.recipe} />
          </div>
        </div>
      )}
    </div>
  );
}
