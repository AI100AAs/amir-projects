import type { FridgeItem } from '../types';

export function daysUntilExpiry(dateStr: string | null): number | undefined {
  if (!dateStr) return undefined;
  const expiry = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
}

export function expiryLabel(days: number | undefined): string {
  if (days === undefined) return '';
  if (days < 0) return 'Expired';
  if (days === 0) return 'Expires today';
  if (days === 1) return 'Expires tomorrow';
  return `Expires in ${days}d`;
}

export function expiryColor(days: number | undefined): string {
  if (days === undefined) return '';
  if (days < 0) return 'text-red-400 bg-red-950/60';
  if (days <= 1) return 'text-red-400 bg-red-950/60 pulse-warning';
  if (days <= 3) return 'text-orange-400 bg-orange-950/60';
  if (days <= 7) return 'text-yellow-400 bg-yellow-950/60';
  return 'text-green-400 bg-green-950/60';
}

export function enrichItem(item: FridgeItem): FridgeItem {
  return { ...item, daysUntilExpiry: daysUntilExpiry(item.expiry_date) };
}

/** Attempt to parse JSON from streamed AI text, returning null if incomplete */
export function tryParseRecipes(text: string): import('../types').Recipe[] | null {
  try {
    // Strip fences
    let cleaned = text.replace(/^```(?:json)?\s*/im, '').replace(/\s*```\s*$/m, '').trim();
    // Remove <think> blocks
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    // Find complete array
    const start = cleaned.indexOf('[');
    if (start === -1) return null;
    const end = cleaned.lastIndexOf(']');
    if (end === -1) return null;
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

export function formatQuantity(qty: number, unit: string): string {
  return `${qty % 1 === 0 ? qty : qty.toFixed(1)} ${unit}`.trim();
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
