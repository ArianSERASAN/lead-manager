import { useState } from 'react';
import { Eye, Pencil } from 'lucide-react';
import { renderMarkdown } from '../../utils/markdown';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  readOnly?: boolean;
  placeholder?: string;
  rows?: number;
}

export function MarkdownEditor({
  value,
  onChange,
  onSave,
  readOnly = false,
  placeholder = 'Escribe aquí...',
  rows = 5,
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<'edit' | 'preview'>(readOnly ? 'preview' : 'edit');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && onSave) {
      e.preventDefault();
      onSave();
    }
  };

  // If read-only and there's content, just show preview
  if (readOnly) {
    if (!value) return <p className="text-sm text-gray-400 italic">{placeholder}</p>;
    return (
      <div
        className="prose-sm text-sm text-gray-700 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
      />
    );
  }

  return (
    <div className="space-y-1">
      {/* Toggle bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => setMode('edit')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${
              mode === 'edit' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Pencil size={11} /> Editar
          </button>
          <button
            type="button"
            onClick={() => setMode('preview')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${
              mode === 'preview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Eye size={11} /> Vista previa
          </button>
        </div>
        {onSave && mode === 'edit' && (
          <span className="text-[10px] text-gray-400">Ctrl+Enter para guardar</span>
        )}
      </div>

      {/* Content */}
      {mode === 'edit' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={rows}
          className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2 resize-y focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none transition-all placeholder-gray-400 font-mono leading-relaxed"
        />
      ) : (
        <div className="min-h-[80px] border border-gray-200 rounded-lg px-3 py-2 bg-gray-50/50">
          {value ? (
            <div
              className="prose-sm text-sm text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
            />
          ) : (
            <p className="text-sm text-gray-400 italic">{placeholder}</p>
          )}
        </div>
      )}
    </div>
  );
}
