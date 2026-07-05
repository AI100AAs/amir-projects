import os
import json
import uuid
from pathlib import Path
from datetime import datetime, date, timedelta
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

from fastapi import FastAPI, File, UploadFile, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List

from database import (
    get_db, Ingredient, Recipe, MealPlan, ShoppingItem,
    UserPreferences, ScanHistory
)
from vision import detect_ingredients
from recipes import generate_recipes
from llm import get_config, set_provider, check_health, PROVIDERS

app = FastAPI(title="FridgeChef API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)


# ── Scan ──────────────────────────────────────────────────────────────────────

@app.post("/api/scan")
async def scan_image(file: UploadFile = File(...), db: Session = Depends(get_db)):
    ext = Path(file.filename or "photo.jpg").suffix.lower() or ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    contents = await file.read()
    (UPLOAD_DIR / filename).write_bytes(contents)

    media_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}
    result, provider_used = detect_ingredients(contents, media_map.get(ext, "image/jpeg"))

    added, merged = [], []
    existing = {i.name.lower(): i for i in db.query(Ingredient).filter(Ingredient.is_active == True).all()}

    for item in result.get("items", []):
        key = item["name"].lower()
        if key in existing:
            # Merge: update quantity/expiry if new info present
            ing = existing[key]
            if item.get("quantity"):
                ing.quantity = item["quantity"]
            if item.get("expiry_date"):
                ing.expiry_date = item["expiry_date"]
            merged.append(item["name"])
        else:
            ing = Ingredient(
                name=item["name"], category=item.get("category", "other"),
                quantity=item.get("quantity", ""), unit=item.get("unit", ""),
                expiry_date=item.get("expiry_date", ""),
                confidence=item.get("confidence", 1.0), source="scan",
            )
            db.add(ing)
            added.append(item)

    scan = ScanHistory(
        image_filename=filename,
        detected_items=json.dumps(result.get("items", [])),
        item_count=len(result.get("items", [])),
    )
    db.add(scan)
    db.commit()

    return {
        "detected": result.get("items", []),
        "added": len(added),
        "merged": len(merged),
        "notes": result.get("notes", ""),
        "scan_id": scan.id,
        "provider": provider_used,
    }


# ── Ingredients ───────────────────────────────────────────────────────────────

class IngredientCreate(BaseModel):
    name: str
    category: str = "other"
    quantity: str = ""
    unit: str = ""
    expiry_date: str = ""

class IngredientUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[str] = None
    unit: Optional[str] = None
    expiry_date: Optional[str] = None


