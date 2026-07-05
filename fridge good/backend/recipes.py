import json
from datetime import datetime, date
from llm import chat, clean_json

RECIPE_PROMPT = """You are a creative, globally-aware chef assistant. Generate recipes based on available fridge ingredients.

Available ingredients:
{ingredients_list}

Expiring soon (within 3 days — PRIORITIZE THESE):
{expiring_list}

User profile:
- Dietary restrictions: {dietary_restrictions}
- Allergies (NEVER include these): {allergies}
- Cuisine preferences: {cuisine_preferences}
- Disliked ingredients (avoid): {disliked_ingredients}
- Serving size: {serving_size} people
- Past feedback: {feedback_notes}

Requirements:
- Suggest exactly 4 diverse recipes spanning different cuisines/meal types
- Strictly respect allergies — this is a health/safety issue
- Prioritize expiring ingredients to reduce food waste
- Scale ingredients for the serving size
- Be creative but ensure combinations actually taste good
- Include clear step-by-step instructions

Return ONLY valid JSON (no markdown, no extra text):
{{
  "recipes": [
    {{
      "title": "Recipe Name",
      "cuisine_type": "Japanese",
      "prep_time": "25 mins",
      "difficulty": "easy",
      "ingredients_used": ["ingredient 1", "ingredient 2"],
      "missing_ingredients": ["item needed but not in fridge"],
      "instructions": "1. Step one\\n2. Step two\\n3. Step three",
      "nutrition_notes": "~450 cal per serving. High protein, good source of vitamin C.",
      "allergens": ["gluten"],
      "score": 0.92,
      "why_suggested": "Uses expiring spinach and leftover chicken"
    }}
  ],
  "shopping_list": [
    {{"name": "olive oil", "category": "condiments", "quantity": "1 bottle"}}
  ],
  "expiry_alerts": ["Spinach expires tomorrow"],
  "waste_saved_note": "Using 3 expiring items prevents ~400g of food waste"
}}"""


def generate_recipes(ingredients: list, preferences: dict = None, feedback_notes: str = "") -> tuple[dict, str]:
    today = date.today()
    prefs = preferences or {}

    ingredients_list, expiring_list = [], []
    for ing in ingredients:
        qty = f"{ing.get('quantity', '')} {ing.get('unit', '')}".strip()
        ingredients_list.append(f"- {ing['name']}" + (f" ({qty})" if qty else ""))
        if ing.get("expiry_date"):
            try:
                exp = datetime.strptime(ing["expiry_date"], "%Y-%m-%d").date()
                days = (exp - today).days
                if days <= 3:
                    expiring_list.append(f"- {ing['name']}: {days} day(s) left")
            except ValueError:
                pass

    prompt = RECIPE_PROMPT.format(
        ingredients_list="\n".join(ingredients_list) or "No ingredients found",
        expiring_list="\n".join(expiring_list) or "None",
        dietary_restrictions=", ".join(prefs.get("dietary_restrictions", [])) or "None",
        allergies=", ".join(prefs.get("allergies", [])) or "None",
        cuisine_preferences=", ".join(prefs.get("cuisine_preferences", [])) or "No preference",
        disliked_ingredients=", ".join(prefs.get("disliked_ingredients", [])) or "None",
        serving_size=prefs.get("serving_size", 2),
        feedback_notes=feedback_notes or "No history yet",
    )

    text, provider = chat(
        messages=[{"role": "user", "content": prompt}],
        max_tokens=4096,
    )
    return json.loads(clean_json(text)), provider
