from pathlib import Path
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

_DB_PATH = Path(__file__).parent.parent / "fridge.db"
DATABASE_URL = f"sqlite:///{_DB_PATH}"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Ingredient(Base):
    __tablename__ = "ingredients"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    category = Column(String, default="other")
    quantity = Column(String, default="")
    unit = Column(String, default="")
    expiry_date = Column(String, default="")
    confidence = Column(Float, default=1.0)
    added_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    source = Column(String, default="scan")  # scan | manual


class Recipe(Base):
    __tablename__ = "recipes"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    ingredients_used = Column(Text)
    missing_ingredients = Column(Text, default="[]")
    instructions = Column(Text)
    nutrition_notes = Column(Text, default="")
    cuisine_type = Column(String, default="")
    prep_time = Column(String, default="")
    difficulty = Column(String, default="medium")
    allergens = Column(Text, default="[]")
    score = Column(Float, default=0.0)
    why_suggested = Column(Text, default="")
    generated_at = Column(DateTime, default=datetime.utcnow)
    user_rating = Column(Integer, default=0)
    is_favorited = Column(Boolean, default=False)


class MealPlan(Base):
    __tablename__ = "meal_plans"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(String, index=True)          # YYYY-MM-DD
    meal_type = Column(String)                  # breakfast | lunch | dinner | snack
    recipe_id = Column(Integer, nullable=True)
    recipe_title = Column(String, default="")
    custom_meal = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)


class ShoppingItem(Base):
    __tablename__ = "shopping_items"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    category = Column(String, default="other")
    quantity = Column(String, default="")
    checked = Column(Boolean, default=False)
    source = Column(String, default="manual")  # manual | recipe | ai
    created_at = Column(DateTime, default=datetime.utcnow)


class UserPreferences(Base):
    __tablename__ = "user_preferences"
    id = Column(Integer, primary_key=True, default=1)
    dietary_restrictions = Column(Text, default="[]")  # JSON list
    allergies = Column(Text, default="[]")
    cuisine_preferences = Column(Text, default="[]")
    disliked_ingredients = Column(Text, default="[]")
    serving_size = Column(Integer, default=2)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ScanHistory(Base):
    __tablename__ = "scan_history"
    id = Column(Integer, primary_key=True, index=True)
    image_filename = Column(String)
    detected_items = Column(Text)
    item_count = Column(Integer, default=0)
    scanned_at = Column(DateTime, default=datetime.utcnow)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


Base.metadata.create_all(bind=engine)
