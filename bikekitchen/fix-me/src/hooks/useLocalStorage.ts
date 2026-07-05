"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";

function subscribeToStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("local-storage-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("local-storage-change", callback);
  };
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  const cacheRef = useRef<{ raw: string; parsed: T } | null>(null);

  const getSnapshot = useCallback(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return initialValue;
      if (cacheRef.current && cacheRef.current.raw === raw) {
        return cacheRef.current.parsed;
      }
      const parsed = JSON.parse(raw) as T;
      cacheRef.current = { raw, parsed };
      return parsed;
    } catch {
      return initialValue;
    }
  }, [key, initialValue]);

  const storedValue = useSyncExternalStore(
    subscribeToStorage,
    getSnapshot,
    () => initialValue
  );

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      const currentValue = (() => {
        try {
          const item = window.localStorage.getItem(key);
          return item ? (JSON.parse(item) as T) : initialValue;
        } catch {
          return initialValue;
        }
      })();
      const valueToStore = value instanceof Function ? value(currentValue) : value;
      try {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        window.dispatchEvent(new CustomEvent("local-storage-change"));
      } catch (error) {
        console.error(`Error saving ${key} to localStorage:`, error);
      }
    },
    [key, initialValue]
  );

  return [storedValue, setValue] as const;
}
