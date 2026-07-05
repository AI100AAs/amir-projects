import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import api from "../api";

const DIETARY = ["Vegetarian", "Vegan", "Pescatarian", "Halal", "Kosher", "Keto", "Paleo", "Low-carb", "Gluten-free", "Dairy-free"];
const ALLERGENS = ["Gluten", "Dairy", "Eggs", "Nuts", "Peanuts", "Soy", "Fish", "Shellfish", "Sesame"];
const CUISINES = ["Italian", "Mexican", "Japanese", "Chinese", "Indian", "Thai", "Mediterranean", "French", "Korean", "American", "Middle Eastern", "Greek"];

function TagSelect({ label, options, selected, onChange }) {
  const toggle = (opt) => {
    if (selected.includes(opt)) onChange(selected.filter(x => x !== opt));
    else onChange([...selected, opt]);
  };
  return (
    <div>
      <label className="text-sm font-semibold text-slate-700 block mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition border ${
              selected.includes(opt)
                ? "bg-green-500 text-white border-green-500"
                : "bg-white text-slate-600 border-slate-200 hover:border-green-300 hover:bg-green-50"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [prefs, setPrefs] = useState({
    dietary_restrictions: [],
    allergies: [],
    cuisine_preferences: [],
    disliked_ingredients: [],
    serving_size: 2,
  });
  const [dislikedInput, setDislikedInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get("/api/preferences").then(({ data }) => {
      setPrefs(data);
      setLoaded(true);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    await api.put("/api/preferences", prefs);
    toast.success("Preferences saved! They'll apply to your next recipe generation.");
    setSaving(false);
  };

  const addDisliked = () => {
    const val = dislikedInput.trim();
    if (val && !prefs.disliked_ingredients.includes(val)) {
      setPrefs(p => ({ ...p, disliked_ingredients: [...p.disliked_ingredients, val] }));
    }
    setDislikedInput("");
  };

  const removeDisliked = (item) => {
    setPrefs(p => ({ ...p, disliked_ingredients: p.disliked_ingredients.filter(x => x !== item) }));
  };

  if (!loaded) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Preferences</h1>
        <p className="text-sm text-slate-500 mt-1">Personalize recipe generation to match your diet and tastes</p>
      </div>

      {/* Serving size */}
      <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
        <label className="text-sm font-semibold text-slate-700 block mb-3">Serving Size</label>
        <div className="flex items-center gap-3">
          <button onClick={() => setPrefs(p => ({ ...p, serving_size: Math.max(1, p.serving_size - 1) }))}
            className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition text-lg font-bold">
            −
          </button>
          <span className="text-xl font-bold text-slate-800 w-8 text-center">{prefs.serving_size}</span>
          <button onClick={() => setPrefs(p => ({ ...p, serving_size: Math.min(12, p.serving_size + 1) }))}
            className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition text-lg font-bold">
            +
          </button>
          <span className="text-sm text-slate-500 ml-1">people</span>
        </div>
      </div>

      {/* Dietary restrictions */}
      <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm space-y-5">
        <TagSelect
          label="Dietary Restrictions"
          options={DIETARY}
          selected={prefs.dietary_restrictions}
          onChange={v => setPrefs(p => ({ ...p, dietary_restrictions: v }))}
        />

        <div className="border-t border-slate-50 pt-5">
          <TagSelect
            label="⚠️ Allergies (strictly excluded from recipes)"
            options={ALLERGENS}
            selected={prefs.allergies}
            onChange={v => setPrefs(p => ({ ...p, allergies: v }))}
          />
        </div>

        <div className="border-t border-slate-50 pt-5">
          <TagSelect
            label="Preferred Cuisines"
            options={CUISINES}
            selected={prefs.cuisine_preferences}
            onChange={v => setPrefs(p => ({ ...p, cuisine_preferences: v }))}
          />
        </div>
      </div>

      {/* Disliked ingredients */}
      <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
        <label className="text-sm font-semibold text-slate-700 block mb-3">Disliked Ingredients</label>
        <p className="text-xs text-slate-400 mb-3">AI will avoid these in recipes (not as strict as allergies)</p>
        <div className="flex gap-2 mb-3">
          <input
            value={dislikedInput}
            onChange={e => setDislikedInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addDisliked()}
            placeholder="e.g. cilantro, liver, anchovies..."
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
          />
          <button onClick={addDisliked} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium transition">
            + Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {prefs.disliked_ingredients.map(item => (
            <span key={item} className="flex items-center gap-1.5 bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-sm">
              {item}
              <button onClick={() => removeDisliked(item)} className="text-slate-400 hover:text-red-500 transition text-xs font-bold">×</button>
            </span>
          ))}
          {prefs.disliked_ingredients.length === 0 && (
            <span className="text-sm text-slate-400">None added</span>
          )}
        </div>
      </div>

      {/* About allergies note */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800">
        <strong>⚠️ Allergy notice:</strong> This app uses AI which can make mistakes. Always verify recipes yourself if you have serious food allergies. Do not rely solely on this app for allergy-related decisions.
      </div>

      {/* Save button */}
      <button
        onClick={save}
        disabled={saving}
        className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white py-3 rounded-xl text-sm font-bold transition shadow-sm"
      >
        {saving ? "Saving..." : "Save Preferences"}
      </button>
    </div>
  );
}
