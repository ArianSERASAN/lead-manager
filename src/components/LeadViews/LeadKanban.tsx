import { useState, useCallback } from 'react';
import { Lead, LeadStatus } from '../../types/domain';
import { KanbanColumn } from './KanbanColumn';
import { PIPELINE_STAGES } from '../../utils/constants';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Search, Loader2 } from 'lucide-react';

interface LeadKanbanProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onStatusChange: (leadId: string, newStatus: LeadStatus) => Promise<void>;
  isLoading?: boolean;
}

export function LeadKanban({ leads, onLeadClick, onStatusChange, isLoading }: LeadKanbanProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [optimisticUpdates, setOptimisticUpdates] = useState<Record<string, LeadStatus>>({});

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  // Filter leads by search query
  const filteredLeads = searchQuery.trim()
    ? leads.filter(lead =>
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.company?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
      )
    : leads;

  // Group leads by status (considering optimistic updates)
  const leadsByStatus = PIPELINE_STAGES.reduce((acc, status) => {
    acc[status as LeadStatus] = filteredLeads.filter(lead => {
      const currentStatus = optimisticUpdates[lead.id] ?? lead.status;
      return currentStatus === status;
    });
    return acc;
  }, {} as Record<LeadStatus, Lead[]>);

  const handleDragStart = useCallback((leadId: string) => {
    setDraggedLeadId(leadId);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedLeadId(null);

    if (!over) return;

    const leadId = active.id as string;
    const newStatus = over.id as LeadStatus;

    const lead = leads.find(l => l.id === leadId);

    if (!lead || !PIPELINE_STAGES.includes(newStatus as string) || lead.status === newStatus) {
      return;
    }

    // Optimistic UI update
    setOptimisticUpdates(prev => ({
      ...prev,
      [lead.id]: newStatus
    }));

    setIsUpdating(true);
    try {
      await onStatusChange(lead.id, newStatus);
      // Clear optimistic update on success
      setOptimisticUpdates(prev => {
        const { [lead.id]: _, ...rest } = prev;
        return rest;
      });
    } catch (error) {
      // Revert optimistic update on error
      setOptimisticUpdates(prev => {
        const { [lead.id]: _, ...rest } = prev;
        return rest;
      });
      console.error('Error updating lead status:', error);
    } finally {
      setIsUpdating(false);
    }
  }, [leads, onStatusChange]);

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar leads por nombre, email o empresa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-2xl bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
          />
          {isUpdating && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <Loader2 size={18} className="animate-spin text-blue-600" />
            </div>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        onDragStart={(event) => handleDragStart(event.active.id as string)}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 md:overflow-x-visible">
          {PIPELINE_STAGES.map((status) => (
            <KanbanColumn
              key={status}
              status={status as LeadStatus}
              leads={leadsByStatus[status as LeadStatus]}
              onCardClick={onLeadClick}
              isDraggingOver={draggedLeadId !== null}
            />
          ))}
        </div>
      </DndContext>

      {/* Empty State */}
      {filteredLeads.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="text-5xl mb-4">🎯</div>
          <p className="text-gray-500 text-lg font-medium">
            {searchQuery ? 'No se encontraron leads' : 'Sin leads disponibles'}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {searchQuery ? 'Intenta con otra búsqueda' : 'Crea tu primer lead para empezar'}
          </p>
        </div>
      )}
    </div>
  );
}
