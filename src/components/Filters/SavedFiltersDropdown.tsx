import { useState } from 'react';
import { ChevronDown, Trash2, Save } from 'lucide-react';
import { SavedFilter, FilterState, toJSDate } from '../../types/domain';

interface SavedFiltersDropdownProps {
  savedFilters: SavedFilter[];
  onLoadFilter: (filters: FilterState) => void;
  onDeleteFilter: (id: string) => void;
  onSaveCurrentFilter: () => void;
  isOpen?: boolean;
}

export function SavedFiltersDropdown({
  savedFilters,
  onLoadFilter,
  onDeleteFilter,
  onSaveCurrentFilter,
  isOpen: defaultIsOpen = false
}: SavedFiltersDropdownProps) {
  const [isOpen, setIsOpen] = useState(defaultIsOpen);

  if (savedFilters.length === 0) {
    return (
      <button
        onClick={onSaveCurrentFilter}
        className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-blue-600 bg-blue-50 rounded-2xl border border-blue-200 hover:bg-blue-100 transition-colors"
      >
        <Save size={16} />
        <span>Guardar Filtro</span>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-3 text-sm font-semibold bg-gray-50 text-gray-700 rounded-2xl border border-gray-200 hover:bg-gray-100 transition-colors"
      >
        <span>Filtros Guardados ({savedFilters.length})</span>
        <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-lg border border-gray-200 z-50 overflow-hidden dropdown-enter">
          <div className="max-h-72 overflow-y-auto">
            {savedFilters.map(filter => (
              <div
                key={filter.id}
                className="flex items-center justify-between p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 group"
              >
                <button
                  onClick={() => {
                    onLoadFilter(filter.filters);
                    setIsOpen(false);
                  }}
                  className="flex-1 text-left"
                >
                  <p className="text-sm font-semibold text-gray-900">{filter.name}</p>
                  <p className="text-xs text-gray-500">
                    {toJSDate(filter.createdAt).toLocaleDateString('es-ES')}
                  </p>
                </button>

                <button
                  onClick={() => onDeleteFilter(filter.id)}
                  className="p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                  title="Eliminar filtro"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 p-3 bg-gray-50">
            <button
              onClick={() => {
                onSaveCurrentFilter();
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Save size={16} />
              <span>Guardar Filtro Actual</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
