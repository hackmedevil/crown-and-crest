/**
 * useAutosave Hook
 * Provides automatic draft saving to localStorage with debouncing
 */

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

interface UseAutosaveOptions<T> {
  key: string; // localStorage key
  data: T; // Data to save
  debounceMs?: number; // Debounce delay (default: 2000ms)
  enabled?: boolean; // Enable/disable autosave (default: true)
  onSave?: (data: T) => void; // Callback after save
  onRestore?: (data: T) => void; // Callback after restore
}

interface UseAutosaveResult {
  clearDraft: () => void;
  hasDraft: boolean;
  lastSaved: Date | null;
}

export function useAutosave<T>({
  key,
  data,
  debounceMs = 2000,
  enabled = true,
  onSave,
  onRestore,
}: UseAutosaveOptions<T>): UseAutosaveResult {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<Date | null>(null);
  const hasLoadedRef = useRef(false);
  const [hasDraft, setHasDraft] = useState(false);

  // Check for existing draft on mount
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored) as {
          data: T;
          timestamp: string;
        };
        setHasDraft(true);
        onRestore?.(parsed.data);
      }
    } catch (error) {
      console.error('Failed to restore draft:', error);
    }
  }, [key, onRestore]);

  // Autosave effect
  useEffect(() => {
    if (!enabled || !hasLoadedRef.current) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for debounced save
    timeoutRef.current = setTimeout(() => {
      try {
        const payload = {
          data,
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem(key, JSON.stringify(payload));
        lastSavedRef.current = new Date();
        setHasDraft(true);
        onSave?.(data);
      } catch (error) {
        console.error('Failed to save draft:', error);
      }
    }, debounceMs);

    // Cleanup timeout
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, key, debounceMs, enabled, onSave]);

  // Clear draft function
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(key);
      setHasDraft(false);
      lastSavedRef.current = null;
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  }, [key]);

  return {
    clearDraft,
    hasDraft,
    lastSaved: lastSavedRef.current,
  };
}
