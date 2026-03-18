import { Search, X, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Lead } from '../types';

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
  activeTab
}: FilterBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Extract unique metadata keys for advanced filtering (optional enhancement)
  // For now we'll stick to a robust Search that covers all fields.

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 mb-6 space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por nombre, email, empresa o cualquier dato..."
            className="w-full bg-gray-50 border-none rounded-2xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
          />
          {searchTerm && (
            <button 
              onClick={() => onSearchChange('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Basic Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer whitespace-nowrap"
          >
            <option value="all">Cualquier Estado</option>
            <option value="nuevo">Nuevos</option>
            <option value="contactado">Contactados</option>
            <option value="en-progreso">En Progreso</option>
            <option value="cerrado">Cerrados</option>
          </select>

          {activeTab === 'dashboard' && (
            <select
              value={sourceFilter}
              onChange={(e) => onSourceChange(e.target.value)}
              className="bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer whitespace-nowrap"
            >
              <option value="all">Todos los Orígenes</option>
              <option value="landing">Landing Page</option>
              <option value="web-download">Web (Descargas)</option>
              <option value="web-contact">Web (Contacto)</option>
            </select>
          )}

          <select
            value={dateFilter}
            onChange={(e) => onDateChange(e.target.value)}
            className="bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer whitespace-nowrap"
          >
            <option value="all">Cualquier Fecha</option>
            <option value="today">Hoy</option>
            <option value="yesterday">Ayer</option>
            <option value="week">Esta Semana</option>
            <option value="month">Este Mes</option>
          </select>

          <button
            onClick={() => {
                onSearchChange('');
                onStatusChange('all');
                onSourceChange('all');
                onDateChange('all');
            }}
            className="p-3 bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all shrink-0"
            title="Limpiar Filtros"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
