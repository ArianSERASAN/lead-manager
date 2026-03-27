import { Lead } from '../../types/domain';
import { Mail } from 'lucide-react';
import { formatRelativeTime } from '../../utils/format';
import { TAG_COLORS } from '../../utils/constants';
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
      onClick={(e) => {
        // Only fire click if not in the middle of a drag
        if (!isDragging) {
          e.stopPropagation();
          onClick();
        }
      }}
      className={`bg-white rounded-xl border p-3.5 transition-all duration-150 select-none ${
        isDragging
          ? 'shadow-2xl border-blue-300 ring-2 ring-blue-200'
          : `shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing ${
              lead.isStale ? 'border-orange-200' : 'border-gray-100 hover:border-blue-200'
            }`
      }`}
    >
      {/* Header: Name and Score */}
      <div className="flex items-start justify-between mb-2 gap-2">
        <h4 className="text-sm font-semibold text-gray-900 truncate flex-1 min-w-0">{lead.name}</h4>
        <ScoreBadge score={lead.score} size="sm" showTooltip={true} />
      </div>

      {/* Email + Company */}
      <div className="space-y-0.5 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Mail size={12} className="text-gray-400 flex-shrink-0" />
          <p className="text-xs text-gray-500 truncate">{lead.email}</p>
        </div>
        {lead.company && (
          <p className="text-xs text-gray-400 truncate pl-[18px]">{lead.company}</p>
        )}
      </div>

      {/* Tags */}
      {displayTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {displayTags.map((tag, idx) => (
            <span
              key={tag}
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${TAG_COLORS[idx % TAG_COLORS.length]}`}
            >
              {tag}
            </span>
          ))}
          {remainingTags > 0 && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500">
              +{remainingTags}
            </span>
          )}
        </div>
      )}

      {/* Footer: Source + Time + Assignee */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-50 text-[11px] text-gray-400">
        <div className="flex items-center gap-2">
          <span>{getSourceIcon(lead.source)}</span>
          <span>{formatRelativeTime(lead.createdAt)}</span>
        </div>
        {lead.assignedTo && (
          <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white">
            {lead.assignedTo.substring(0, 1).toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
}
