import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowUp, ArrowDown, CornerDownLeft, X } from 'lucide-react';
import { useGlobalSearch } from '../../hooks/useGlobalSearch';
import { ScoreBadge } from '../Scoring/ScoreBadge';

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  nuevo: { label: 'Nuevo', cls: 'bg-emerald-50 text-emerald-700' },
  contactado: { label: 'Contactado', cls: 'bg-amber-50 text-amber-700' },
  'en-progreso': { label: 'En Progreso', cls: 'bg-purple-50 text-purple-700' },
  cerrado: { label: 'Cerrado', cls: 'bg-red-50 text-red-700' },
  cancelado: { label: 'Cancelado', cls: 'bg-gray-100 text-gray-500' },
};

export function GlobalSearch() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const {
    isOpen,
    query,
    setQuery,
    results,
    selectedIndex,
    setSelectedIndex,
    close,
    moveUp,
    moveDown,
  } = useGlobalSearch();

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-search-item]');
    items[selectedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const handleSelect = (index: number) => {
    const lead = results[index];
    if (!lead) return;
    close();
    navigate(`/leads/${lead._collection || 'leads'}/${lead.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        moveUp();
        break;
      case 'ArrowDown':
        e.preventDefault();
        moveDown();
        break;
      case 'Enter':
        e.preventDefault();
        handleSelect(selectedIndex);
        break;
      case 'Escape':
        close();
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={close} />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl border border-gray-200/80 overflow-hidden animate-fade-in">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar leads..."
            className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent"
            autoComplete="off"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-300 hover:text-gray-500">
              <X size={16} />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-gray-400 bg-gray-100 border border-gray-200 rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[360px] overflow-y-auto">
          {query && results.length === 0 && (
            <div className="py-10 text-center text-sm text-gray-400">
              Sin resultados para &ldquo;{query}&rdquo;
            </div>
          )}

          {results.map((lead, i) => {
            const status = STATUS_LABEL[lead.status] || STATUS_LABEL.nuevo;
            return (
              <div
                key={lead.id}
                data-search-item
                onClick={() => handleSelect(i)}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                  i === selectedIndex ? 'bg-primary-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {lead.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 truncate">{lead.name}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${status.cls}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 truncate">
                    <span>{lead.email}</span>
                    {lead.company && <span>· {lead.company}</span>}
                  </div>
                </div>
                <ScoreBadge score={lead.score} size="sm" />
              </div>
            );
          })}
        </div>

        {/* Footer hints */}
        {results.length > 0 && (
          <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-100 text-[10px] text-gray-400">
            <span className="flex items-center gap-1"><ArrowUp size={10} /><ArrowDown size={10} /> navegar</span>
            <span className="flex items-center gap-1"><CornerDownLeft size={10} /> abrir</span>
            <span className="flex items-center gap-1">ESC cerrar</span>
          </div>
        )}

        {/* Empty state with shortcut hint */}
        {!query && (
          <div className="py-10 text-center">
            <p className="text-sm text-gray-400">Escribe para buscar leads</p>
            <p className="text-[10px] text-gray-300 mt-1">
              Tip: Usa <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] font-mono">Ctrl+K</kbd> desde cualquier lugar
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
