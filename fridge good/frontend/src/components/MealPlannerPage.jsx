import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import api from "../api";
import Modal from "./ui/Modal";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_ICONS = { breakfast: "🌅", lunch: "☀️", dinner: "🌙", snack: "🍎" };

function getWeekDates(offset = 0) {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function MealPlannerPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [plan, setPlan] = useState({});
  const [recipes, setRecipes] = useState([]);
  const [adding, setAdding] = useState(null); // { date, meal_type }
  const [form, setForm] = useState({ recipe_id: "", custom_meal: "" });

  const dates = getWeekDates(weekOffset);
  const startDate = dates[0];
  const endDate = dates[6];

  const load = async () => {
    const { data } = await api.get("/api/meal-plan", { params: { start: startDate, end: endDate } });
    const map = {};
    data.forEach(entry => {
      if (!map[entry.date]) map[entry.date] = {};
      map[entry.date][entry.meal_type] = entry;
    });
    setPlan(map);
  };

  const loadRecipes = async () => {
    const { data } = await api.get("/api/recipes");
    setRecipes(data);
  };

  useEffect(() => { load(); loadRecipes(); }, [weekOffset]);

  const handleAdd = async () => {
    if (!adding) return;
    const payload = {
      date: adding.date,
      meal_type: adding.meal_type,
      recipe_id: form.recipe_id ? parseInt(form.recipe_id) : null,
      recipe_title: form.recipe_id ? recipes.find(r => r.id === parseInt(form.recipe_id))?.title || "" : "",
      custom_meal: form.custom_meal,
    };
    await api.post("/api/meal-plan", payload);
    toast.success("Meal planned!");
    setAdding(null);
    setForm({ recipe_id: "", custom_meal: "" });
    load();
  };

  const handleRemove = async (entry) => {
    await api.delete(`/api/meal-plan/${entry.id}`);
    toast.success("Removed");
    load();
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Meal Planner</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date(startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} –{" "}
            {new Date(endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setWeekOffset(w => w - 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm hover:bg-slate-50 transition">← Prev</button>
          <button onClick={() => setWeekOffset(0)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm hover:bg-slate-50 transition text-green-600 font-medium">Today</button>
          <button onClick={() => setWeekOffset(w => w + 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm hover:bg-slate-50 transition">Next →</button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-slate-100">
          {dates.map((date, i) => {
            const isToday = date === today;
            return (
              <div key={date} className={`py-3 text-center border-r border-slate-50 last:border-r-0 ${isToday ? "bg-green-50" : ""}`}>
                <div className="text-xs text-slate-400 font-medium">{DAY_LABELS[i]}</div>
                <div className={`text-sm font-bold mt-0.5 ${isToday ? "text-green-600" : "text-slate-700"}`}>
                  {new Date(date).getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Meal rows */}
        {MEAL_TYPES.map((mealType) => (
          <div key={mealType} className="grid grid-cols-7 border-b border-slate-50 last:border-b-0 min-h-16">
            {dates.map((date, di) => {
              const entry = plan[date]?.[mealType];
              const isToday = date === today;
              return (
                <div key={date} className={`p-1.5 border-r border-slate-50 last:border-r-0 ${isToday ? "bg-green-50/30" : ""} ${di === 0 ? "relative" : ""}`}>
                  {di === 0 && (
                    <div className="absolute -left-12 top-1/2 -translate-y-1/2 text-xs text-slate-400 w-10 text-right hidden md:block">
                      {MEAL_ICONS[mealType]}
                    </div>
                  )}
                  {entry ? (
                    <div className="bg-green-100 rounded-lg p-1.5 text-xs group relative cursor-default h-full min-h-10">
                      <p className="font-medium text-green-800 leading-tight line-clamp-2">
                        {entry.recipe_title || entry.custom_meal}
                      </p>
                      <button
                        onClick={() => handleRemove(entry)}
                        className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 text-green-600 hover:text-red-500 transition text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setAdding({ date, meal_type: mealType }); setForm({ recipe_id: "", custom_meal: "" }); }}
                      className="w-full h-full min-h-10 flex items-center justify-center text-slate-200 hover:text-green-400 hover:bg-green-50 rounded-lg transition text-lg"
                    >
                      +
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-slate-500">
        {MEAL_TYPES.map(m => (
          <span key={m}>{MEAL_ICONS[m]} {m}</span>
        ))}
      </div>

      {/* Add meal modal */}
      <Modal open={!!adding} onClose={() => setAdding(null)} title={`Plan ${adding?.meal_type} — ${adding?.date}`}>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">From your recipes</label>
            <select
              value={form.recipe_id}
              onChange={e => setForm({ ...form, recipe_id: e.target.value, custom_meal: "" })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-green-400 focus:outline-none bg-white"
            >
              <option value="">— Select a recipe —</option>
              {recipes.map(r => (
                <option key={r.id} value={r.id}>{r.title}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-xs text-slate-400">or</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Custom meal name</label>
            <input
              value={form.custom_meal}
              onChange={e => setForm({ ...form, custom_meal: e.target.value, recipe_id: "" })}
              placeholder="e.g. Leftovers, Takeout, Avocado toast..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAdd}
              disabled={!form.recipe_id && !form.custom_meal.trim()}
              className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold transition"
            >
              Save
            </button>
            <button onClick={() => setAdding(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium transition">
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
