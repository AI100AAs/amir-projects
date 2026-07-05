import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import api from "../api";

const CAT_EMOJI = { produce:"🥦",dairy:"🧀",meat:"🥩",seafood:"🐟",grains:"🌾",condiments:"🫙",beverages:"🧃",leftovers:"🍱",other:"📦" };
const CATEGORIES = ["produce","dairy","meat","seafood","grains","condiments","beverages","other"];

export default function ShoppingPage({ onUpdate }) {
  const [items, setItems] = useState([]);
  const [input, setInput] = useState("");
  const [cat, setCat] = useState("other");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await api.get("/api/shopping");
    setItems(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!input.trim()) return;
    await api.post("/api/shopping", { name: input.trim(), category: cat, source: "manual" });
    setInput("");
    load(); onUpdate();
  };

  const handleToggle = async (id) => {
    await api.patch(`/api/shopping/${id}/check`);
    load(); onUpdate();
  };

  const handleDelete = async (id) => {
    await api.delete(`/api/shopping/${id}`);
    load(); onUpdate();
  };

  const handleClearChecked = async () => {
    await api.delete("/api/shopping/checked/clear");
    toast.success("Cleared checked items");
    load(); onUpdate();
  };

  const pending = items.filter(i => !i.checked);
  const done = items.filter(i => i.checked);

  const grouped = pending.reduce((acc, i) => {
    if (!acc[i.category]) acc[i.category] = [];
    acc[i.category].push(i);
    return acc;
  }, {});

  const SOURCE_BADGE = {
    ai: "bg-green-100 text-green-600",
    recipe: "bg-blue-100 text-blue-600",
    manual: "bg-slate-100 text-slate-500",
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Shopping List</h1>
          <p className="text-sm text-slate-500 mt-0.5">{pending.length} items to buy · {done.length} done</p>
        </div>
        {done.length > 0 && (
          <button onClick={handleClearChecked} className="text-sm text-slate-500 hover:text-red-500 transition px-3 py-1.5 rounded-lg hover:bg-red-50">
            Clear checked ({done.length})
          </button>
        )}
      </div>

      {/* Progress bar */}
      {items.length > 0 && (
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Progress</span>
            <span>{done.length}/{items.length}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-400 rounded-full transition-all duration-500"
              style={{ width: `${items.length ? (done.length / items.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Add form */}
      <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAdd()}
          placeholder="Add item..."
          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
        />
        <select
          value={cat}
          onChange={e => setCat(e.target.value)}
          className="border border-slate-200 rounded-lg px-2 py-2 text-sm focus:border-green-400 focus:outline-none bg-white"
        >
          {CATEGORIES.map(c => <option key={c} value={c}>{CAT_EMOJI[c]} {c}</option>)}
        </select>
        <button onClick={handleAdd} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
          + Add
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-400">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-5xl mb-3">🛒</div>
          <p className="font-medium">Your shopping list is empty</p>
          <p className="text-sm mt-1">Generate recipes to get AI-suggested items, or add manually above</p>
        </div>
      ) : (
        <>
          {/* Pending grouped by category */}
          {Object.entries(grouped).map(([category, catItems]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide text-xs">
                  {CAT_EMOJI[category]} {category}
                </span>
                <span className="text-xs text-slate-300">{catItems.length}</span>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden mb-3">
                {catItems.map((item, i) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 px-4 py-3 group hover:bg-slate-50 transition ${i < catItems.length - 1 ? "border-b border-slate-50" : ""}`}
                  >
                    <button
                      onClick={() => handleToggle(item.id)}
                      className="w-5 h-5 rounded flex-shrink-0 border-2 border-slate-200 hover:border-green-400 transition flex items-center justify-center"
                    />
                    <span className="flex-1 text-sm text-slate-700">{item.name}</span>
                    {item.quantity && <span className="text-xs text-slate-400">{item.quantity}</span>}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${SOURCE_BADGE[item.source] || SOURCE_BADGE.manual}`}>
                      {item.source}
                    </span>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition text-sm"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Checked items */}
          {done.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">✓ Done ({done.length})</p>
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden opacity-60">
                {done.map((item, i) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 px-4 py-3 group ${i < done.length - 1 ? "border-b border-slate-50" : ""}`}
                  >
                    <button
                      onClick={() => handleToggle(item.id)}
                      className="w-5 h-5 rounded flex-shrink-0 bg-green-400 flex items-center justify-center text-white text-xs"
                    >
                      ✓
                    </button>
                    <span className="flex-1 text-sm text-slate-400 line-through">{item.name}</span>
                    <button onClick={() => handleDelete(item.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition text-sm">×</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
