import { useState } from 'react';
import { CATEGORIES, CATEGORY_ICONS, type FridgeItem, type Category } from '../types';
import { cn } from '../lib/utils';

interface Props {
  initial?: Partial<FridgeItem>;
  onSave: (data: Partial<FridgeItem>) => void;
  onCancel: () => void;
  submitLabel?: string;
}

export default function ItemForm({ initial, onSave, onCancel, submitLabel = 'Save' }: Props) {
  const [form, setForm] = useState<Partial<FridgeItem>>({
    name: '',
    quantity: 1,
    unit: '',
    category: 'Other',
    expiry_date: '',
    barcode: '',
    notes: '',
    ...initial,
  });

  const set = (k: keyof FridgeItem, v: string | number) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim()) return;
    onSave({
      ...form,
      expiry_date: form.expiry_date || null,
      barcode: form.barcode || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Item Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="e.g. Whole Milk"
          required
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700
            bg-white dark:bg-gray-800 text-gray-900 dark:text-white
            focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
        />
      </div>

      {/* Quantity + Unit */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
          <input
            type="number"
            value={form.quantity}
            min={0}
            step={0.1}
            onChange={e => set('quantity', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700
              bg-white dark:bg-gray-800 text-gray-900 dark:text-white
              focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit</label>
          <input
            type="text"
            value={form.unit}
            placeholder="g, pcs, L…"
            onChange={e => set('unit', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700
              bg-white dark:bg-gray-800 text-gray-900 dark:text-white
              focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => set('category', cat)}
              className={cn(
                'flex flex-col items-center gap-0.5 p-2 rounded-lg border text-xs font-medium transition-all',
                form.category === cat
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600',
              )}
            >
              <span className="text-base">{CATEGORY_ICONS[cat as Category]}</span>
              <span>{cat}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Expiry Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Expiry Date <span className="text-gray-400">(optional)</span>
        </label>
        <input
          type="date"
          value={form.expiry_date ?? ''}
          onChange={e => set('expiry_date', e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700
            bg-white dark:bg-gray-800 text-gray-900 dark:text-white
            focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
        />
      </div>

      {/* Barcode + Notes */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Barcode <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={form.barcode ?? ''}
            onChange={e => set('barcode', e.target.value)}
            placeholder="012345678"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700
              bg-white dark:bg-gray-800 text-gray-900 dark:text-white
              focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Notes <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={form.notes ?? ''}
            onChange={e => set('notes', e.target.value)}
            placeholder="Organic, leftover…"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700
              bg-white dark:bg-gray-800 text-gray-900 dark:text-white
              focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700
            text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800
            transition-colors text-sm font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600
            text-white font-medium text-sm transition-colors shadow-lg shadow-brand-500/20"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
