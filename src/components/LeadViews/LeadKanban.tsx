import { useState, useCallback } from 'react';
import { Lead, LeadStatus } from '../../types/domain';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { PIPELINE_STAGES, STATUS_CONFIG } from '../../utils/constants';
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
import { Search, Loader2, ChevronLeft, ChevronRight, Target, Inbox } from 'lucide-react';
import { usePermissions } from '../../hooks/auth/usePermissions';
import { getLeadKey } from '../../lib/leads';

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
  const [mobileActiveTab, setMobileActiveTab] = useState<number>(0);
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
      const currentStatus = optimisticUpdates[getLeadKey(lead)] ?? lead.status;
      return currentStatus === status;
    });
    return acc;
  }, {} as Record<LeadStatus, Lead[]>);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const leadKey = event.active.id as string;
    const lead = leads.find(l => getLeadKey(l) === leadKey) || null;
    setActiveLead(lead);
  }, [leads]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveLead(null);

    if (!over) return;

    const leadKey = active.id as string;
    // The drop target is the column id (status string)
    const newStatus = over.id as LeadStatus;

    const lead = leads.find(l => getLeadKey(l) === leadKey);
    if (!lead || !PIPELINE_STAGES.includes(newStatus as string)) return;
    const targetLeadKey = getLeadKey(lead);

    // Use optimistic status for comparison
    const currentStatus = optimisticUpdates[targetLeadKey] ?? lead.status;
    if (currentStatus === newStatus) return;

    // Optimistic UI update - card moves immediately
    setOptimisticUpdates(prev => ({ ...prev, [targetLeadKey]: newStatus }));
    setIsUpdating(true);

    try {
      await onStatusChange(targetLeadKey, newStatus);
      setOptimisticUpdates(prev => {
        const { [targetLeadKey]: _, ...rest } = prev;
        return rest;
      });
    } catch (error) {
      // Revert on error
      setOptimisticUpdates(prev => {
        const { [targetLeadKey]: _, ...rest } = prev;
        return rest;
      });
      console.error('Error al actualizar estado del lead:', error);
    } finally {
      setIsUpdating(false);
    }
  }, [leads, onStatusChange, optimisticUpdates]);

  const handleDragCancel = useCallback(() => {
    setActiveLead(null);
  }, []);

  // Mobile: handle status change via button tap (no drag needed)
  const handleMobileStatusChange = useCallback(async (lead: Lead, newStatus: LeadStatus) => {
    if (!canEdit) return;
    const leadKey = getLeadKey(lead);
    const currentStatus = optimisticUpdates[leadKey] ?? lead.status;
    if (currentStatus === newStatus) return;
    setOptimisticUpdates(prev => ({ ...prev, [leadKey]: newStatus }));
    setIsUpdating(true);
    try {
      await onStatusChange(leadKey, newStatus);
      setOptimisticUpdates(prev => {
        const { [leadKey]: _, ...rest } = prev;
        return rest;
      });
    } catch (error) {
      setOptimisticUpdates(prev => {
        const { [leadKey]: _, ...rest } = prev;
        return rest;
      });
    } finally {
      setIsUpdating(false);
    }
  }, [canEdit, optimisticUpdates, onStatusChange]);

  const mobileActiveStatus = PIPELINE_STAGES[mobileActiveTab] as LeadStatus;
  const mobileActiveConfig = STATUS_CONFIG[mobileActiveStatus];
  const mobileLeads = leadsByStatus[mobileActiveStatus] || [];

  // Swipe navigation helpers
  const goToPrevTab = () => setMobileActiveTab(prev => Math.max(0, prev - 1));
  const goToNextTab = () => setMobileActiveTab(prev => Math.min(PIPELINE_STAGES.length - 1, prev + 1));

  return (
    <div className="flex flex-col h-full -mx-2 sm:-mx-4 md:mx-0">
      {/* Search Bar */}
      <div className="mb-4 px-1 md:px-0">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar leads por nombre, email o empresa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-300 transition-all text-sm"
          />
          {isUpdating && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <Loader2 size={16} className="animate-spin text-primary-600" />
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          MOBILE: Tab-based single-column view
          ═══════════════════════════════════════════════════ */}
      <div className="md:hidden flex flex-col flex-1">
        {/* Tab Bar */}
        <div className="flex gap-1 mb-3 bg-gray-100 rounded-xl p-1 mx-1">
          {PIPELINE_STAGES.map((status, idx) => {
            const config = STATUS_CONFIG[status];
            const count = (leadsByStatus[status as LeadStatus] || []).length;
            const isActive = idx === mobileActiveTab;
            return (
              <button
                key={status}
                onClick={() => setMobileActiveTab(idx)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-lg text-center transition-all duration-200 min-h-[44px] ${
                  isActive
                    ? 'bg-white shadow-sm'
                    : 'text-gray-500 active:bg-gray-200'
                }`}
              >
                <span className={`text-[11px] font-bold leading-tight ${isActive ? config.color : 'text-gray-500'}`}>
                  {config.label}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                  isActive
                    ? `${status === 'nuevo' ? 'bg-emerald-100 text-emerald-700' :
                        status === 'contactado' ? 'bg-amber-100 text-amber-700' :
                        status === 'en-progreso' ? 'bg-violet-100 text-violet-700' :
                        'bg-red-100 text-red-700'}`
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Navigation arrows + Column Header */}
        <div className="flex items-center justify-between mb-2 px-1">
          <button
            onClick={goToPrevTab}
            disabled={mobileActiveTab === 0}
            className="p-2 rounded-lg text-gray-400 active:bg-gray-100 disabled:opacity-30 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Columna anterior"
          >
            <ChevronLeft size={20} />
          </button>
          <div className={`px-3 py-1.5 rounded-lg font-bold text-sm ${mobileActiveConfig.bgColor} ${mobileActiveConfig.color}`}>
            {mobileActiveConfig.label} ({mobileLeads.length})
          </div>
          <button
            onClick={goToNextTab}
            disabled={mobileActiveTab === PIPELINE_STAGES.length - 1}
            className="p-2 rounded-lg text-gray-400 active:bg-gray-100 disabled:opacity-30 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Columna siguiente"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Cards list for active status */}
        <div className="flex-1 overflow-y-auto space-y-2 pb-4 px-1">
          {mobileLeads.length > 0 ? (
            mobileLeads.map(lead => (
              <MobileKanbanCard
                key={getLeadKey(lead)}
                lead={lead}
                onClick={() => onLeadClick(lead)}
                currentStatus={mobileActiveStatus}
                onStatusChange={canEdit ? handleMobileStatusChange : undefined}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 px-2">
              <Inbox size={28} className="text-gray-300 mb-2" />
              <p className="text-sm font-medium">Sin leads en {mobileActiveConfig.label.toLowerCase()}</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          DESKTOP: Standard Kanban board with drag & drop
          ═══════════════════════════════════════════════════ */}
      <div className="hidden md:block flex-1">
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
                draggedLeadId={activeLead ? getLeadKey(activeLead) : null}
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
      </div>

      {/* Empty State */}
      {filteredLeads.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <Target size={32} className="text-gray-400" />
          </div>
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

/* ═══════════════════════════════════════════════════
   Mobile-only Kanban Card — with quick status change
   ═══════════════════════════════════════════════════ */
import { Mail, Building, Clock, ArrowRight } from 'lucide-react';
import { formatRelativeTime } from '../../utils/format';
import { TAG_COLORS } from '../../utils/constants';
import { ScoreBadge } from '../Scoring/ScoreBadge';

function MobileKanbanCard({ lead, onClick, currentStatus, onStatusChange }: {
  lead: Lead;
  onClick: () => void;
  currentStatus: LeadStatus;
  onStatusChange?: (lead: Lead, newStatus: LeadStatus) => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const displayTags = lead.tags?.slice(0, 3) || [];
  const nextStatuses = PIPELINE_STAGES.filter(s => s !== currentStatus) as LeadStatus[];

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm animate-fade-in">
      {/* Main card — tappable */}
      <div
        onClick={onClick}
        className="flex items-center gap-3 p-3.5 active:bg-gray-50 transition-colors cursor-pointer"
      >
        {/* Score dot */}
        <div
          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
            lead.score >= 70 ? 'bg-emerald-500' :
            lead.score >= 40 ? 'bg-amber-500' :
            'bg-gray-300'
          }`}
          role="img"
          aria-label={`Puntuación: ${lead.score} — ${lead.score >= 70 ? 'Alta' : lead.score >= 40 ? 'Media' : 'Baja'}`}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-gray-900 truncate">{lead.name}</span>
            <ScoreBadge score={lead.score} size="sm" />
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-400 truncate">{lead.email}</span>
          </div>
          {/* Tags row */}
          {displayTags.length > 0 && (
            <div className="flex items-center gap-1.5 mt-1.5">
              {displayTags.map((tag, idx) => (
                <span key={tag} className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${TAG_COLORS[idx % TAG_COLORS.length]}`}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Move button */}
        {onStatusChange && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowActions(!showActions); }}
            className="p-2 rounded-lg text-gray-400 active:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
            aria-label="Mover a otra columna"
          >
            <ArrowRight size={18} />
          </button>
        )}
      </div>

      {/* Quick status change actions */}
      {showActions && onStatusChange && (
        <div className="px-3.5 pb-3 pt-1 border-t border-gray-50 animate-fade-in">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Mover a:</p>
          <div className="flex gap-2">
            {nextStatuses.map(status => {
              const config = STATUS_CONFIG[status];
              return (
                <button
                  key={status}
                  onClick={() => { onStatusChange(lead, status); setShowActions(false); }}
                  className={`flex-1 py-2.5 px-2 rounded-lg text-xs font-bold border transition-all active:scale-[0.97] min-h-[44px] ${config.bgColor} ${config.color} ${config.borderColor}`}
                >
                  {config.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
