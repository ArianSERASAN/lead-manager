import { useState, useCallback } from 'react';
import { Lead, LeadStatus } from '../../types/domain';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { PIPELINE_STAGES } from '../../utils/constants';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { Search, Loader2 } from 'lucide-react';
import { usePermissions } from '../../hooks/auth/usePermissions';

interface LeadKanbanProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onStatusChange: (leadId: string, newStatus: LeadStatus) => Promise<void>;
  isLoading?: boolean;
}

export function LeadKanban({ leads, onLeadClick, onStatusChange, isLoading }: LeadKanbanProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [optimisticUpdates, setOptimisticUpdates] = useState<Record<string, LeadStatus>>({});
  const { canEdit } = usePermissions();

  // Require 8px movement before drag starts — prevents accidental drags on click
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  );

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

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const leadId = event.active.id as string;
    const lead = leads.find(l => l.id === leadId) || null;
    setActiveLead(lead);
  }, [leads]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveLead(null);

    if (!over) return;

    const leadId = active.id as string;
    // The drop target is the column id (status string)
    const newStatus = over.id as LeadStatus;

    const lead = leads.find(l => l.id === leadId);
    if (!lead || !PIPELINE_STAGES.includes(newStatus as string)) return;

    // Use optimistic status for comparison
    const currentStatus = optimisticUpdates[lead.id] ?? lead.status;
    if (currentStatus === newStatus) return;

    // Optimistic UI update — card moves immediately
    setOptimisticUpdates(prev => ({ ...prev, [lead.id]: newStatus }));
    setIsUpdating(true);

    try {
      await onStatusChange(lead.id, newStatus);
      setOptimisticUpdates(prev => {
        const { [lead.id]: _, ...rest } = prev;
        return rest;
      });
    } catch (error) {
      // Revert on error
      setOptimisticUpdates(prev => {
        const { [lead.id]: _, ...rest } = prev;
        return rest;
      });
      console.error('Error updating lead status:', error);
    } finally {
      setIsUpdating(false);
    }
  }, [leads, onStatusChange, optimisticUpdates]);

  const handleDragCancel = useCallback(() => {
    setActiveLead(null);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar leads por nombre, email o empresa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-300 transition-all text-sm"
          />
          {isUpdating && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <Loader2 size={16} className="animate-spin text-blue-600" />
            </div>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={canEdit ? sensors : []}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 flex-1">
          {PIPELINE_STAGES.map((status) => (
            <KanbanColumn
              key={status}
              status={status as LeadStatus}
              leads={leadsByStatus[status as LeadStatus]}
              onCardClick={onLeadClick}
              draggedLeadId={activeLead?.id || null}
              readonly={!canEdit}
            />
          ))}
        </div>

        {/* Floating drag overlay — renders above everything */}
        <DragOverlay dropAnimation={{
          duration: 200,
          easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
        }}>
          {activeLead ? (
            <div className="rotate-3 scale-105 opacity-90">
              <KanbanCard lead={activeLead} onClick={() => {}} isDragging />
            </div>
          ) : null}
        </DragOverlay>
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
