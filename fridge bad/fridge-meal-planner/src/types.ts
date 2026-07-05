export interface FridgeItem {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  category: Category;
  expiry_date: string | null;
  barcode: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
  daysUntilExpiry?: number;
}

export type Category =
  | 'Dairy'
  | 'Meat'
  | 'Seafood'
  | 'Vegetables'
  | 'Fruits'
  | 'Grains'
  | 'Beverages'
  | 'Condiments'
  | 'Frozen'
  | 'Snacks'
  | 'Other';

export const CATEGORIES: Category[] = [
  'Dairy', 'Meat', 'Seafood', 'Vegetables', 'Fruits',
  'Grains', 'Beverages', 'Condiments', 'Frozen', 'Snacks', 'Other',
];

export const CATEGORY_ICONS: Record<Category, string> = {
  Dairy:      '🥛',
  Meat:       '🥩',
  Seafood:    '🐟',
  Vegetables: '🥦',
  Fruits:     '🍎',
  Grains:     '🌾',
  Beverages:  '🧃',
  Condiments: '🫙',
  Frozen:     '🧊',
  Snacks:     '🍿',
  Other:      '📦',
};

export interface Nutrition {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

export interface Recipe {
  title: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  prep_time: number;
  cook_time: number;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
  uses: string[];
  missing: string[];
  steps: string[];
  nutrition_per_serving: Nutrition;
  tags: string[];
}

export interface MealPlanEntry {
  id: number;
  day_index: number;
  slot: string;
  recipe_json: string;
  week_start: string;
}

export interface ShoppingItem {
  id: number;
  name: string;
  quantity: string;
  unit: string;
  category: Category;
  checked: 0 | 1;
  source: string;
  created_at: string;
}

export interface Preferences {
  dietary: string[];
  allergies: string[];
  household_size: string;
  theme: 'dark' | 'light';
  expiry_warning_days: string;
}

export const DIETARY_OPTIONS = [
  'Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Pescatarian',
  'Gluten-Free', 'Dairy-Free', 'Low-Carb', 'Keto', 'Paleo',
];

export const COMMON_ALLERGIES = [
  'Nuts', 'Peanuts', 'Shellfish', 'Fish', 'Eggs',
  'Milk', 'Wheat', 'Soy', 'Sesame',
];

export const QUICK_ADD_PRESETS: Partial<FridgeItem>[] = [
  { name: 'Eggs',        quantity: 12, unit: 'pcs',  category: 'Dairy' },
  { name: 'Milk',        quantity: 1,  unit: 'L',    category: 'Dairy' },
  { name: 'Butter',      quantity: 250,unit: 'g',    category: 'Dairy' },
  { name: 'Cheese',      quantity: 200,unit: 'g',    category: 'Dairy' },
  { name: 'Chicken',     quantity: 500,unit: 'g',    category: 'Meat' },
  { name: 'Ground Beef', quantity: 400,unit: 'g',    category: 'Meat' },
  { name: 'Salmon',      quantity: 300,unit: 'g',    category: 'Seafood' },
  { name: 'Broccoli',    quantity: 1,  unit: 'head', category: 'Vegetables' },
  { name: 'Spinach',     quantity: 150,unit: 'g',    category: 'Vegetables' },
  { name: 'Tomatoes',    quantity: 3,  unit: 'pcs',  category: 'Vegetables' },
  { name: 'Garlic',      quantity: 1,  unit: 'bulb', category: 'Vegetables' },
  { name: 'Onion',       quantity: 2,  unit: 'pcs',  category: 'Vegetables' },
  { name: 'Potatoes',    quantity: 4,  unit: 'pcs',  category: 'Vegetables' },
  { name: 'Apples',      quantity: 4,  unit: 'pcs',  category: 'Fruits' },
  { name: 'Bananas',     quantity: 5,  unit: 'pcs',  category: 'Fruits' },
  { name: 'Lemons',      quantity: 3,  unit: 'pcs',  category: 'Fruits' },
  { name: 'Rice',        quantity: 500,unit: 'g',    category: 'Grains' },
  { name: 'Pasta',       quantity: 500,unit: 'g',    category: 'Grains' },
  { name: 'Bread',       quantity: 1,  unit: 'loaf', category: 'Grains' },
  { name: 'Orange Juice',quantity: 1,  unit: 'L',    category: 'Beverages' },
];
