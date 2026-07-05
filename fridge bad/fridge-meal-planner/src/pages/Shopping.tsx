import { useState, useEffect } from 'react';
import {
  Plus, Trash2, X, Download,
  CheckSquare, Square,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getShoppingItems, addShoppingItems, toggleShoppingItem,
  deleteShoppingItem, clearCheckedItems,
} from '../lib/api';
import { CATEGORIES, CATEGORY_ICONS, type ShoppingItem, type Category } from '../types';

export default function Shopping() {
  const [items, setItems]     = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty]   = useState('1');
  const [newUnit, setNewUnit] = useState('');
  const [newCat, setNewCat]   = useState<Category>('Other');

  const load = async () => {
    try { setItems(await getShoppingItems()); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const added = await addShoppingItems([{ name: newName, quantity: newQty, unit: newUnit, category: newCat, source: 'manual' }]);
      setItems(prev => [...added, ...prev]);
      setNewName(''); setNewQty('1'); setNewUnit('');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleToggle = async (item: ShoppingItem) => {
    try {
      const updated = await toggleShoppingItem(item.id, !item.checked);
      setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteShoppingItem(id);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e: any) { toast.error(e.message); }
  };

  const handleClearChecked = async () => {
    const count = items.filter(i => i.checked).length;
    if (!count) return;
    try {
      await clearCheckedItems();
      setItems(prev => prev.filter(i => !i.checked));
      toast.success(`${count} checked item${count !== 1 ? 's' : ''} cleared`);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleExport = () => {
    const unchecked = items.filter(i => !i.checked);
    if (!unchecked.length) return toast.error('Nothing to export');
    const text = unchecked
      .map(i => `- ${i.name}${i.quantity !== '1' || i.unit ? `: ${i.quantity}${i.unit ? ' ' + i.unit : ''}` : ''}`)
      .join('\n');
    const blob = new Blob([`Shopping List\n${new Date().toLocaleDateString()}\n\n${text}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'shopping-list.txt'; a.click();
    URL.revokeObjectURL(url);
    toast.success('Shopping list exported');
  };

  const unchecked = items.filter(i => !i.checked);
  const checked   = items.filter(i =>  i.checked);

  // Group unchecked by category
  const grouped: Record<string, ShoppingItem[]> = {};
  for (const item of unchecked) {
    (grouped[item.category] ||= []).push(item);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shopping List</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {unchecked.length} item{unchecked.length !== 1 ? 's' : ''} to buy
            {checked.length > 0 && ` · ${checked.length} checked`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700
              text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" /> Export
          </button>
          {checked.length > 0 && (
            <button
              onClick={handleClearChecked}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 dark:border-red-900
                text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" /> Clear checked
            </button>
          )}
        </div>
      </div>

      {/* Add item form */}
      <form onSubmit={handleAdd} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Add item manually</p>
        <div className="flex flex-wrap gap-2">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Item name…"
            required
            className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700
              bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm
              focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
          <input
            value={newQty}
            onChange={e => setNewQty(e.target.value)}
            placeholder="Qty"
            className="w-20 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700
              bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm
              focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <input
            value={newUnit}
            onChange={e => setNewUnit(e.target.value)}
            placeholder="Unit"
            className="w-20 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700
              bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm
              focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <select
            value={newCat}
            onChange={e => setNewCat(e.target.value as Category)}
            className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700
              bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm
              focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600
              text-white font-medium text-sm transition-colors shadow-lg shadow-brand-500/20"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </form>

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 rounded-2xl shimmer bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-6xl mb-4">🛒</span>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">Shopping list is empty</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Items added from recipe suggestions appear here automatically
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Grouped unchecked */}
          {Object.entries(grouped).map(([cat, catItems]) => (
            <div key={cat}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 flex items-center gap-1.5">
                {CATEGORY_ICONS[cat as Category]} {cat}
              </h3>
              <div className="space-y-1">
                {catItems.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-gray-900
                      border border-gray-200 dark:border-gray-800 group fade-in"
                  >
                    <button
                      onClick={() => handleToggle(item)}
                      className="shrink-0 text-gray-400 hover:text-brand-500 transition-colors"
                    >
                      <Square className="w-4.5 h-4.5" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</span>
                      {(item.quantity !== '1' || item.unit) && (
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                          {item.quantity}{item.unit ? ' ' + item.unit : ''}
                        </span>
                      )}
                      {item.source === 'recipe' && (
                        <span className="ml-2 text-xs text-purple-500 dark:text-purple-400">from recipe</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center
                        rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Checked items */}
          {checked.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                Checked ({checked.length})
              </h3>
              <div className="space-y-1">
                {checked.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900/50
                      border border-gray-100 dark:border-gray-800 group"
                  >
                    <button onClick={() => handleToggle(item)} className="shrink-0 text-brand-500">
                      <CheckSquare className="w-4.5 h-4.5" />
                    </button>
                    <span className="flex-1 text-sm text-gray-400 dark:text-gray-600 line-through">{item.name}</span>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center
                        rounded-lg text-gray-400 hover:text-red-500 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
