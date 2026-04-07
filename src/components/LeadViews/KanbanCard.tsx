import { useState } from 'react';
import { Lead } from '../../types/domain';
import { ChevronDown, Mail, Building, Clock, Globe, Download, MessageSquare, Hand } from 'lucide-react';
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
      case 'landing': return <Globe size={12} className="text-primary-500" />;
      case 'web-download': return <Download size={12} className="text-emerald-500" />;
      case 'web-contact': return <MessageSquare size={12} className="text-purple-500" />;
      case 'manual': return <Hand size={12} className="text-gray-400" />;
      case 'csv-import': return <Hand size={12} className="text-orange-400" />;
      default: return <Hand size={12} className="text-gray-300" />;
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
          ? 'shadow-2xl border-primary-300 ring-2 ring-primary-200'
          : `shadow-sm cursor-grab active:cursor-grabbing active:scale-[0.98] md:hover-lift transition-transform duration-150 ${
              lead.isStale ? 'border-orange-200' : 'border-gray-100 md:hover:border-primary-200'
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

        {/* Name — single line, truncated with ellipsis */}
        <span className="text-sm font-medium text-gray-900 truncate flex-1 min-w-0">
          {lead.name}
        </span>

        {/* Expand button */}
        <button
          onClick={handleExpandToggle}
          aria-label={expanded ? 'Contraer detalles' : 'Expandir detalles'}
          aria-expanded={expanded}
          className={`p-1.5 -mr-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-all duration-200 flex-shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center ${
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
            <ScoreBadge score={lead.score} size="sm" />
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

          {/* Source + Assignee + time */}
          <div className="flex items-center justify-between text-[10px] text-gray-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                {getSourceIcon(lead.source)}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={10} />
                {formatRelativeTime(lead.createdAt)}
              </span>
            </div>
            {lead.assignedTo && (
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-full bg-primary-600 flex items-center justify-center text-[8px] font-bold text-white">
                  {lead.assignedTo.substring(0, 1).toUpperCase()}
                </div>
                <span>Asignado</span>
              </div>
            )}
          </div>

          {/* Open detail button */}
          <button
            onClick={handleCardClick}
            className="w-full text-center text-xs font-semibold text-primary-600 hover:text-primary-800 hover:bg-primary-50 active:bg-primary-100 py-3 rounded-lg transition-colors min-h-[44px]"
          >
            Ver detalle completo
          </button>
        </div>
      )}
    </div>
  );
}
