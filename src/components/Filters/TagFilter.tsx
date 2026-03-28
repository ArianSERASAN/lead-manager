import { X } from 'lucide-react';
import { Lead } from '../../types/domain';
import { TAG_COLORS } from '../../utils/constants';

interface TagFilterProps {
  leads: Lead[];
  selectedTags: string[];
  onTagChange: (tags: string[]) => void;
}

export function TagFilter({ leads, selectedTags, onTagChange }: TagFilterProps) {
  // Extract unique tags from all leads
  const allTags = Array.from(new Set(leads.flatMap(l => l.tags || [])))
    .sort();

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagChange(selectedTags.filter(t => t !== tag));
    } else {
      onTagChange([...selectedTags, tag]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-gray-700">Tags</label>
        {selectedTags.length > 0 && (
          <button
            onClick={() => onTagChange([])}
            className="text-xs text-gray-500 hover:text-red-500 font-medium"
          >
            Limpiar
          </button>
        )}
      </div>

      {allTags.length === 0 ? (
        <p className="text-sm text-gray-500">Sin tags disponibles</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {allTags.map((tag, idx) => {
            const colorClass = TAG_COLORS[idx % TAG_COLORS.length];
            const isSelected = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border-2 ${
                  isSelected
                    ? `${colorClass} border-current`
                    : `${colorClass} opacity-50 hover:opacity-75 border-transparent`
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
