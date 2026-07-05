import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import db from './db.js';
import { chatComplete, chatStream, visionComplete, extractJSON, getHealth } from './llm.js';
import { buildMealPrompt, buildScanPrompt, buildWeeklyPlanPrompt } from './prompts.js';

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '20mb' })); // large for base64 images

// ── Health ────────────────────────────────────────────────────────────────────

app.get('/api/health', async (req, res) => {
  try {
    const health = await getHealth();
    res.json(health);
  } catch (e) {
    res.status(503).json({ ok: false, error: e.message });
  }
});

// ── Fridge Items ──────────────────────────────────────────────────────────────

app.get('/api/items', (req, res) => {
  const { category, search, sort } = req.query;
  let sql = 'SELECT * FROM items WHERE 1=1';
  const params = [];
  if (category && category !== 'All') { sql += ' AND category = ?'; params.push(category); }
  if (search) { sql += ' AND name LIKE ?'; params.push(`%${search}%`); }
  sql += sort === 'expiry' ? ' ORDER BY expiry_date ASC NULLS LAST'
       : sort === 'name'   ? ' ORDER BY name ASC'
       : ' ORDER BY created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

app.post('/api/items', (req, res) => {
  const { name, quantity, unit, category, expiry_date, barcode, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const stmt = db.prepare(`
    INSERT INTO items (name, quantity, unit, category, expiry_date, barcode, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(name, quantity ?? 1, unit ?? '', category ?? 'Other', expiry_date ?? null, barcode ?? null, notes ?? '');
  res.json(db.prepare('SELECT * FROM items WHERE id = ?').get(info.lastInsertRowid));
});

app.put('/api/items/:id', (req, res) => {
  const { name, quantity, unit, category, expiry_date, barcode, notes } = req.body;
  const stmt = db.prepare(`
    UPDATE items SET name=?, quantity=?, unit=?, category=?, expiry_date=?, barcode=?, notes=?, updated_at=datetime('now')
    WHERE id=?
  `);
  stmt.run(name, quantity, unit, category, expiry_date ?? null, barcode ?? null, notes ?? '', req.params.id);
  res.json(db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id));
});

app.patch('/api/items/:id/quantity', (req, res) => {
  const { delta } = req.body;
  const item = db.prepare('SELECT * FROM items WHERE id=?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'not found' });
  const newQty = Math.max(0, item.quantity + (delta ?? 0));
  db.prepare("UPDATE items SET quantity=?, updated_at=datetime('now') WHERE id=?").run(newQty, req.params.id);
  res.json(db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id));
});

app.delete('/api/items/:id', (req, res) => {
  db.prepare('DELETE FROM items WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.delete('/api/items', (req, res) => {
  db.prepare('DELETE FROM items').run();
  res.json({ ok: true });
});

// ── Shopping List ─────────────────────────────────────────────────────────────

app.get('/api/shopping', (req, res) => {
  res.json(db.prepare('SELECT * FROM shopping_items ORDER BY checked ASC, created_at DESC').all());
});

app.post('/api/shopping', (req, res) => {
  const items = Array.isArray(req.body) ? req.body : [req.body];
  const stmt = db.prepare(`
    INSERT INTO shopping_items (name, quantity, unit, category, source)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertMany = db.transaction((rows) => rows.map(i =>
    stmt.run(i.name, i.quantity ?? '1', i.unit ?? '', i.category ?? 'Other', i.source ?? 'manual')
  ));
  const infos = insertMany(items);
  const ids = infos.map(i => i.lastInsertRowid);
  res.json(db.prepare(`SELECT * FROM shopping_items WHERE id IN (${ids.map(() => '?').join(',')})`).all(...ids));
});

app.patch('/api/shopping/:id', (req, res) => {
  const { checked } = req.body;
  db.prepare('UPDATE shopping_items SET checked=? WHERE id=?').run(checked ? 1 : 0, req.params.id);
  res.json(db.prepare('SELECT * FROM shopping_items WHERE id=?').get(req.params.id));
});

app.delete('/api/shopping/:id', (req, res) => {
  db.prepare('DELETE FROM shopping_items WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.delete('/api/shopping/checked/all', (req, res) => {
  db.prepare('DELETE FROM shopping_items WHERE checked=1').run();
  res.json({ ok: true });
});

// ── Meal Plan ─────────────────────────────────────────────────────────────────

app.get('/api/plan', (req, res) => {
  const week = req.query.week || new Date().toISOString().split('T')[0];
  res.json(db.prepare('SELECT * FROM meal_plan WHERE week_start <= ? ORDER BY day_index ASC').all(week));
});

app.put('/api/plan/:dayIndex/:slot', (req, res) => {
  const { recipe, week_start } = req.body;
  const week = week_start || new Date().toISOString().split('T')[0];
  db.prepare(`
    INSERT INTO meal_plan (day_index, slot, recipe_json, week_start)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(day_index, slot, week_start) DO UPDATE SET recipe_json=excluded.recipe_json
  `).run(parseInt(req.params.dayIndex), req.params.slot, JSON.stringify(recipe), week);
  res.json({ ok: true });
});

app.delete('/api/plan/:dayIndex/:slot', (req, res) => {
  db.prepare('DELETE FROM meal_plan WHERE day_index=? AND slot=?').run(parseInt(req.params.dayIndex), req.params.slot);
  res.json({ ok: true });
});

app.delete('/api/plan', (req, res) => {
  db.prepare('DELETE FROM meal_plan').run();
  res.json({ ok: true });
});

// ── Preferences ───────────────────────────────────────────────────────────────

app.get('/api/prefs', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM preferences').all();
  const prefs = {};
  for (const r of rows) {
    try { prefs[r.key] = JSON.parse(r.value); } catch { prefs[r.key] = r.value; }
  }
  res.json(prefs);
});

app.put('/api/prefs', (req, res) => {
  const stmt = db.prepare('INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)');
  const upsert = db.transaction((obj) => {
    for (const [k, v] of Object.entries(obj)) {
      stmt.run(k, typeof v === 'string' ? v : JSON.stringify(v));
    }
  });
  upsert(req.body);
  res.json({ ok: true });
});

// ── AI: Photo Scan ────────────────────────────────────────────────────────────

app.post('/api/scan', async (req, res) => {
  const { image, mimeType } = req.body;
  if (!image) return res.status(400).json({ error: 'image (base64) is required' });
  try {
    const raw = await visionComplete(image, mimeType || 'image/jpeg', buildScanPrompt());
    const items = extractJSON(raw);
    res.json({ items });
  } catch (e) {
    console.error('[scan]', e.message);
    res.status(500).json({ error: e.message, raw: e.raw });
  }
});

// ── AI: Meal Suggestions (streaming) ─────────────────────────────────────────

app.post('/api/meals', async (req, res) => {
  const { prioritiseExpiring = false } = req.body;

  const rawItems = db.prepare('SELECT * FROM items').all();
  const today = new Date();

  const items = rawItems.map(i => {
    const days = i.expiry_date
      ? Math.ceil((new Date(i.expiry_date) - today) / 86400000)
      : undefined;
    return { ...i, daysUntilExpiry: days };
  });

  const prefsRows = db.prepare('SELECT key, value FROM preferences').all();
  const prefs = {};
  for (const r of prefsRows) {
    try { prefs[r.key] = JSON.parse(r.value); } catch { prefs[r.key] = r.value; }
  }

  const prompt = buildMealPrompt({ items, prefs, prioritiseExpiring });
  const messages = [{ role: 'user', content: prompt }];

  try {
    await chatStream(messages, res, { temperature: 0.8 });
  } catch (e) {
    console.error('[meals]', e.message);
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
});

// ── AI: Weekly Meal Plan ──────────────────────────────────────────────────────

app.post('/api/plan/generate', async (req, res) => {
  const items = db.prepare('SELECT * FROM items').all();
  const prefsRows = db.prepare('SELECT key, value FROM preferences').all();
  const prefs = {};
  for (const r of prefsRows) {
    try { prefs[r.key] = JSON.parse(r.value); } catch { prefs[r.key] = r.value; }
  }

  const prompt = buildWeeklyPlanPrompt({ items, prefs, existingPlan: [] });
  const messages = [{ role: 'user', content: prompt }];

  try {
    const raw = await chatComplete(messages, { temperature: 0.75, max_tokens: 6000 });
    const parsed = extractJSON(raw);
    const plan = parsed.plan ?? parsed;

    // Save to DB
    const stmt = db.prepare(`
      INSERT INTO meal_plan (day_index, slot, recipe_json, week_start)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(day_index, slot, week_start) DO UPDATE SET recipe_json=excluded.recipe_json
    `);
    const week = new Date().toISOString().split('T')[0];
    const savePlan = db.transaction(() => plan.forEach(p =>
      stmt.run(p.day_index, p.slot || 'dinner', JSON.stringify(p), week)
    ));
    savePlan();

    res.json({ ok: true, plan });
  } catch (e) {
    console.error('[plan/generate]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n  Fridge API server running at http://localhost:${PORT}`);
  console.log(`  LM Studio: ${process.env.LMSTUDIO_URL || 'http://localhost:1234/v1'}`);
  console.log(`  Model: ${process.env.MODEL_ID || 'google/gemma-4-e4b'}\n`);
});
