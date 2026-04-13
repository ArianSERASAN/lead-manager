import { useState, useRef, useEffect } from 'react';
import { TagBadge } from './TagBadge';
import { Plus } from 'lucide-react';

interface TagEditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  leadId: string;
  leadCollection: string;
}

const SUGGESTED_TAGS = [
  'urgente',
  'VIP',
  'presupuesto',
  'seguimiento',
  'ITE',
  'rehabilitación',
  'obra nueva',
  'mantenimiento',
];

export function TagEditor({ tags, onChange, leadId: _leadId, leadCollection: _leadCollection }: TagEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!inputValue.trim()) {
      setFilteredSuggestions([]);
      return;
    }

    const filtered = SUGGESTED_TAGS
      .filter(
        (tag) =>
          tag.toLowerCase().includes(inputValue.toLowerCase()) &&
          !tags.includes(tag)
      )
      .slice(0, 5);

    setFilteredSuggestions(filtered);
    setSelectedSuggestion(0);
  }, [inputValue, tags]);

  useEffect(() => {
    if (isAdding) {
      inputRef.current?.focus();
    }
  }, [isAdding]);

  const handleAddTag = async (newTag: string) => {
    const trimmedTag = newTag.trim().toLowerCase();

    if (!trimmedTag || tags.includes(trimmedTag)) {
      return;
    }

    const updatedTags = [...tags, trimmedTag];
    onChange(updatedTags);
    setInputValue('');
    setIsAdding(false);
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const updatedTags = tags.filter((t) => t !== tagToRemove);
    onChange(updatedTags);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredSuggestions.length > 0) {
        handleAddTag(filteredSuggestions[selectedSuggestion]);
      } else {
        handleAddTag(inputValue);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestion((prev) =>
        Math.min(prev + 1, filteredSuggestions.length - 1)
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestion((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setInputValue('');
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        {tags.map((tag) => (
          <TagBadge
            key={tag}
            tag={tag}
            onRemove={() => handleRemoveTag(tag)}
          />
        ))}
      </div>

      {!isAdding ? (
        <button
          onClick={() => setIsAdding(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-colors"
        >
          <Plus size={14} />
          <span>Añadir etiqueta</span>
        </button>
      ) : (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              setTimeout(() => {
                if (!inputValue.trim()) {
                  setIsAdding(false);
                }
              }, 200);
            }}
            placeholder="Escriba una etiqueta..."
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          />

          {filteredSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              {filteredSuggestions.map((suggestion, index) => (
                <button
                  key={suggestion}
                  onClick={() => handleAddTag(suggestion)}
                  className={`w-full text-left px-3 py-2 text-sm ${
                    index === selectedSuggestion
                      ? 'bg-primary-50 text-primary-700'
                      : 'hover:bg-gray-50'
                  } transition-colors`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
