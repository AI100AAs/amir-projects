import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import api from "../api";
import Modal from "./ui/Modal";
import { SkeletonCard } from "./ui/Skeleton";

const DIFF = { easy: "bg-green-100 text-green-700", medium: "bg-amber-100 text-amber-700", hard: "bg-red-100 text-red-700" };

export default function RecipesPage({ onUpdate }) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selected, setSelected] = useState(null);
  const [favOnly, setFavOnly] = useState(false);
  const [ratings, setRatings] = useState({});
  const [favorites, setFavorites] = useState({});

  const load = async (fav = favOnly) => {
    setLoading(true);
    const { data } = await api.get("/api/recipes", { params: { favorites_only: fav } });
    setRecipes(data);
    const initRatings = {}, initFavs = {};
    data.forEach(r => { initRatings[r.id] = r.user_rating; initFavs[r.id] = r.is_favorited; });
    setRatings(initRatings);
    setFavorites(initFavs);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data } = await api.post("/api/recipes/generate", {});
      setRecipes(data.recipes);
      const initRatings = {}, initFavs = {};
      data.recipes.forEach(r => { initRatings[r.id] = 0; initFavs[r.id] = false; });
      setRatings(initRatings);
      setFavorites(initFavs);
      toast.success(`Generated ${data.recipes.length} recipes!`);
      if (data.expiry_alerts?.length > 0) {
        toast(`⚠️ ${data.expiry_alerts[0]}`, { duration: 6000, icon: "⚠️" });
      }
      if (data.waste_saved_note) {
        toast.success(data.waste_saved_note, { duration: 5000 });
      }
      onUpdate();
    } catch {
      // handled by interceptor
    } finally {
      setGenerating(false);
    }
  };

  const handleRate = async (id, r) => {
    setRatings(prev => ({ ...prev, [id]: r }));
    await api.post(`/api/recipes/${id}/rate`, { rating: r });
  };

  const handleFavorite = async (id) => {
    const { data } = await api.post(`/api/recipes/${id}/favorite`);
    setFavorites(prev => ({ ...prev, [id]: data.is_favorited }));
    toast(data.is_favorited ? "Added to favorites ❤️" : "Removed from favorites", { icon: data.is_favorited ? "❤️" : "🤍" });
    if (favOnly) load(true);
  };

  const handleAddToShoppingList = async (recipe) => {
    let added = 0;
    for (const item of recipe.missing_ingredients || []) {
      await api.post("/api/shopping", { name: item, source: "recipe" }).catch(() => {});
      added++;
    }
    toast.success(`Added ${added} items to shopping list`);
    onUpdate();
  };

  const toggleFavFilter = (v) => { setFavOnly(v); load(v); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Recipes</h1>
          <p className="text-sm text-slate-500 mt-0.5">AI-generated based on your fridge contents</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex rounded-lg overflow-hidden border border-slate-200 text-sm">
            <button onClick={() => toggleFavFilter(false)} className={`px-3 py-1.5 ${!favOnly ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-50"} transition`}>
              All
            </button>
            <button onClick={() => toggleFavFilter(true)} className={`px-3 py-1.5 ${favOnly ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-50"} transition`}>
              ❤️ Favorites
            </button>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition shadow-sm"
          >
            {generating ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating...</>
            ) : (
              "🍳 Generate Recipes"
            )}
          </button>
        </div>
      </div>

      {generating && (
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
          <div className="text-sm text-green-700 font-medium">AI is crafting recipes from your ingredients...</div>
          <div className="text-xs text-green-600 mt-1">Considering expiry dates, your preferences, and past ratings</div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-5xl mb-3">🍳</div>
          <p className="font-medium">{favOnly ? "No favorites yet" : "No recipes generated yet"}</p>
          <p className="text-sm mt-1">{favOnly ? "Rate recipes and star your favorites" : "Click 'Generate Recipes' to get started"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recipes.map((r) => (
            <div key={r.id} className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
              {/* Card header */}
              <div className="p-4 cursor-pointer" onClick={() => setSelected(selected?.id === r.id ? null : r)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <h3 className="font-bold text-slate-800">{r.title}</h3>
                      {favorites[r.id] && <span className="text-red-400 text-sm">❤️</span>}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {r.cuisine_type && <Badge color="purple">{r.cuisine_type}</Badge>}
                      {r.prep_time && <Badge color="blue">⏱ {r.prep_time}</Badge>}
                      {r.difficulty && <Badge color={r.difficulty}>{r.difficulty}</Badge>}
                      {r.allergens?.map(a => <Badge key={a} color="red">⚠️ {a}</Badge>)}
                    </div>
                    {r.why_suggested && (
                      <p className="text-xs text-green-600 mt-1.5">💡 {r.why_suggested}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className="text-sm font-semibold text-green-600">{Math.round(r.score * 100)}% match</div>
                    {/* Stars */}
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <button key={s} onClick={e => { e.stopPropagation(); handleRate(r.id, s); }}
                          className={`text-lg transition ${(ratings[r.id] || 0) >= s ? "text-amber-400" : "text-slate-200 hover:text-amber-300"}`}>
                          ★
                        </button>
                      ))}
                    </div>
                    <span className="text-xs text-slate-400">{selected?.id === r.id ? "▲ collapse" : "▼ expand"}</span>
                  </div>
                </div>
              </div>

              {/* Expanded */}
              {selected?.id === r.id && (
                <div className="border-t border-slate-100 p-4 space-y-4 fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Ingredients Used</h4>
                      <ul className="space-y-1">
                        {r.ingredients_used?.map((ing, i) => (
                          <li key={i} className="text-sm text-slate-600 flex items-center gap-1.5">
                            <span className="text-green-400">✓</span> {ing}
                          </li>
                        ))}
                      </ul>
                      {r.missing_ingredients?.length > 0 && (
                        <>
                          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-3 mb-2">You'll Also Need</h4>
                          <ul className="space-y-1">
                            {r.missing_ingredients.map((ing, i) => (
                              <li key={i} className="text-sm text-amber-600 flex items-center gap-1.5">
                                <span>🛒</span> {ing}
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                      {r.nutrition_notes && (
                        <div className="mt-3 bg-green-50 rounded-lg p-2.5 text-xs text-green-800">
                          🥗 {r.nutrition_notes}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Instructions</h4>
                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{r.instructions}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => handleFavorite(r.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${favorites[r.id] ? "bg-red-50 text-red-500 hover:bg-red-100" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                      {favorites[r.id] ? "❤️ Favorited" : "🤍 Favorite"}
                    </button>
                    {r.missing_ingredients?.length > 0 && (
                      <button onClick={() => handleAddToShoppingList(r)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition">
                        🛒 Add missing to list
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Badge({ children, color }) {
  const map = {
    purple: "bg-purple-50 text-purple-700",
    blue: "bg-blue-50 text-blue-700",
    easy: "bg-green-50 text-green-700",
    medium: "bg-amber-50 text-amber-700",
    hard: "bg-red-50 text-red-700",
    red: "bg-red-50 text-red-600",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[color] || "bg-slate-100 text-slate-600"}`}>
      {children}
    </span>
  );
}
