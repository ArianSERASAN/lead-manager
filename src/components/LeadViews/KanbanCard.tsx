import { Lead } from '../../types/domain';
import { Mail, Zap } from 'lucide-react';
import { formatRelativeTime, getScoreColor, getScoreBgColor } from '../../utils/format';
import { SOURCE_CONFIG, TAG_COLORS } from '../../utils/constants';
import { ScoreBadge } from '../Scoring/ScoreBadge';

interface KanbanCardProps {
  lead: Lead;
  onClick: () => void;
  isDragging?: boolean;
}

export function KanbanCard({ lead, onClick, isDragging }: KanbanCardProps) {
  const getSourceIcon = (source: Lead['source']) => {
    switch (source) {
      case 'landing': return '🌐';
      case 'web-download': return '📥';
      case 'web-contact': return '💬';
      case 'manual': return '✋';
    }
  };

  const displayTags = lead.tags?.slice(0, 3) || [];
  const remainingTags = (lead.tags?.length || 0) - displayTags.length;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border-2 p-4 shadow-card hover:shadow-card-hover transition-all duration-200 cursor-grab active:cursor-grabbing ${
        lead.isStale ? 'border-orange-300 opacity-80' : 'border-gray-100'
      } ${
        isDragging ? 'opacity-50 scale-95 rotate-2 shadow-xl' : 'hover:border-blue-300 hover:-translate-y-1'
      }`}
    >
      {/* Header: Name and Score Badge */}
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-gray-900 truncate">{lead.name}</h4>
        </div>
        <div className="flex-shrink-0">
          <ScoreBadge score={lead.score} size="sm" showTooltip={true} />
        </div>
      </div>

      {/* Email and Company */}
      <div className="space-y-1 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Mail size={14} className="text-gray-400 flex-shrink-0" />
          <p className="text-xs text-gray-600 truncate">{lead.email}</p>
        </div>
        {lead.company && (
          <p className="text-xs text-gray-500 truncate">
            {lead.company}
          </p>
        )}
      </div>

      {/* Tags */}
      {(displayTags.length > 0 || remainingTags > 0) && (
        <div className="flex flex-wrap gap-1 mb-3">
          {displayTags.map((tag, idx) => (
            <span
              key={tag}
              className={`text-xs font-semibold px-2 py-1 rounded-full ${TAG_COLORS[idx % TAG_COLORS.length]}`}
            >
              {tag}
            </span>
          ))}
          {remainingTags > 0 && (
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-600">
              +{remainingTags}
            </span>
          )}
        </div>
      )}

      {/* Assignee if present */}
      {lead.assignedTo && (
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
            {lead.assignedTo.substring(0, 1).toUpperCase()}
          </div>
          <span className="text-xs text-gray-600">Asignado</span>
        </div>
      )}

      {/* Footer: Source Icon and Time */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-500">
        <span>{getSourceIcon(lead.source)}</span>
        <span>{formatRelativeTime(lead.createdAt)}</span>
      </div>
    </div>
  );
}
