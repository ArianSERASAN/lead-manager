import { Search, X, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Lead, FilterState } from '../../types/domain';
import { TagFilter } from './TagFilter';
import { AssigneeFilter } from './AssigneeFilter';
import { ScoreRangeFilter } from './ScoreRangeFilter';
import { SavedFiltersDropdown } from './SavedFiltersDropdown';
import { useSavedFilters } from '../../hooks/filtering/useSavedFilters';
import { useAuth } from '../../contexts/AuthContext';

interface FilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  sourceFilter: string;
  onSourceChange: (value: string) => void;
  dateFilter: string;
  onDateChange: (value: string) => void;
  leads: Lead[];
  activeTab: string;
  tags?: string[];
  onTagsChange?: (tags: string[]) => void;
  assignedTo?: string[];
  onAssignedToChange?: (assignees: string[]) => void;
  scoreMin?: number;
  scoreMax?: number;
  onScoreRangeChange?: (min: number, max: number) => void;
  activeFilterCount?: number;
  onApplyFilterState?: (filterState: FilterState) => void;
  getCurrentFilterState?: () => FilterState;
  onClearAllFilters?: () => void;
}

export function FilterBar({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  sourceFilter,
  onSourceChange,
  dateFilter,
  onDateChange,
  leads,
  activeTab,
  tags = [],
  onTagsChange,
  assignedTo = [],
  onAssignedToChange,
  scoreMin = 0,
  scoreMax = 100,
  onScoreRangeChange,
  activeFilterCount = 0,
  onApplyFilterState,
  getCurrentFilterState,
  onClearAllFilters
}: FilterBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const { appUser } = useAuth();
  const { savedFilters, saveFilter, deleteFilter, loadFilter } = useSavedFilters();

  const handleSaveFilter = () => {
    if (saveName.trim() && appUser && getCurrentFilterState) {
      const filterState = getCurrentFilterState();
      saveFilter(saveName.trim(), filterState, appUser.uid);
      setSaveName('');
      setShowSaveModal(false);
    }
  };

  const handleLoadFilter = (filterState: FilterState) => {
    if (onApplyFilterState) {
      onApplyFilterState(filterState);
    }
  };

  const handleClearAll = () => {
    onSearchChange('');
    onStatusChange('');
    onSourceChange('');
    onDateChange('');
    if (onTagsChange) onTagsChange([]);
    if (onAssignedToChange) onAssignedToChange([]);
    if (onScoreRangeChange) onScoreRangeChange(0, 100);
    if (onClearAllFilters) onClearAllFilters();
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-card p-2.5 sm:p-3 mb-4 space-y-3">
      {/* Primary Filter Row */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search Input */}
        <div className="flex-1 relative">
          <label htmlFor="lead-search" className="sr-only">Buscar leads</label>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            id="lead-search"
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por nombre, email, empresa..."
            className="w-full bg-gray-50 border-none rounded-lg py-2.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-blue-500 transition-shadow duration-150 outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              aria-label="Limpiar búsqueda"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Basic Filters */}
        <div className="flex flex-wrap sm:flex-nowrap gap-1.5 sm:gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide items-center">
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            aria-label="Filtrar por estado"
            className="bg-gray-50 border-none rounded-lg py-2.5 px-3 sm:px-4 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-colors duration-150 cursor-pointer whitespace-nowrap"
          >
            <option value="">Cualquier Estado</option>
            <option value="nuevo">Nuevos</option>
            <option value="contactado">Contactados</option>
            <option value="en-progreso">En Progreso</option>
            <option value="cerrado">Cerrados</option>
          </select>

          {activeTab === 'dashboard' && (
            <select
              value={sourceFilter}
              onChange={(e) => onSourceChange(e.target.value)}
              aria-label="Filtrar por origen"
              className="bg-gray-50 border-none rounded-lg py-2.5 px-3 sm:px-4 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-colors duration-150 cursor-pointer whitespace-nowrap"
            >
              <option value="">Todos los Orígenes</option>
              <option value="landing">Landing Page</option>
              <option value="web-download">Web (Descargas)</option>
              <option value="web-contact">Web (Contacto)</option>
              <option value="manual">Manual</option>
            </select>
          )}

          <select
            value={dateFilter}
            onChange={(e) => onDateChange(e.target.value)}
            aria-label="Filtrar por fecha"
            className="bg-gray-50 border-none rounded-lg py-2.5 px-3 sm:px-4 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-colors duration-150 cursor-pointer whitespace-nowrap"
          >
            <option value="">Cualquier Fecha</option>
            <option value="today">Hoy</option>
            <option value="yesterday">Ayer</option>
            <option value="week">Esta Semana</option>
            <option value="month">Este Mes</option>
          </select>

          {/* More Filters Button */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`p-3 rounded-2xl transition-colors duration-150 shrink-0 relative btn-press ${
              showAdvanced
                ? 'bg-blue-50 text-blue-600 border border-blue-200'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
            title="Más filtros"
            aria-label="Más filtros"
            aria-expanded={showAdvanced}
          >
            <Filter size={20} />
            {activeFilterCount > 0 && (
              <span className="absolute top-0 right-0 w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center transform translate-x-1 -translate-y-1">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Clear All Button */}
          {activeFilterCount > 0 && (
            <button
              onClick={handleClearAll}
              className="p-3 bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-colors duration-150 shrink-0 btn-press"
              title="Limpiar Todos los Filtros"
              aria-label="Limpiar todos los filtros"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters Row */}
      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-200">
          {/* Tag Filter */}
          {onTagsChange && (
            <TagFilter leads={leads} selectedTags={tags} onTagChange={onTagsChange} />
          )}

          {/* Assignee Filter */}
          {onAssignedToChange && (
            <AssigneeFilter
              selectedAssignees={assignedTo}
              onAssigneeChange={onAssignedToChange}
              currentUserId={appUser?.uid}
            />
          )}

          {/* Score Range Filter */}
          {onScoreRangeChange && (
            <ScoreRangeFilter
              scoreMin={scoreMin}
              scoreMax={scoreMax}
              onScoreRangeChange={onScoreRangeChange}
            />
          )}

          {/* Saved Filters */}
          <div className="col-span-1">
            <SavedFiltersDropdown
              savedFilters={savedFilters}
              onLoadFilter={handleLoadFilter}
              onDeleteFilter={deleteFilter}
              onSaveCurrentFilter={() => setShowSaveModal(true)}
            />
          </div>
        </div>
      )}

      {/* Save Filter Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 rounded-2xl">
          <div className="bg-white rounded-3xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Guardar Filtro</h3>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Nombre del filtro (ej: Leads Calientes)"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  setSaveName('');
                }}
                className="flex-1 px-4 py-2 text-gray-700 font-semibold bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveFilter}
                disabled={!saveName.trim()}
                className="flex-1 px-4 py-2 text-white font-semibold bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
