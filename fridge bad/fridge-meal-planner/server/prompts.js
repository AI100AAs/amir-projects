/**
 * Prompt templates for all AI interactions.
 * Centralised here so they're easy to tune.
 */

export function buildMealPrompt({ items, prefs, prioritiseExpiring }) {
  const dietary = prefs.dietary?.length ? prefs.dietary.join(', ') : 'none';
  const allergies = prefs.allergies?.length ? prefs.allergies.join(', ') : 'none';
  const householdSize = prefs.household_size || 2;

  const expiringItems = items
    .filter(i => i.daysUntilExpiry !== undefined && i.daysUntilExpiry <= 3)
    .map(i => i.name);

  const itemList = items
    .map(i => `- ${i.name}: ${i.quantity} ${i.unit}${i.daysUntilExpiry !== undefined && i.daysUntilExpiry <= 3 ? ' [EXPIRING SOON]' : ''}`)
    .join('\n');

  const expiryNote = prioritiseExpiring && expiringItems.length > 0
    ? `IMPORTANT: Prioritise using these items that are expiring soon: ${expiringItems.join(', ')}. Try to include them in at least 2-3 recipes.`
    : '';

  return `You are a professional chef and nutritionist. Suggest 4 recipes based on the fridge inventory below.

FRIDGE INVENTORY:
${itemList}

HOUSEHOLD: ${householdSize} people
DIETARY REQUIREMENTS: ${dietary}
ALLERGIES/INTOLERANCES: ${allergies}
${expiryNote}

Rules:
- Only suggest recipes that use primarily the available ingredients
- List missing ingredients separately (keep them minimal)
- Provide realistic nutrition estimates
- Vary meal types (breakfast, lunch, dinner, snack)
- Do NOT wrap the JSON in markdown code fences

Respond with ONLY a valid JSON array (no markdown, no explanation):
[
  {
    "title": "Recipe Name",
    "meal_type": "breakfast|lunch|dinner|snack",
    "prep_time": 15,
    "cook_time": 20,
    "servings": 2,
    "difficulty": "easy|medium|hard",
    "description": "One sentence description",
    "uses": ["ingredient1", "ingredient2"],
    "missing": ["ingredient3"],
    "steps": ["Step 1", "Step 2"],
    "nutrition_per_serving": {
      "calories": 450,
      "protein_g": 35,
      "carbs_g": 40,
      "fat_g": 15,
      "fiber_g": 5
    },
    "tags": ["high-protein", "quick"]
  }
]`;
}

export function buildScanPrompt() {
  return `You are a kitchen inventory scanner. Analyze this fridge/pantry photo and identify all visible food items.

Rules:
- Be specific about quantities when visible (e.g., "3 eggs" not just "eggs")
- Use common unit names: pcs, g, kg, ml, L, cups, tbsp, tsp, bunch, head, loaf, bottle, can, box
- Categorize each item correctly
- If quantity is unclear, estimate conservatively
- Do NOT wrap the JSON in markdown code fences

Respond with ONLY a valid JSON array (no markdown, no explanation):
[
  {
    "name": "Item Name",
    "quantity": 2,
    "unit": "pcs",
    "category": "Dairy|Meat|Seafood|Vegetables|Fruits|Grains|Beverages|Condiments|Frozen|Snacks|Other"
  }
]`;
}

export function buildWeeklyPlanPrompt({ items, prefs, existingPlan }) {
  const dietary = prefs.dietary?.length ? prefs.dietary.join(', ') : 'none';
  const allergies = prefs.allergies?.length ? prefs.allergies.join(', ') : 'none';
  const householdSize = prefs.household_size || 2;

  const itemList = items
    .map(i => `- ${i.name}: ${i.quantity} ${i.unit}`)
    .join('\n');

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return `You are a meal planning expert. Create a complete 7-day meal plan using the available fridge inventory.

FRIDGE INVENTORY:
${itemList}

HOUSEHOLD: ${householdSize} people
DIETARY REQUIREMENTS: ${dietary}
ALLERGIES/INTOLERANCES: ${allergies}

Create one meal per day (dinner focus, but vary it). Be creative and realistic.
Do NOT wrap the JSON in markdown code fences.

Respond with ONLY a valid JSON object (no markdown, no explanation):
{
  "plan": [
    {
      "day_index": 0,
      "day_name": "Monday",
      "slot": "dinner",
      "title": "Recipe Name",
      "meal_type": "dinner",
      "prep_time": 15,
      "cook_time": 30,
      "servings": 2,
      "difficulty": "easy",
      "description": "Brief description",
      "uses": ["ingredient1"],
      "missing": ["ingredient2"],
      "steps": ["Step 1"],
      "nutrition_per_serving": {
        "calories": 500,
        "protein_g": 30,
        "carbs_g": 45,
        "fat_g": 18,
        "fiber_g": 6
      },
      "tags": ["balanced"]
    }
  ]
}`;
}
