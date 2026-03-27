import { X } from 'lucide-react';
import { TAG_COLORS } from '../../utils/constants';

interface TagBadgeProps {
  tag: string;
  onRemove?: () => void;
  size?: 'sm' | 'md';
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function TagBadge({ tag, onRemove, size = 'md' }: TagBadgeProps) {
  const colorIndex = hashCode(tag) % TAG_COLORS.length;
  const colorClass = TAG_COLORS[colorIndex];

  const sizeClasses = size === 'sm'
    ? 'px-2 py-1 text-xs'
    : 'px-3 py-1.5 text-xs';

  return (
    <div className={`${colorClass} rounded-full inline-flex items-center gap-2 font-bold ${sizeClasses}`}>
      <span>{tag}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="hover:opacity-75 transition-opacity"
          type="button"
        >
          <X size={size === 'sm' ? 12 : 14} />
        </button>
      )}
    </div>
  );
}
