import base64
import json
from llm import chat, clean_json

DETECT_PROMPT = """Analyze this refrigerator/pantry photo carefully. Identify ALL visible food items and ingredients.

For each item, extract:
- name: specific ingredient name (e.g. "cherry tomatoes" not just "tomatoes")
- category: one of [produce, dairy, meat, seafood, grains, condiments, beverages, leftovers, other]
- quantity: estimated amount (e.g. "half", "3", "a few")
- unit: measurement unit if visible (e.g. "L", "kg", "oz", or "" if unclear)
- expiry_date: ISO date (YYYY-MM-DD) if visible on packaging, else ""
- confidence: 0.0-1.0 how confident you are this item is present

Return ONLY a valid JSON object like this:
{
  "items": [
    {
      "name": "cheddar cheese",
      "category": "dairy",
      "quantity": "1 block",
      "unit": "",
      "expiry_date": "2026-06-15",
      "confidence": 0.95
    }
  ],
  "notes": "any important observations about the fridge state"
}"""


def detect_ingredients(image_bytes: bytes, media_type: str = "image/jpeg") -> tuple[dict, str]:
    b64 = base64.standard_b64encode(image_bytes).decode("utf-8")
    text, provider = chat(
        messages=[{"role": "user", "content": DETECT_PROMPT}],
        max_tokens=4096,
        images=[(b64, media_type)],
    )
    return json.loads(clean_json(text)), provider
