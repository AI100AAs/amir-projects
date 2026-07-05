import { useState } from 'react';
import {
  Clock, ChefHat, Users, Flame, Beef, Wheat, Droplets,
  CheckCircle2, ShoppingCart, CalendarPlus, ChevronDown, ChevronUp,
  Leaf, Zap,
} from 'lucide-react';
import type { Recipe } from '../types';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

const MEAL_TYPE_COLOR: Record<string, string> = {
  breakfast: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400',
  lunch:     'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400',
  dinner:    'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400',
  snack:     'bg-pink-100 dark:bg-pink-950/60 text-pink-700 dark:text-pink-400',
};

const DIFFICULTY_COLOR: Record<string, string> = {
  easy:   'text-green-400',
  medium: 'text-yellow-400',
  hard:   'text-red-400',
};

interface Props {
  recipe: Recipe;
  onAddToShopping?: (missing: string[]) => void;
  onAddToPlanner?: (recipe: Recipe) => void;
  compact?: boolean;
}

export default function RecipeCard({ recipe, onAddToShopping, onAddToPlanner, compact }: Props) {
  const [expanded, setExpanded] = useState(false);
  const n = recipe.nutrition_per_serving;

  return (
    <div className={cn(
      'rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden card-hover',
      compact && 'text-sm',
    )}>
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-900 dark:text-white leading-tight">{recipe.title}</h3>
          <span className={cn('shrink-0 px-2 py-0.5 rounded-full text-xs font-medium capitalize',
            MEAL_TYPE_COLOR[recipe.meal_type] || MEAL_TYPE_COLOR.dinner)}>
            {recipe.meal_type}
          </span>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{recipe.description}</p>

        {/* Meta row */}
        <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {recipe.prep_time + recipe.cook_time}min
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {recipe.servings} serving{recipe.servings !== 1 ? 's' : ''}
          </span>
          <span className={cn('flex items-center gap-1 font-medium', DIFFICULTY_COLOR[recipe.difficulty])}>
            <ChefHat className="w-3.5 h-3.5" />
            {recipe.difficulty}
          </span>
        </div>
      </div>

      {/* Nutrition strip */}
      {n && (
        <div className="grid grid-cols-4 divide-x divide-gray-100 dark:divide-gray-800 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          {[
            { icon: <Flame className="w-3 h-3" />, val: n.calories, label: 'kcal', color: 'text-orange-500' },
            { icon: <Beef className="w-3 h-3" />, val: n.protein_g, label: 'protein', color: 'text-blue-500' },
            { icon: <Wheat className="w-3 h-3" />, val: n.carbs_g, label: 'carbs', color: 'text-yellow-500' },
            { icon: <Droplets className="w-3 h-3" />, val: n.fat_g, label: 'fat', color: 'text-pink-500' },
          ].map(({ icon, val, label, color }) => (
            <div key={label} className="flex flex-col items-center py-2 px-1">
              <span className={cn('mb-0.5', color)}>{icon}</span>
              <span className="text-xs font-semibold text-gray-900 dark:text-white">{Math.round(val)}g</span>
              <span className="text-[10px] text-gray-400 capitalize">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Ingredients */}
      <div className="px-4 py-3 space-y-2">
        {/* Uses from fridge */}
        {recipe.uses.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> From your fridge
            </p>
            <div className="flex flex-wrap gap-1">
              {recipe.uses.map(u => (
                <span key={u} className="px-2 py-0.5 rounded-full text-xs bg-green-100 dark:bg-green-950/50
                  text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900">
                  {u}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Missing ingredients */}
        {recipe.missing.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
              <ShoppingCart className="w-3.5 h-3.5 text-orange-500" /> Missing ingredients
            </p>
            <div className="flex flex-wrap gap-1">
              {recipe.missing.map(m => (
                <span key={m} className="px-2 py-0.5 rounded-full text-xs bg-orange-100 dark:bg-orange-950/50
                  text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-900">
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Steps (expandable) */}
      {recipe.steps.length > 0 && (
        <div className="border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium
              text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <span>Instructions ({recipe.steps.length} steps)</span>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {expanded && (
            <ol className="px-4 pb-4 space-y-2">
              {recipe.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-700 dark:text-gray-300">
                  <span className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full
                    bg-brand-500 text-white text-xs font-bold">{i + 1}</span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {/* Tags */}
      {recipe.tags?.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1">
          {recipe.tags.map(t => (
            <span key={t} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
              bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              {t.includes('veg') ? <Leaf className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex border-t border-gray-100 dark:border-gray-800">
        {onAddToShopping && recipe.missing.length > 0 && (
          <button
            onClick={() => {
              onAddToShopping(recipe.missing);
              toast.success(`${recipe.missing.length} item${recipe.missing.length !== 1 ? 's' : ''} added to shopping list`);
            }}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium
              text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800
              transition-colors border-r border-gray-100 dark:border-gray-800"
          >
            <ShoppingCart className="w-4 h-4" />
            Add to shopping
          </button>
        )}
        {onAddToPlanner && (
          <button
            onClick={() => onAddToPlanner(recipe)}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium
              text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/30
              transition-colors"
          >
            <CalendarPlus className="w-4 h-4" />
            Add to planner
          </button>
        )}
      </div>
    </div>
  );
}
