import { useState, useRef } from 'react';
import { Paperclip, Trash2, Download, Loader2 } from 'lucide-react';
import { Lead } from '../../types/domain';
import { uploadAttachment, deleteAttachment, formatFileSize } from '../../services/StorageService';

interface AttachmentListProps {
  lead: Lead;
  canEdit?: boolean;
  userId?: string;
  userName?: string;
}

export function AttachmentList({ lead, canEdit = false, userId, userName }: AttachmentListProps) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const attachments = lead.attachments || [];

  const handleUpload = async (file: File) => {
    if (!userId || !userName) return;
    setUploading(true);
    try {
      await uploadAttachment(lead, file, userId, userName);
    } catch (err) {
      console.error('Error al subir archivo:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (attachment: typeof attachments[0]) => {
    try {
      await deleteAttachment(lead, attachment);
    } catch (err) {
      console.error('Error al eliminar archivo:', err);
    }
  };

  if (attachments.length === 0 && !canEdit) return null;

  return (
    <div className="bg-amber-50/60 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Adjuntos</p>
        {canEdit && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700 transition-colors"
          >
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <Paperclip size={12} />}
            {uploading ? 'Subiendo...' : 'Adjuntar'}
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = '';
          }}
        />
      </div>

      {attachments.length > 0 && (
        <div className="space-y-1.5">
          {attachments.map((att, i) => (
            <div key={i} className="flex items-center gap-2 bg-white/70 rounded-lg px-2.5 py-1.5 group">
              <Paperclip size={12} className="text-amber-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <a
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-gray-700 hover:text-primary-600 truncate block"
                >
                  {att.name}
                </a>
                <p className="text-[10px] text-gray-400">
                  {formatFileSize(att.size)}
                  {att.uploadedByName && ` · ${att.uploadedByName}`}
                </p>
              </div>
              <a
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-gray-500 shrink-0"
              >
                <Download size={12} />
              </a>
              {canEdit && (
                <button
                  onClick={() => handleDelete(att)}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-opacity shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {attachments.length === 0 && canEdit && (
        <p className="text-xs text-amber-400 text-center py-2">Arrastra archivos o haz clic en "Adjuntar"</p>
      )}
    </div>
  );
}
