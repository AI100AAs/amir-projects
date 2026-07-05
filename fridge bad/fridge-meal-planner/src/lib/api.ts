import type { FridgeItem, ShoppingItem, MealPlanEntry, Preferences, Recipe } from '../types';

const BASE = '/api';

async function request<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Items ─────────────────────────────────────────────────────────────────────

export const getItems = (params?: { category?: string; search?: string; sort?: string }) => {
  const filtered: Record<string, string> = {};
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') filtered[k] = v;
    }
  }
  const qs = new URLSearchParams(filtered).toString();
  return request<FridgeItem[]>(`/items${qs ? '?' + qs : ''}`);
};

export const createItem = (data: Partial<FridgeItem>) =>
  request<FridgeItem>('/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const updateItem = (id: number, data: Partial<FridgeItem>) =>
  request<FridgeItem>(`/items/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const adjustQuantity = (id: number, delta: number) =>
  request<FridgeItem>(`/items/${id}/quantity`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ delta }),
  });

export const deleteItem = (id: number) =>
  request<{ ok: boolean }>(`/items/${id}`, { method: 'DELETE' });

export const clearAllItems = () =>
  request<{ ok: boolean }>('/items', { method: 'DELETE' });

// ── Shopping ──────────────────────────────────────────────────────────────────

export const getShoppingItems = () => request<ShoppingItem[]>('/shopping');

export const addShoppingItems = (items: Partial<ShoppingItem>[]) =>
  request<ShoppingItem[]>('/shopping', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(items),
  });

export const toggleShoppingItem = (id: number, checked: boolean) =>
  request<ShoppingItem>(`/shopping/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ checked }),
  });

export const deleteShoppingItem = (id: number) =>
  request<{ ok: boolean }>(`/shopping/${id}`, { method: 'DELETE' });

export const clearCheckedItems = () =>
  request<{ ok: boolean }>('/shopping/checked/all', { method: 'DELETE' });

// ── Meal Plan ─────────────────────────────────────────────────────────────────

export const getMealPlan = () => request<MealPlanEntry[]>('/plan');

export const saveMealPlanEntry = (dayIndex: number, slot: string, recipe: Recipe) =>
  request<{ ok: boolean }>(`/plan/${dayIndex}/${slot}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipe }),
  });

export const removeMealPlanEntry = (dayIndex: number, slot: string) =>
  request<{ ok: boolean }>(`/plan/${dayIndex}/${slot}`, { method: 'DELETE' });

export const clearMealPlan = () =>
  request<{ ok: boolean }>('/plan', { method: 'DELETE' });

export const generateWeeklyPlan = () =>
  request<{ ok: boolean; plan: (Recipe & { day_index: number; slot: string })[] }>('/plan/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

// ── Preferences ───────────────────────────────────────────────────────────────

export const getPrefs = () => request<Preferences>('/prefs');

export const savePrefs = (prefs: Partial<Preferences>) =>
  request<{ ok: boolean }>('/prefs', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prefs),
  });

// ── Health ────────────────────────────────────────────────────────────────────

export const getHealth = () =>
  request<{ ok: boolean; model: string; models: string[] }>('/health');

// ── AI: Photo Scan ────────────────────────────────────────────────────────────

export const scanPhoto = (image: string, mimeType: string) =>
  request<{ items: Partial<FridgeItem>[] }>('/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image, mimeType }),
  });

// ── AI: Meal Suggestions (streaming) ─────────────────────────────────────────

export async function streamMeals(
  prioritiseExpiring: boolean,
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (e: Error) => void,
) {
  try {
    const res = await fetch(BASE + '/meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prioritiseExpiring }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop()!;
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') { onDone(); return; }
        try {
          const { token } = JSON.parse(data);
          if (token) onToken(token);
        } catch { /* skip */ }
      }
    }
    onDone();
  } catch (e) {
    onError(e as Error);
  }
}
