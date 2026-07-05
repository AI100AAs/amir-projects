import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH
  ? path.resolve(process.cwd(), process.env.DB_PATH)
  : path.join(__dirname, '..', 'fridge.db');

const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ────────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    quantity    REAL    NOT NULL DEFAULT 1,
    unit        TEXT    NOT NULL DEFAULT '',
    category    TEXT    NOT NULL DEFAULT 'Other',
    expiry_date TEXT,
    barcode     TEXT,
    notes       TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS shopping_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    quantity    TEXT    NOT NULL DEFAULT '1',
    unit        TEXT    NOT NULL DEFAULT '',
    category    TEXT    NOT NULL DEFAULT 'Other',
    checked     INTEGER NOT NULL DEFAULT 0,
    source      TEXT    NOT NULL DEFAULT 'manual',
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS meal_plan (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    day_index   INTEGER NOT NULL,
    slot        TEXT    NOT NULL DEFAULT 'dinner',
    recipe_json TEXT    NOT NULL,
    week_start  TEXT    NOT NULL DEFAULT (date('now', 'weekday 0', '-6 days')),
    UNIQUE(day_index, slot, week_start)
  );

  CREATE TABLE IF NOT EXISTS preferences (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ai_history (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    type        TEXT NOT NULL,
    prompt_hash TEXT NOT NULL,
    response    TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ── Seed sample data (only on first run) ─────────────────────────────────────

const count = db.prepare('SELECT COUNT(*) as n FROM items').get();
if (count.n === 0) {
  const today = new Date();
  const addDays = (d) => {
    const x = new Date(today);
    x.setDate(x.getDate() + d);
    return x.toISOString().split('T')[0];
  };

  const insert = db.prepare(`
    INSERT INTO items (name, quantity, unit, category, expiry_date, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const seed = db.transaction(() => {
    insert.run('Whole Milk', 1, 'L', 'Dairy', addDays(3), 'Organic');
    insert.run('Large Eggs', 8, 'pcs', 'Dairy', addDays(14), '');
    insert.run('Cheddar Cheese', 200, 'g', 'Dairy', addDays(10), 'Sharp');
    insert.run('Greek Yogurt', 500, 'g', 'Dairy', addDays(5), '');
    insert.run('Chicken Breast', 600, 'g', 'Meat', addDays(2), 'Boneless');
    insert.run('Ground Beef', 400, 'g', 'Meat', addDays(1), '');
    insert.run('Salmon Fillet', 300, 'g', 'Seafood', addDays(2), 'Atlantic');
    insert.run('Baby Spinach', 150, 'g', 'Vegetables', addDays(3), '');
    insert.run('Broccoli', 1, 'head', 'Vegetables', addDays(5), '');
    insert.run('Bell Peppers', 3, 'pcs', 'Vegetables', addDays(7), 'Mixed');
    insert.run('Cherry Tomatoes', 250, 'g', 'Vegetables', addDays(4), '');
    insert.run('Carrots', 5, 'pcs', 'Vegetables', addDays(14), '');
    insert.run('Garlic', 1, 'bulb', 'Vegetables', addDays(30), '');
    insert.run('Lemon', 3, 'pcs', 'Fruits', addDays(10), '');
    insert.run('Apples', 4, 'pcs', 'Fruits', addDays(12), 'Gala');
    insert.run('Cooked Rice', 2, 'cups', 'Grains', addDays(3), 'Leftover');
    insert.run('Whole Wheat Bread', 1, 'loaf', 'Grains', addDays(5), '');
    insert.run('Butter', 250, 'g', 'Dairy', addDays(30), 'Unsalted');
    insert.run('Orange Juice', 1, 'L', 'Beverages', addDays(7), 'Fresh-squeezed');
    insert.run('Sriracha', 1, 'bottle', 'Condiments', addDays(180), '');
  });
  seed();
}

// Seed default preferences
const prefCount = db.prepare('SELECT COUNT(*) as n FROM preferences').get();
if (prefCount.n === 0) {
  const setPref = db.prepare('INSERT OR IGNORE INTO preferences (key, value) VALUES (?, ?)');
  setPref.run('dietary', JSON.stringify([]));
  setPref.run('allergies', JSON.stringify([]));
  setPref.run('household_size', '2');
  setPref.run('theme', 'dark');
  setPref.run('expiry_warning_days', '3');
}

export default db;
