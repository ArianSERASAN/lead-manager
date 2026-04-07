import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLeadStore } from '../stores/useLeadStore';
import { Lead } from '../types/domain';

const MAX_RESULTS = 10;
const DEBOUNCE_MS = 150;

export function useGlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const leads = useLeadStore((s) => s.leads);

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Search results
  const results: Lead[] = useMemo(() => {
    if (!debouncedQuery.trim()) return [];

    const tokens = debouncedQuery.toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return [];

    return leads
      .filter((lead) => {
        const searchable = [
          lead.name,
          lead.email,
          lead.company || '',
          (lead.tags || []).join(' '),
        ]
          .join(' ')
          .toLowerCase();

        return tokens.every((token) => searchable.includes(token));
      })
      .slice(0, MAX_RESULTS);
  }, [leads, debouncedQuery]);

  // Reset selectedIndex when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length, debouncedQuery]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setDebouncedQuery('');
    setSelectedIndex(0);
  }, []);

  const moveUp = useCallback(() => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const moveDown = useCallback(() => {
    setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
  }, [results.length]);

  return {
    isOpen,
    query,
    setQuery,
    results,
    selectedIndex,
    setSelectedIndex,
    open,
    close,
    moveUp,
    moveDown,
  };
}
