import { useState, useCallback } from 'react';
import { Upload, Check, X, RefreshCw, ArrowLeft, Camera, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { scanPhoto, createItem } from '../lib/api';
import { CATEGORIES, CATEGORY_ICONS, type FridgeItem, type Category } from '../types';
import { cn } from '../lib/utils';

interface ScannedItem extends Partial<FridgeItem> {
  selected: boolean;
}

interface Props {
  onBack: () => void;
  onItemsSaved?: () => void;
}

export default function PhotoScan({ onBack, onItemsSaved }: Props) {
  const [preview, setPreview]     = useState<string | null>(null);
  const [mimeType, setMimeType]   = useState('image/jpeg');
  const [scanning, setScanning]   = useState(false);
  const [scanned, setScanned]     = useState<ScannedItem[]>([]);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [dragOver, setDragOver]   = useState(false);

  const processFile = (file: File) => {
    setMimeType(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    setScanned([]);
    setError('');
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) processFile(file);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const runScan = async () => {
    if (!preview) return;
    setScanning(true);
    setError('');
    try {
      const base64 = preview.split(',')[1];
      const { items } = await scanPhoto(base64, mimeType);
      if (!items || items.length === 0) {
        setError('No items detected in the image. Try a clearer photo.');
      } else {
        setScanned(items.map(i => ({ ...i, selected: true })));
      }
    } catch (e: any) {
      setError('Scan failed: ' + (e.message || 'Unknown error'));
    } finally {
      setScanning(false);
    }
  };

  const toggleItem = (idx: number) =>
    setScanned(prev => prev.map((i, j) => j === idx ? { ...i, selected: !i.selected } : i));

  const updateItem = (idx: number, key: keyof ScannedItem, val: string | number) =>
    setScanned(prev => prev.map((i, j) => j === idx ? { ...i, [key]: val } : i));

  const saveSelected = async () => {
    const toAdd = scanned.filter(i => i.selected);
    if (!toAdd.length) return toast.error('Select at least one item');
    setSaving(true);
    let added = 0;
    let failed = 0;
    for (const item of toAdd) {
      try {
        await createItem(item);
        added++;
      } catch (e: any) {
        failed++;
        console.error('Failed to save scanned item:', item.name, e.message);
      }
    }
    setSaving(false);
    if (added > 0) {
      toast.success(`${added} item${added !== 1 ? 's' : ''} added to fridge`);
      onItemsSaved?.();
      onBack();
    } else {
      toast.error('Failed to save items. Please try adding them manually.');
    }
    if (failed > 0 && added > 0) {
      toast.error(`${failed} item${failed !== 1 ? 's' : ''} could not be saved`);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-300 dark:border-gray-700
            text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Photo Scan</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Upload a fridge photo to detect items automatically</p>
        </div>
      </div>

      {/* Upload zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        className={cn(
          'relative rounded-2xl border-2 border-dashed transition-all overflow-hidden',
          dragOver ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20' : 'border-gray-300 dark:border-gray-700',
          preview ? 'border-solid border-gray-200 dark:border-gray-800' : 'min-h-48 flex items-center justify-center',
        )}
      >
        {preview ? (
          <div className="relative">
            <img src={preview} alt="Fridge" className="w-full max-h-72 object-contain bg-black" />
            <button
              onClick={() => { setPreview(null); setScanned([]); }}
              className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full
                bg-black/60 text-white hover:bg-black/80 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <label className="cursor-pointer flex flex-col items-center gap-3 p-8 text-center">
            <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-brand-100 dark:bg-brand-950/50">
              <Camera className="w-7 h-7 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Drop a fridge photo here</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">or click to browse — JPEG, PNG, WEBP</p>
            </div>
            <input type="file" accept="image/*" onChange={handleFileInput} className="hidden" />
          </label>
        )}
      </div>

      {/* Scan button */}
      {preview && scanned.length === 0 && (
        <button
          onClick={runScan}
          disabled={scanning}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
            bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed
            text-white font-semibold transition-colors shadow-lg shadow-brand-500/20"
        >
          {scanning ? (
            <><RefreshCw className="w-4 h-4 animate-spin" /> Scanning with AI…</>
          ) : (
            <><Upload className="w-4 h-4" /> Scan photo</>
          )}
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Results */}
      {scanned.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Detected {scanned.length} item{scanned.length !== 1 ? 's' : ''}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setScanned(prev => prev.map(i => ({ ...i, selected: true })))}
                className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
              >Select all</button>
              <span className="text-gray-300 dark:text-gray-700">|</span>
              <button
                onClick={() => setScanned(prev => prev.map(i => ({ ...i, selected: false })))}
                className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
              >Deselect all</button>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Review and edit the detected items before adding them to your fridge.
          </p>

          <div className="space-y-2">
            {scanned.map((item, idx) => (
              <div
                key={idx}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border transition-all',
                  item.selected
                    ? 'border-brand-300 dark:border-brand-800 bg-brand-50 dark:bg-brand-950/20'
                    : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 opacity-50',
                )}
              >
                <button
                  onClick={() => toggleItem(idx)}
                  className={cn(
                    'shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                    item.selected ? 'border-brand-500 bg-brand-500' : 'border-gray-300 dark:border-gray-700',
                  )}
                >
                  {item.selected && <Check className="w-3 h-3 text-white" />}
                </button>

                <span className="text-xl shrink-0">
                  {CATEGORY_ICONS[item.category as Category] || '📦'}
                </span>

                <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <input
                    value={item.name || ''}
                    onChange={e => updateItem(idx, 'name', e.target.value)}
                    className="col-span-2 sm:col-span-1 px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-700
                      bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm
                      focus:outline-none focus:ring-1 focus:ring-brand-500"
                    placeholder="Name"
                  />
                  <input
                    type="number"
                    value={item.quantity || 1}
                    min={0}
                    step={0.1}
                    onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value))}
                    className="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-700
                      bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm
                      focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <input
                    value={item.unit || ''}
                    onChange={e => updateItem(idx, 'unit', e.target.value)}
                    className="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-700
                      bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm
                      focus:outline-none focus:ring-1 focus:ring-brand-500"
                    placeholder="Unit"
                  />
                  <select
                    value={item.category || 'Other'}
                    onChange={e => updateItem(idx, 'category', e.target.value)}
                    className="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-700
                      bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm
                      focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setScanned([]); runScan(); }}
              disabled={scanning}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700
                text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" /> Rescan
            </button>
            <button
              onClick={saveSelected}
              disabled={saving || !scanned.some(i => i.selected)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed
                text-white font-semibold text-sm transition-colors shadow-lg shadow-brand-500/20"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Add {scanned.filter(i => i.selected).length} selected to fridge
            </button>
          </div>
        </div>
      )}
    </div>
  );
}