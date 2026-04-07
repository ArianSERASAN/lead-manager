import { useState } from 'react';
import { Send, X, Loader2 } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';

interface EmailComposerProps {
  leadEmail: string;
  leadId: string;
  leadName: string;
  onSent: () => void;
  onCancel: () => void;
}

export function EmailComposer({ leadEmail, leadId, leadName, onSent, onCancel }: EmailComposerProps) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      setError('Asunto y mensaje son obligatorios');
      return;
    }
    setSending(true);
    setError('');
    try {
      const functions = getFunctions(undefined, 'europe-west1');
      const sendEmail = httpsCallable(functions, 'sendLeadEmail');
      await sendEmail({ to: leadEmail, subject, body, leadId });
      onSent();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al enviar email';
      setError(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 animate-fade-in shadow-sm">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Enviar email</h4>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1">
          <X size={14} />
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
          <span className="font-medium">Para:</span>
          <span className="text-gray-700">{leadName} &lt;{leadEmail}&gt;</span>
        </div>

        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Asunto"
          className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          disabled={sending}
        />

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Escribe tu mensaje..."
          rows={4}
          className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
          disabled={sending}
        />
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">{error}</p>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onCancel}
          disabled={sending}
          className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSend}
          disabled={sending || !subject.trim() || !body.trim()}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          Enviar
        </button>
      </div>
    </div>
  );
}
