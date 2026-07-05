import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, SlidersHorizontal, Trash2, Pencil, Minus,
  AlertTriangle, Zap, Camera,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getItems, createItem, updateItem, deleteItem, adjustQuantity, clearAllItems,
} from '../lib/api';
import {
  enrichItem, formatQuantity, cn,
} from '../lib/utils';
import {
  CATEGORIES, CATEGORY_ICONS, QUICK_ADD_PRESETS,
  type FridgeItem, type Category,
} from '../types';
import ExpiryBadge from '../components/ExpiryBadge';
import Modal from '../components/Modal';
import ItemForm from '../components/ItemForm';
import PhotoScan from './PhotoScan';

type SortKey = 'created_at' | 'expiry' | 'name';

export default function Inventory() {
  const [items, setItems]         = useState<FridgeItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [category, setCategory]   = useState<string>('All');
  const [sort, setSort]           = useState<SortKey>('created_at');
  const [showAdd, setShowAdd]     = useState(false);
  const [editing, setEditing]     = useState<FridgeItem | null>(null);
  const [showQuick, setShowQuick] = useState(false);
  const [showScan, setShowScan]   = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getItems({ category: category === 'All' ? undefined : category, search, sort });
      setItems(data.map(enrichItem));
    } catch (e: any) {
      toast.error('Failed to load inventory: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [category, search, sort]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (data: Partial<FridgeItem>) => {
    try {
      const item = await createItem(data);
      setItems(prev => [enrichItem(item), ...prev]);
      setShowAdd(false);
      toast.success(`${item.name} added to fridge`);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleEdit = async (data: Partial<FridgeItem>) => {
    if (!editing) return;
    try {
      const item = await updateItem(editing.id, data);
      setItems(prev => prev.map(i => i.id === item.id ? enrichItem(item) : i));
      setEditing(null);
      toast.success(`${item.name} updated`);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async (item: FridgeItem) => {
    if (!confirm(`Remove ${item.name} from your fridge?`)) return;
    try {
      await deleteItem(item.id);
      setItems(prev => prev.filter(i => i.id !== item.id));
      toast.success(`${item.name} removed`);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleAdjust = async (item: FridgeItem, delta: number) => {
    try {
      const updated = await adjustQuantity(item.id, delta);
      setItems(prev => prev.map(i => i.id === updated.id ? enrichItem(updated) : i));
    } catch (e: any) { toast.error(e.message); }
  };

  const handleQuickAdd = async (preset: Partial<FridgeItem>) => {
    try {
      const item = await createItem(preset);
      setItems(prev => [enrichItem(item), ...prev]);
      toast.success(`${item.name} added`);
    } catch (e: any) { toast.error(e.message); }
  };

  // Stats
  const expiring = items.filter(i => (i.daysUntilExpiry ?? 999) <= 3 && (i.daysUntilExpiry ?? 999) >= 0);
  const expired  = items.filter(i => (i.daysUntilExpiry ?? 1) < 0);
  const total    = items.length;

  // Category breakdown
  const catCounts: Record<string, number> = {};
  for (const i of items) catCounts[i.category] = (catCounts[i.category] || 0) + 1;

  const handleClearAll = async () => {
    if (!confirm('Remove all items from your fridge? This cannot be undone.')) return;
    try {
      await clearAllItems();
      setItems([]);
      toast.success('All items cleared');
    } catch (e: any) { toast.error(e.message); }
  };

  if (showScan) {
    return <PhotoScan onBack={() => setShowScan(false)} onItemsSaved={load} />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fridge Inventory</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{total} item{total !== 1 ? 's' : ''} tracked</p>
        </div>
        <div className="flex gap-2">
          {total > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 dark:border-red-900
                text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" /> Clear all
            </button>
          )}
          <button
            onClick={() => setShowScan(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700
              text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
          >
            <Camera className="w-4 h-4" /> Scan fridge
          </button>
          <button
            onClick={() => setShowQuick(s => !s)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700
              text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
          >
            <Zap className="w-4 h-4 text-yellow-500" /> Quick add
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-500 hover:bg-brand-600
              text-white font-medium text-sm transition-colors shadow-lg shadow-brand-500/20"
          >
            <Plus className="w-4 h-4" /> Add item
          </button>
        </div>
      </div>

      {/* Alert banners */}
      {expired.length > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 fade-in">
          <Trash2 className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400">
            <strong>{expired.length}</strong> item{expired.length !== 1 ? 's have' : ' has'} expired: {expired.map(i => i.name).join(', ')}
          </p>
        </div>
      )}
      {expiring.length > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900 fade-in">
          <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
          <p className="text-sm text-orange-700 dark:text-orange-400">
            <strong>{expiring.length}</strong> item{expiring.length !== 1 ? 's are' : ' is'} expiring soon: {expiring.map(i => i.name).join(', ')}
          </p>
        </div>
      )}

      {/* Quick add presets */}
      {showQuick && (
        <div className="rounded-2xl border border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950/30 p-4 fade-in">
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-3 flex items-center gap-1.5">
            <Zap className="w-4 h-4" /> Quick-add common items
          </p>
          <div className="flex flex-wrap gap-2">
            {QUICK_ADD_PRESETS.map(p => (
              <button
                key={p.name}
                onClick={() => handleQuickAdd(p)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm
                  bg-white dark:bg-gray-800 border border-yellow-300 dark:border-yellow-800
                  text-gray-700 dark:text-gray-300 hover:border-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-950/50
                  transition-all"
              >
                {CATEGORY_ICONS[p.category as Category]}
                {p.name}
                <span className="text-xs text-gray-400">{p.quantity}{p.unit}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(catCounts).slice(0, 4).map(([cat, count]) => (
          <div key={cat} className="rounded-xl p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center gap-3">
            <span className="text-2xl">{CATEGORY_ICONS[cat as Category] || '📦'}</span>
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{count}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{cat}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search items…"
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700
              bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm
              focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['All', ...CATEGORIES].map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                category === cat
                  ? 'bg-brand-500 text-white'
                  : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-brand-500',
              )}
            >
              {cat !== 'All' ? CATEGORY_ICONS[cat as Category] + ' ' : ''}{cat}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-gray-400" />
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortKey)}
            className="text-sm border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2
              bg-white dark:bg-gray-800 text-gray-900 dark:text-white
              focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="created_at">Newest first</option>
            <option value="expiry">Expiry date</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
      </div>

      {/* Items list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl shimmer bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-6xl mb-4">🥶</span>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">Your fridge is empty</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Add items manually or scan a photo to get started</p>
          <button
            onClick={() => setShowScan(true)}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600
              text-white font-medium text-sm transition-colors shadow-lg shadow-brand-500/20"
          >
            <Camera className="w-4 h-4" /> Scan fridge photo
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-gray-900
                border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700
                transition-all group fade-in"
            >
              {/* Category icon */}
              <span className="text-2xl w-9 text-center shrink-0">
                {CATEGORY_ICONS[item.category as Category] || '📦'}
              </span>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900 dark:text-white">{item.name}</span>
                  <ExpiryBadge days={item.daysUntilExpiry} />
                  {item.notes && (
                    <span className="text-xs text-gray-400 italic truncate">{item.notes}</span>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {formatQuantity(item.quantity, item.unit)} · {item.category}
                  {item.barcode && <span className="ml-2 text-xs text-gray-400">#{item.barcode}</span>}
                </p>
              </div>

              {/* Quantity controls */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleAdjust(item, -1)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg
                    text-gray-400 hover:text-gray-900 dark:hover:text-white
                    hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-10 text-center text-sm font-medium text-gray-900 dark:text-white">
                  {item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(1)}
                </span>
                <button
                  onClick={() => handleAdjust(item, 1)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg
                    text-gray-400 hover:text-gray-900 dark:hover:text-white
                    hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={() => setEditing(item)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400
                    hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-950/30 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(item)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400
                    hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showAdd && (
        <Modal title="Add Item" onClose={() => setShowAdd(false)}>
          <ItemForm onSave={handleAdd} onCancel={() => setShowAdd(false)} submitLabel="Add to fridge" />
        </Modal>
      )}
      {editing && (
        <Modal title="Edit Item" onClose={() => setEditing(null)}>
          <ItemForm initial={editing} onSave={handleEdit} onCancel={() => setEditing(null)} />
        </Modal>
      )}
    </div>
  );
}