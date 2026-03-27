import { Lead, LeadStatus } from '../../types/domain';
import { KanbanCard } from './KanbanCard';
import { STATUS_CONFIG } from '../../utils/constants';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';

interface KanbanColumnProps {
  status: LeadStatus;
  leads: Lead[];
  onCardClick: (lead: Lead) => void;
  isDraggingOver?: boolean;
}

export function KanbanColumn({ status, leads, onCardClick, isDraggingOver }: KanbanColumnProps) {
  const config = STATUS_CONFIG[status];
  const { setNodeRef } = useDroppable({ id: status });

  const sortableIds = leads.map(lead => lead.id);

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-full md:min-w-80 bg-gradient-to-b from-gray-50 to-white rounded-2xl border-2 transition-all ${
        isDraggingOver
          ? 'border-blue-400 bg-blue-50/50 shadow-lg'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* Header */}
      <div className={`px-4 py-3 border-b-2 rounded-t-xl ${config.bgColor} ${config.borderColor}`}>
        <div className="flex items-center justify-between">
          <h3 className={`font-bold text-sm ${config.color}`}>{config.label}</h3>
          <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${
            status === 'nuevo' ? 'bg-emerald-600' :
            status === 'contactado' ? 'bg-amber-600' :
            status === 'en-progreso' ? 'bg-purple-600' :
            'bg-red-600'
          }`}>
            {leads.length}
          </span>
        </div>
      </div>

      {/* Cards Container */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-96">
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          {leads.length > 0 ? (
            leads.map(lead => (
              <SortableKanbanCardWrapper
                key={lead.id}
                lead={lead}
                onClick={() => onCardClick(lead)}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <div className="text-4xl mb-2">📭</div>
              <p className="text-sm font-medium">Sin leads en esta etapa</p>
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}

function SortableKanbanCardWrapper({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: lead.id });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <KanbanCard
        lead={lead}
        onClick={onClick}
        isDragging={isDragging}
      />
    </div>
  );
}
