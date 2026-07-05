import { describe, it, expect } from 'vitest';
import { daysUntilExpiry, expiryLabel, expiryColor, tryParseRecipes, formatQuantity, cn } from '../lib/utils';

describe('daysUntilExpiry', () => {
  it('returns undefined for null date', () => {
    expect(daysUntilExpiry(null)).toBeUndefined();
  });

  it('returns 0 or 1 for today (timezone-safe)', () => {
    const today = new Date().toISOString().split('T')[0];
    const result = daysUntilExpiry(today);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('returns positive for future date', () => {
    const future = new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0];
    const result = daysUntilExpiry(future);
    expect(result).toBeGreaterThanOrEqual(4);
    expect(result).toBeLessThanOrEqual(6);
  });

  it('returns negative for past date', () => {
    const past = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0];
    const result = daysUntilExpiry(past);
    expect(result).toBeGreaterThanOrEqual(-3);
    expect(result).toBeLessThanOrEqual(-1);
  });
});

describe('expiryLabel', () => {
  it('returns empty string for undefined', () => {
    expect(expiryLabel(undefined)).toBe('');
  });
  it('handles expired', () => {
    expect(expiryLabel(-1)).toBe('Expired');
  });
  it('handles today', () => {
    expect(expiryLabel(0)).toBe('Expires today');
  });
  it('handles tomorrow', () => {
    expect(expiryLabel(1)).toBe('Expires tomorrow');
  });
  it('handles N days', () => {
    expect(expiryLabel(5)).toBe('Expires in 5d');
  });
});

describe('expiryColor', () => {
  it('returns empty string for undefined', () => {
    expect(expiryColor(undefined)).toBe('');
  });
  it('returns red class for expired', () => {
    expect(expiryColor(-1)).toContain('red');
  });
  it('returns orange class for 2 days', () => {
    expect(expiryColor(2)).toContain('orange');
  });
  it('returns green class for far future', () => {
    expect(expiryColor(30)).toContain('green');
  });
});

describe('tryParseRecipes', () => {
  it('returns null for empty string', () => {
    expect(tryParseRecipes('')).toBeNull();
  });

  it('parses clean JSON array', () => {
    const json = JSON.stringify([{
      title: 'Test', meal_type: 'dinner', prep_time: 10, cook_time: 20,
      servings: 2, difficulty: 'easy', description: 'desc', uses: [], missing: [],
      steps: [], nutrition_per_serving: { calories: 400, protein_g: 20, carbs_g: 40, fat_g: 10, fiber_g: 5 },
      tags: [],
    }]);
    const result = tryParseRecipes(json);
    expect(result).not.toBeNull();
    expect(result![0].title).toBe('Test');
  });

  it('strips markdown fences', () => {
    const json = '```json\n[{"title":"Test","meal_type":"dinner","prep_time":5,"cook_time":5,"servings":1,"difficulty":"easy","description":"d","uses":[],"missing":[],"steps":[],"nutrition_per_serving":{"calories":100,"protein_g":5,"carbs_g":10,"fat_g":3,"fiber_g":1},"tags":[]}]\n```';
    const result = tryParseRecipes(json);
    expect(result).not.toBeNull();
    expect(result![0].title).toBe('Test');
  });

  it('returns null for incomplete JSON', () => {
    expect(tryParseRecipes('[{"title": "Incomplete"')).toBeNull();
  });
});

describe('formatQuantity', () => {
  it('formats whole numbers without decimal', () => {
    expect(formatQuantity(2, 'pcs')).toBe('2 pcs');
  });
  it('formats decimals', () => {
    expect(formatQuantity(1.5, 'L')).toBe('1.5 L');
  });
  it('handles empty unit', () => {
    expect(formatQuantity(3, '')).toBe('3');
  });
});

describe('cn', () => {
  it('joins classes', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });
  it('filters falsy values', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b');
  });
});
