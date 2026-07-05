import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import api from "../api";
import Modal from "./ui/Modal";
import { SkeletonCard } from "./ui/Skeleton";

const CATEGORIES = ["produce","dairy","meat","seafood","grains","condiments","beverages","leftovers","other"];
const CAT_EMOJI = { produce:"🥦",dairy:"🧀",meat:"🥩",seafood:"🐟",grains:"🌾",condiments:"🫙",beverages:"🧃",leftovers:"🍱",other:"📦" };
const CAT_COLORS = { produce:"bg-green-50 border-green-100",dairy:"bg-blue-50 border-blue-100",meat:"bg-red-50 border-red-100",seafood:"bg-cyan-50 border-cyan-100",grains:"bg-amber-50 border-amber-100",condiments:"bg-purple-50 border-purple-100",beverages:"bg-teal-50 border-teal-100",leftovers:"bg-orange-50 border-orange-100",other:"bg-slate-50 border-slate-100" };

const EMPTY_FORM = { name:"", category:"produce", quantity:"", unit:"", expiry_date:"" };

export default function IngredientsPage({ onUpdate }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [editItem, setEditItem] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [confirmClear, setConfirmClear] = useState(false);

  const load = async () => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (catFilter) params.category = catFilter;
    const { data } = await api.get("/api/ingredients", { params });
    setItems(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [search, catFilter]);

  const grouped = items.reduce((acc, i) => {
    if (!acc[i.category]) acc[i.category] = [];
    acc[i.category].push(i);
    return acc;
  }, {});

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    await api.post("/api/ingredients", form);
    toast.success(`Added ${form.name}`);
    setAddOpen(false);
    setForm(EMPTY_FORM);
    load(); onUpdate();
  };

  const handleSaveEdit = async () => {
    await api.patch(`/api/ingredients/${editItem.id}`, editItem);
    toast.success("Updated");
    setEditItem(null);
    load(); onUpdate();
  };

  const handleDelete = async (id, name) => {
    await api.delete(`/api/ingredients/${id}`);
    toast.success(`Removed ${name}`);
    load(); onUpdate();
  };

  const handleClearAll = async () => {
    await api.delete("/api/ingredients");
    toast.success("Fridge cleared");
    setConfirmClear(false);
    load(); onUpdate();
  };

  const expiryBadge = (exp) => {
    if (!exp) return null;
    const days = Math.floor((new Date(exp) - new Date()) / 86400000);
    if (days < 0) return <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">Expired</span>;
    if (days === 0) return <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-medium">Today!</span>;
    if (days <= 3) return <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-medium">{days}d left</span>;
    return <span className="text-[10px] text-slate-400">{exp}</span>;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Ingredients</h1>
          <p className="text-sm text-slate-500 mt-0.5">{items.length} item{items.length !== 1 ? "s" : ""} in your fridge</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setForm(EMPTY_FORM); setAddOpen(true); }}
            className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition"
          >
            + Add Item
          </button>
          {items.length > 0 && (
            <button
              onClick={() => setConfirmClear(true)}
              className="bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 px-3 py-2 rounded-lg text-sm font-medium transition"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex gap-2 flex-wrap">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search ingredients..."
          className="flex-1 min-w-40 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
        />
        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-green-400 focus:outline-none bg-white"
        >
          <option value="">All categories</option>
          {CATEGORIES.map(c => (
            <option key={c} value={c}>{CAT_EMOJI[c]} {c}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-5xl mb-3">🧊</div>
          <p className="font-medium">No ingredients found</p>
          <p className="text-sm mt-1">Scan your fridge or add items manually</p>
        </div>
      ) : (
        Object.entries(grouped).sort().map(([cat, catItems]) => (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                {CAT_EMOJI[cat]} {cat}
              </h3>
              <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{catItems.length}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
              {catItems.map((ing) => (
                <div key={ing.id} className={`${CAT_COLORS[cat] || CAT_COLORS.other} border rounded-xl p-3 group`}>
                  <div className="flex items-start justify-between gap-1">
                    <span className="font-semibold text-slate-800 text-sm leading-tight flex-1">{ing.name}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => setEditItem({ ...ing })} className="text-slate-400 hover:text-slate-600 text-sm">✏️</button>
                      <button onClick={() => handleDelete(ing.id, ing.name)} className="text-slate-400 hover:text-red-500 text-sm">🗑️</button>
                    </div>
                  </div>
                  {(ing.quantity || ing.unit) && (
                    <p className="text-xs text-slate-500 mt-1">{ing.quantity} {ing.unit}</p>
                  )}
                  <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                    {ing.source === "manual" && (
                      <span className="text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full">manual</span>
                    )}
                    {expiryBadge(ing.expiry_date)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Add Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Ingredient">
        <div className="space-y-3">
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Ingredient name *" autoFocus
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-green-400 focus:outline-none" />
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-green-400 focus:outline-none bg-white">
            {CATEGORIES.map(c => <option key={c} value={c}>{CAT_EMOJI[c]} {c}</option>)}
          </select>
          <div className="flex gap-2">
            <input value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })}
              placeholder="Quantity" className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-green-400 focus:outline-none" />
            <input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
              placeholder="Unit" className="w-20 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-green-400 focus:outline-none" />
          </div>
          <input value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })}
            placeholder="Expiry date (YYYY-MM-DD)" type="date"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-green-400 focus:outline-none" />
          <div className="flex gap-2 pt-1">
            <button onClick={handleAdd} className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg text-sm font-semibold transition">
              Add Ingredient
            </button>
            <button onClick={() => setAddOpen(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium transition">
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="Edit Ingredient">
        {editItem && (
          <div className="space-y-3">
            <input value={editItem.name} onChange={e => setEditItem({ ...editItem, name: e.target.value })}
              placeholder="Name" autoFocus
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-green-400 focus:outline-none" />
            <select value={editItem.category} onChange={e => setEditItem({ ...editItem, category: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-green-400 focus:outline-none bg-white">
              {CATEGORIES.map(c => <option key={c} value={c}>{CAT_EMOJI[c]} {c}</option>)}
            </select>
            <div className="flex gap-2">
              <input value={editItem.quantity} onChange={e => setEditItem({ ...editItem, quantity: e.target.value })}
                placeholder="Quantity" className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-green-400 focus:outline-none" />
              <input value={editItem.unit} onChange={e => setEditItem({ ...editItem, unit: e.target.value })}
                placeholder="Unit" className="w-20 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-green-400 focus:outline-none" />
            </div>
            <input value={editItem.expiry_date} onChange={e => setEditItem({ ...editItem, expiry_date: e.target.value })}
              type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-green-400 focus:outline-none" />
            <div className="flex gap-2 pt-1">
              <button onClick={handleSaveEdit} className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg text-sm font-semibold transition">
                Save
              </button>
              <button onClick={() => setEditItem(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium transition">
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm clear */}
      <Modal open={confirmClear} onClose={() => setConfirmClear(false)} title="Clear All Ingredients?">
        <p className="text-slate-600 text-sm mb-4">This will remove all {items.length} ingredients from your fridge inventory. This cannot be undone.</p>
        <div className="flex gap-2">
          <button onClick={handleClearAll} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-sm font-semibold transition">
            Yes, Clear All
          </button>
          <button onClick={() => setConfirmClear(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium transition">
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
}
