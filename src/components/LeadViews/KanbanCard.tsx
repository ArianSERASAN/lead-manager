import { useState } from 'react';
import { Lead } from '../../types/domain';
import { ChevronDown, Mail, Building, Clock } from 'lucide-react';
import { formatRelativeTime } from '../../utils/format';
import { TAG_COLORS } from '../../utils/constants';
import { ScoreBadge } from '../Scoring/ScoreBadge';

interface KanbanCardProps {
  lead: Lead;
  onClick: () => void;
  isDragging?: boolean;
}

export function KanbanCard({ lead, onClick, isDragging }: KanbanCardProps) {
  const [expanded, setExpanded] = useState(false);

  const getSourceIcon = (source: Lead['source']) => {
    switch (source) {
      case 'landing': return '🌐';
      case 'web-download': return '📥';
      case 'web-contact': return '💬';
      case 'manual': return '✋';
    }
  };

  const handleExpandToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (!isDragging) {
      e.stopPropagation();
      onClick();
    }
  };

  const displayTags = lead.tags?.slice(0, 3) || [];
  const remainingTags = (lead.tags?.length || 0) - displayTags.length;

  return (
    <div
      className={`bg-white rounded-lg border select-none ${
        isDragging
          ? 'shadow-2xl border-blue-300 ring-2 ring-blue-200'
          : `shadow-sm cursor-grab active:cursor-grabbing active:scale-[0.98] md:hover-lift transition-transform duration-150 ${
              lead.isStale ? 'border-orange-200' : 'border-gray-100 md:hover:border-blue-200'
            }`
      }`}
    >
      {/* Compact row — always visible */}
      <div
        onClick={handleCardClick}
        className="flex items-center gap-2 px-3 py-2"
      >
        {/* Score dot */}
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
          lead.score >= 70 ? 'bg-emerald-500' :
          lead.score >= 40 ? 'bg-amber-500' :
          'bg-gray-300'
        }`} />

        {/* Name */}
        <span className="text-sm font-medium text-gray-900 truncate flex-1 min-w-0">
          {lead.name}
        </span>

        {/* Source icon */}
        <span className="text-xs flex-shrink-0">{getSourceIcon(lead.source)}</span>

        {/* Time */}
        <span className="text-[10px] text-gray-400 flex-shrink-0 hidden sm:inline">
          {formatRelativeTime(lead.createdAt)}
        </span>

        {/* Expand button */}
        <button
          onClick={handleExpandToggle}
          aria-label={expanded ? 'Contraer detalles' : 'Expandir detalles'}
          aria-expanded={expanded}
          className={`p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-transform duration-200 flex-shrink-0 ${
            expanded ? 'rotate-180' : ''
          }`}
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-50 space-y-2 animate-fade-in">
          {/* Email + Company */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Mail size={11} className="text-gray-400 flex-shrink-0" />
              <span className="text-xs text-gray-500 truncate">{lead.email}</span>
            </div>
            {lead.company && (
              <div className="flex items-center gap-1.5">
                <Building size={11} className="text-gray-400 flex-shrink-0" />
                <span className="text-xs text-gray-500 truncate">{lead.company}</span>
              </div>
            )}
          </div>

          {/* Score + Tags row */}
          <div className="flex items-center gap-2 flex-wrap">
            <ScoreBadge score={lead.score} size="sm" showTooltip={true} />
            {displayTags.map((tag, idx) => (
              <span
                key={tag}
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${TAG_COLORS[idx % TAG_COLORS.length]}`}
              >
                {tag}
              </span>
            ))}
            {remainingTags > 0 && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                +{remainingTags}
              </span>
            )}
          </div>

          {/* Assignee + time */}
          <div className="flex items-center justify-between text-[10px] text-gray-400">
            <div className="flex items-center gap-1.5">
              <Clock size={10} />
              <span>{formatRelativeTime(lead.createdAt)}</span>
            </div>
            {lead.assignedTo && (
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-[8px] font-bold text-white">
                  {lead.assignedTo.substring(0, 1).toUpperCase()}
                </div>
                <span>Asignado</span>
              </div>
            )}
          </div>

          {/* Open detail button */}
          <button
            onClick={handleCardClick}
            className="w-full text-center text-[11px] font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 py-1.5 rounded-md transition-colors"
          >
            Ver detalle completo
          </button>
        </div>
      )}
    </div>
  );
}
