import { Lead, LeadStatus } from '../../types/domain';
import { KanbanCard } from './KanbanCard';
import { STATUS_CONFIG } from '../../utils/constants';
import { useDroppable } from '@dnd-kit/core';

interface KanbanColumnProps {
  status: LeadStatus;
  leads: Lead[];
  onCardClick: (lead: Lead) => void;
  draggedLeadId: string | null;
  readonly?: boolean;
}

export function KanbanColumn({ status, leads, onCardClick, draggedLeadId, readonly }: KanbanColumnProps) {
  const config = STATUS_CONFIG[status];
  const { setNodeRef, isOver } = useDroppable({ id: status });

  const isDragging = draggedLeadId !== null;

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-[280px] flex-1 rounded-2xl border-2 transition-all duration-200 ${
        isOver
          ? 'border-blue-400 bg-blue-50/60 shadow-lg scale-[1.01]'
          : isDragging
            ? 'border-dashed border-gray-300 bg-gray-50/50'
            : 'border-gray-200 bg-gradient-to-b from-gray-50/80 to-white'
      }`}
    >
      {/* Header */}
      <div className={`px-4 py-3 border-b-2 rounded-t-xl ${config.bgColor} ${config.borderColor}`}>
        <div className="flex items-center justify-between">
          <h3 className={`font-bold text-sm ${config.color}`}>{config.label}</h3>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold text-white ${
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
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-[200px]">
        {leads.length > 0 ? (
          leads.map(lead => (
            readonly ? (
              <KanbanCard key={lead.id} lead={lead} onClick={() => onCardClick(lead)} />
            ) : (
              <DraggableCard
                key={lead.id}
                lead={lead}
                onClick={() => onCardClick(lead)}
                isBeingDragged={draggedLeadId === lead.id}
              />
            )
          ))
        ) : (
          <div className={`flex flex-col items-center justify-center py-12 rounded-xl transition-colors ${
            isOver ? 'bg-blue-100/40' : 'text-gray-400'
          }`}>
            {isOver ? (
              <>
                <div className="text-3xl mb-2">👇</div>
                <p className="text-sm font-medium text-blue-600">Soltar aquí</p>
              </>
            ) : (
              <>
                <div className="text-3xl mb-2">📭</div>
                <p className="text-sm font-medium">Sin leads</p>
              </>
            )}
          </div>
        )}

        {/* Drop indicator when column has cards */}
        {isOver && leads.length > 0 && (
          <div className="border-2 border-dashed border-blue-300 rounded-xl p-4 text-center">
            <p className="text-xs font-medium text-blue-500">Soltar aquí</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Simple draggable wrapper — no sortable, just draggable
import { useDraggable } from '@dnd-kit/core';

function DraggableCard({ lead, onClick, isBeingDragged }: { lead: Lead; onClick: () => void; isBeingDragged: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lead.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`transition-all duration-150 ${
        isBeingDragged ? 'opacity-30 scale-95' : ''
      }`}
    >
      <KanbanCard
        lead={lead}
        onClick={onClick}
        isDragging={isDragging}
      />
    </div>
  );
}