@app.get("/api/ingredients")
def list_ingredients(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    q = db.query(Ingredient).filter(Ingredient.is_active == True)
    if search:
        q = q.filter(Ingredient.name.ilike(f"%{search}%"))
    if category:
        q = q.filter(Ingredient.category == category)
    return [_ing_dict(i) for i in q.order_by(Ingredient.added_at.desc()).all()]


@app.post("/api/ingredients")
def add_ingredient(body: IngredientCreate, db: Session = Depends(get_db)):
    ing = Ingredient(**body.model_dump(), source="manual")
    db.add(ing)
    db.commit()
    db.refresh(ing)
    return _ing_dict(ing)


@app.patch("/api/ingredients/{ing_id}")
def update_ingredient(ing_id: int, body: IngredientUpdate, db: Session = Depends(get_db)):
    ing = db.query(Ingredient).filter(Ingredient.id == ing_id).first()
    if not ing:
        raise HTTPException(404, "Not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(ing, k, v)
    db.commit()
    return _ing_dict(ing)


@app.delete("/api/ingredients/{ing_id}")
def delete_ingredient(ing_id: int, db: Session = Depends(get_db)):
    ing = db.query(Ingredient).filter(Ingredient.id == ing_id).first()
    if not ing:
        raise HTTPException(404, "Not found")
    ing.is_active = False
    db.commit()
    return {"ok": True}


@app.delete("/api/ingredients")
def clear_all_ingredients(db: Session = Depends(get_db)):
    db.query(Ingredient).filter(Ingredient.is_active == True).update({"is_active": False})
    db.commit()
    return {"ok": True}


# ── Recipes ───────────────────────────────────────────────────────────────────

class RecipeRequest(BaseModel):
    feedback_notes: Optional[str] = ""


@app.post("/api/recipes/generate")
def gen_recipes(body: RecipeRequest, db: Session = Depends(get_db)):
    ingredients = db.query(Ingredient).filter(Ingredient.is_active == True).all()
    if not ingredients:
        raise HTTPException(400, "No ingredients in fridge. Please scan or add items first.")

    prefs_row = db.query(UserPreferences).first()
    prefs = {}
    if prefs_row:
        prefs = {
            "dietary_restrictions": json.loads(prefs_row.dietary_restrictions or "[]"),
            "allergies": json.loads(prefs_row.allergies or "[]"),
            "cuisine_preferences": json.loads(prefs_row.cuisine_preferences or "[]"),
            "disliked_ingredients": json.loads(prefs_row.disliked_ingredients or "[]"),
            "serving_size": prefs_row.serving_size,
        }

    past = db.query(Recipe).filter(Recipe.user_rating > 0).all()
    feedback = body.feedback_notes or ""
    if past:
        liked = [r.title for r in past if r.user_rating >= 4]
        disliked = [r.title for r in past if r.user_rating <= 2]
        if liked:
            feedback += f" Liked: {', '.join(liked[:5])}."
        if disliked:
            feedback += f" Disliked: {', '.join(disliked[:5])}."

    result, provider_used = generate_recipes([_ing_dict(i) for i in ingredients], prefs, feedback)

    saved = []
    for r in result.get("recipes", []):
        rec = Recipe(
            title=r["title"],
            ingredients_used=json.dumps(r.get("ingredients_used", [])),
            missing_ingredients=json.dumps(r.get("missing_ingredients", [])),
            instructions=r.get("instructions", ""),
            nutrition_notes=r.get("nutrition_notes", ""),
            cuisine_type=r.get("cuisine_type", ""),
            prep_time=r.get("prep_time", ""),
            difficulty=r.get("difficulty", "medium"),
            allergens=json.dumps(r.get("allergens", [])),
            score=r.get("score", 0.0),
            why_suggested=r.get("why_suggested", ""),
        )
        db.add(rec)
        db.flush()
        saved.append({**r, "id": rec.id, "user_rating": 0, "is_favorited": False})

    # Sync AI-suggested shopping items
    for item in result.get("shopping_list", []):
        name = item["name"] if isinstance(item, dict) else item
        exists = db.query(ShoppingItem).filter(
            ShoppingItem.name.ilike(name), ShoppingItem.checked == False
        ).first()
        if not exists:
            si = ShoppingItem(
                name=name,
                category=item.get("category", "other") if isinstance(item, dict) else "other",
                quantity=item.get("quantity", "") if isinstance(item, dict) else "",
                source="ai",
            )
            db.add(si)

    db.commit()
    return {
        "recipes": saved,
        "expiry_alerts": result.get("expiry_alerts", []),
        "waste_saved_note": result.get("waste_saved_note", ""),
        "provider": provider_used,
    }


@app.get("/api/recipes")
def list_recipes(
    favorites_only: bool = Query(False),
    db: Session = Depends(get_db)
):
    q = db.query(Recipe)
    if favorites_only:
        q = q.filter(Recipe.is_favorited == True)
    recs = q.order_by(Recipe.generated_at.desc()).limit(50).all()
    return [_recipe_dict(r) for r in recs]


class RatingBody(BaseModel):
    rating: int


@app.post("/api/recipes/{rec_id}/rate")
def rate_recipe(rec_id: int, body: RatingBody, db: Session = Depends(get_db)):
    rec = db.query(Recipe).filter(Recipe.id == rec_id).first()
    if not rec:
        raise HTTPException(404, "Not found")
    rec.user_rating = max(1, min(5, body.rating))
    db.commit()
    return {"ok": True}


@app.post("/api/recipes/{rec_id}/favorite")
def toggle_favorite(rec_id: int, db: Session = Depends(get_db)):
    rec = db.query(Recipe).filter(Recipe.id == rec_id).first()
    if not rec:
        raise HTTPException(404, "Not found")
    rec.is_favorited = not rec.is_favorited
    db.commit()
    return {"is_favorited": rec.is_favorited}


# ── Meal Plan ─────────────────────────────────────────────────────────────────

class MealPlanEntry(BaseModel):
    date: str
    meal_type: str
    recipe_id: Optional[int] = None
    recipe_title: Optional[str] = ""
    custom_meal: Optional[str] = ""


@app.get("/api/meal-plan")
def get_meal_plan(
    start: Optional[str] = Query(None),
    end: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    q = db.query(MealPlan)
    if start:
        q = q.filter(MealPlan.date >= start)
    if end:
        q = q.filter(MealPlan.date <= end)
    return [_meal_dict(m) for m in q.order_by(MealPlan.date, MealPlan.meal_type).all()]


@app.post("/api/meal-plan")
def add_meal_plan(body: MealPlanEntry, db: Session = Depends(get_db)):
    # Prevent duplicate slot
    existing = db.query(MealPlan).filter(
        MealPlan.date == body.date, MealPlan.meal_type == body.meal_type
    ).first()
    if existing:
        for k, v in body.model_dump(exclude_none=True).items():
            setattr(existing, k, v)
        db.commit()
        return _meal_dict(existing)
    m = MealPlan(**body.model_dump())
    db.add(m)
    db.commit()
    db.refresh(m)
    return _meal_dict(m)


@app.delete("/api/meal-plan/{entry_id}")
def delete_meal_plan(entry_id: int, db: Session = Depends(get_db)):
    m = db.query(MealPlan).filter(MealPlan.id == entry_id).first()
    if not m:
        raise HTTPException(404, "Not found")
    db.delete(m)
    db.commit()
    return {"ok": True}


# ── Shopping List ─────────────────────────────────────────────────────────────

class ShoppingItemCreate(BaseModel):
    name: str
    category: str = "other"
    quantity: str = ""
    source: str = "manual"


@app.get("/api/shopping")
def list_shopping(db: Session = Depends(get_db)):
    items = db.query(ShoppingItem).order_by(ShoppingItem.checked, ShoppingItem.created_at.desc()).all()
    return [_shop_dict(i) for i in items]


@app.post("/api/shopping")
def add_shopping(body: ShoppingItemCreate, db: Session = Depends(get_db)):
    i = ShoppingItem(**body.model_dump())
    db.add(i)
    db.commit()
    db.refresh(i)
    return _shop_dict(i)


@app.patch("/api/shopping/{item_id}/check")
def toggle_check(item_id: int, db: Session = Depends(get_db)):
    i = db.query(ShoppingItem).filter(ShoppingItem.id == item_id).first()
    if not i:
        raise HTTPException(404, "Not found")
    i.checked = not i.checked
    db.commit()
    return _shop_dict(i)


@app.delete("/api/shopping/{item_id}")
def delete_shopping(item_id: int, db: Session = Depends(get_db)):
    i = db.query(ShoppingItem).filter(ShoppingItem.id == item_id).first()
    if not i:
        raise HTTPException(404, "Not found")
    db.delete(i)
    db.commit()
    return {"ok": True}


@app.delete("/api/shopping/checked/clear")
def clear_checked(db: Session = Depends(get_db)):
    db.query(ShoppingItem).filter(ShoppingItem.checked == True).delete()
    db.commit()
    return {"ok": True}


# ── Preferences ───────────────────────────────────────────────────────────────

class PrefsBody(BaseModel):
    dietary_restrictions: List[str] = []
    allergies: List[str] = []
    cuisine_preferences: List[str] = []
    disliked_ingredients: List[str] = []
    serving_size: int = 2


@app.get("/api/preferences")
def get_prefs(db: Session = Depends(get_db)):
    p = db.query(UserPreferences).first()
    if not p:
        return PrefsBody().model_dump()
    return {
        "dietary_restrictions": json.loads(p.dietary_restrictions or "[]"),
        "allergies": json.loads(p.allergies or "[]"),
        "cuisine_preferences": json.loads(p.cuisine_preferences or "[]"),
        "disliked_ingredients": json.loads(p.disliked_ingredients or "[]"),
        "serving_size": p.serving_size,
    }


@app.put("/api/preferences")
def save_prefs(body: PrefsBody, db: Session = Depends(get_db)):
    p = db.query(UserPreferences).first()
    if not p:
        p = UserPreferences()
        db.add(p)
    p.dietary_restrictions = json.dumps(body.dietary_restrictions)
    p.allergies = json.dumps(body.allergies)
    p.cuisine_preferences = json.dumps(body.cuisine_preferences)
    p.disliked_ingredients = json.dumps(body.disliked_ingredients)
    p.serving_size = body.serving_size
    db.commit()
    return {"ok": True}


# ── Expiry Alerts ─────────────────────────────────────────────────────────────

@app.get("/api/expiry-alerts")
def expiry_alerts(db: Session = Depends(get_db)):
    today = date.today()
    items = db.query(Ingredient).filter(Ingredient.is_active == True).all()
    alerts = []
    for i in items:
        if i.expiry_date:
            try:
                exp = datetime.strptime(i.expiry_date, "%Y-%m-%d").date()
                days = (exp - today).days
                if days <= 5:
                    alerts.append({
                        "id": i.id, "name": i.name,
                        "expiry_date": i.expiry_date,
                        "days_left": days,
                        "status": "expired" if days < 0 else "critical" if days <= 1 else "warning",
                    })
            except ValueError:
                pass
    return sorted(alerts, key=lambda x: x["days_left"])


# ── Stats ─────────────────────────────────────────────────────────────────────

@app.get("/api/stats")
def get_stats(db: Session = Depends(get_db)):
    today = date.today()
    total_ing = db.query(Ingredient).filter(Ingredient.is_active == True).count()
    total_scans = db.query(ScanHistory).count()
    total_recipes = db.query(Recipe).count()
    favorites = db.query(Recipe).filter(Recipe.is_favorited == True).count()

    avg_rating = 0.0
    rated = db.query(Recipe).filter(Recipe.user_rating > 0).all()
    if rated:
        avg_rating = sum(r.user_rating for r in rated) / len(rated)

    # Expiring items
    expiring_soon = 0
    expired = 0
    for i in db.query(Ingredient).filter(Ingredient.is_active == True).all():
        if i.expiry_date:
            try:
                exp = datetime.strptime(i.expiry_date, "%Y-%m-%d").date()
                days = (exp - today).days
                if days < 0:
                    expired += 1
                elif days <= 3:
                    expiring_soon += 1
            except ValueError:
                pass

    # Category breakdown
    cats = {}
    for i in db.query(Ingredient).filter(Ingredient.is_active == True).all():
        cats[i.category] = cats.get(i.category, 0) + 1

    # Recent activity (last 7 days)
    week_ago = datetime.utcnow() - timedelta(days=7)
    recent_scans = db.query(ScanHistory).filter(ScanHistory.scanned_at >= week_ago).count()
    recent_recipes = db.query(Recipe).filter(Recipe.generated_at >= week_ago).count()

    return {
        "total_ingredients": total_ing,
        "total_scans": total_scans,
        "total_recipes": total_recipes,
        "favorites": favorites,
        "avg_rating": round(avg_rating, 1),
        "expiring_soon": expiring_soon,
        "expired": expired,
        "category_breakdown": cats,
        "recent_scans": recent_scans,
        "recent_recipes": recent_recipes,
        "shopping_pending": db.query(ShoppingItem).filter(ShoppingItem.checked == False).count(),
    }


# ── Provider config ───────────────────────────────────────────────────────────

class ProviderBody(BaseModel):
    provider: str

@app.get("/api/provider")
def get_provider():
    cfg = get_config()
    current = cfg.get("provider", "openrouter")
    return {
        "current": current,
        "providers": {
            name: {
                "label": info["label"],
                "model": info["model"],
                "vision_model": info.get("vision_model"),
                "supports_vision": info["supports_vision"],
                "healthy": check_health(name),
            }
            for name, info in PROVIDERS.items()
        },
    }

@app.post("/api/provider")
def switch_provider(body: ProviderBody):
    set_provider(body.provider)
    return {"ok": True, "provider": body.provider}


# ── Scan History ──────────────────────────────────────────────────────────────

@app.get("/api/scan-history")
def scan_history(db: Session = Depends(get_db)):
    rows = db.query(ScanHistory).order_by(ScanHistory.scanned_at.desc()).limit(10).all()
    return [{"id": r.id, "item_count": r.item_count, "scanned_at": r.scanned_at.isoformat()} for r in rows]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _ing_dict(i: Ingredient) -> dict:
    return {
        "id": i.id, "name": i.name, "category": i.category,
        "quantity": i.quantity, "unit": i.unit,
        "expiry_date": i.expiry_date, "confidence": i.confidence,
        "source": i.source, "added_at": i.added_at.isoformat(),
    }


def _recipe_dict(r: Recipe) -> dict:
    return {
        "id": r.id, "title": r.title,
        "ingredients_used": json.loads(r.ingredients_used or "[]"),
        "missing_ingredients": json.loads(r.missing_ingredients or "[]"),
        "instructions": r.instructions,
        "nutrition_notes": r.nutrition_notes,
        "cuisine_type": r.cuisine_type,
        "prep_time": r.prep_time, "difficulty": r.difficulty,
        "allergens": json.loads(r.allergens or "[]"),
        "score": r.score, "why_suggested": r.why_suggested,
        "user_rating": r.user_rating, "is_favorited": r.is_favorited,
        "generated_at": r.generated_at.isoformat(),
    }


def _meal_dict(m: MealPlan) -> dict:
    return {
        "id": m.id, "date": m.date, "meal_type": m.meal_type,
        "recipe_id": m.recipe_id, "recipe_title": m.recipe_title,
        "custom_meal": m.custom_meal,
    }


def _shop_dict(i: ShoppingItem) -> dict:
    return {
        "id": i.id, "name": i.name, "category": i.category,
        "quantity": i.quantity, "checked": i.checked, "source": i.source,
        "created_at": i.created_at.isoformat(),
    }
