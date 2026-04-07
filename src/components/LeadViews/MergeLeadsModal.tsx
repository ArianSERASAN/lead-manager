import { useState, useMemo } from 'react';
import { X, Search, Merge, Loader2, Check } from 'lucide-react';
import { Lead } from '../../types/domain';
import { useLeadStore } from '../../stores/useLeadStore';
import { mergeLeads, computeMergedFields } from '../../services/LeadMergeService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { ScoreBadge } from '../Scoring/ScoreBadge';

interface MergeLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadA: Lead;
  onMerged: () => void;
}

const MERGE_FIELDS = [
  { key: 'name', label: 'Nombre' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Teléfono' },
  { key: 'company', label: 'Empresa' },
  { key: 'apellidos', label: 'Apellidos' },
  { key: 'cargo', label: 'Cargo' },
  { key: 'sector', label: 'Sector' },
  { key: 'localidad', label: 'Localidad' },
  { key: 'direccion', label: 'Dirección' },
  { key: 'tipoInmueble', label: 'Tipo inmueble' },
  { key: 'superficie', label: 'Superficie' },
  { key: 'referenciaCatastral', label: 'Ref. Catastral' },
  { key: 'message', label: 'Mensaje' },
  { key: 'status', label: 'Estado' },
  { key: 'source', label: 'Origen' },
] as const;

export function MergeLeadsModal({ isOpen, onClose, leadA, onMerged }: MergeLeadsModalProps) {
  const { appUser } = useAuth();
  const { addToast } = useToast();
  const leads = useLeadStore((s) => s.leads);

  const [step, setStep] = useState<'search' | 'compare'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [leadB, setLeadB] = useState<Lead | null>(null);
  const [choices, setChoices] = useState<Record<string, 'a' | 'b'>>({});
  const [merging, setMerging] = useState(false);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return leads
      .filter(
        (l) =>
          l.id !== leadA.id &&
          (l.name.toLowerCase().includes(q) ||
            l.email.toLowerCase().includes(q) ||
            (l.company || '').toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [leads, searchQuery, leadA.id]);

  const selectLeadB = (lead: Lead) => {
    setLeadB(lead);
    setStep('compare');
    // Default all choices to 'a' (keep leadA's values)
    const defaults: Record<string, 'a' | 'b'> = {};
    MERGE_FIELDS.forEach(({ key }) => {
      defaults[key] = 'a';
    });
    setChoices(defaults);
  };

  const handleMerge = async () => {
    if (!leadB || !appUser) return;
    setMerging(true);
    try {
      const merged = computeMergedFields(leadA, leadB, choices);
      await mergeLeads(leadA, leadB, merged, appUser.uid, appUser.name);
      addToast({ message: `Leads fusionados correctamente`, type: 'success' });
      onMerged();
      onClose();
    } catch {
      addToast({ message: 'Error al fusionar leads', type: 'error' });
    } finally {
      setMerging(false);
    }
  };

  const getFieldValue = (lead: Lead, key: string): string => {
    const val = (lead as unknown as Record<string, unknown>)[key];
    if (val === null || val === undefined || val === '') return '—';
    return String(val);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Merge size={18} className="text-primary-600" />
            <h2 className="text-lg font-bold text-gray-900">Fusionar leads</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {step === 'search' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Lead principal: <strong>{leadA.name}</strong> ({leadA.email}).
                Busca el lead con el que quieres fusionarlo:
              </p>

              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre, email o empresa..."
                  autoFocus
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none"
                />
              </div>

              <div className="space-y-1">
                {searchResults.map((lead) => (
                  <button
                    key={lead.id}
                    onClick={() => selectLeadB(lead)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {lead.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{lead.name}</p>
                      <p className="text-xs text-gray-400 truncate">{lead.email}</p>
                    </div>
                    <ScoreBadge score={lead.score} size="sm" />
                  </button>
                ))}
                {searchQuery && searchResults.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-6">Sin resultados</p>
                )}
              </div>
            </div>
          )}

          {step === 'compare' && leadB && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Selecciona qué valor mantener de cada campo. Tags, notas, historial y adjuntos se fusionan automáticamente.
              </p>

              {/* Column headers */}
              <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">
                <span>Campo</span>
                <span className="text-center text-emerald-600">Mantener (A)</span>
                <span className="text-center text-blue-600">Fusionar (B)</span>
              </div>

              {/* Field rows */}
              <div className="space-y-1">
                {MERGE_FIELDS.map(({ key, label }) => {
                  const valA = getFieldValue(leadA, key);
                  const valB = getFieldValue(leadB, key);
                  const choice = choices[key] || 'a';

                  if (valA === '—' && valB === '—') return null;

                  return (
                    <div key={key} className="grid grid-cols-[1fr_1fr_1fr] gap-2 items-center py-1.5 px-1 rounded-lg hover:bg-gray-50">
                      <span className="text-xs font-medium text-gray-600">{label}</span>
                      <button
                        onClick={() => setChoices((prev) => ({ ...prev, [key]: 'a' }))}
                        className={`text-xs px-2 py-1.5 rounded-lg text-center truncate transition-colors ${
                          choice === 'a'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold'
                            : 'bg-gray-50 text-gray-500 border border-transparent hover:border-gray-200'
                        }`}
                      >
                        {choice === 'a' && <Check size={10} className="inline mr-1" />}
                        {valA}
                      </button>
                      <button
                        onClick={() => setChoices((prev) => ({ ...prev, [key]: 'b' }))}
                        className={`text-xs px-2 py-1.5 rounded-lg text-center truncate transition-colors ${
                          choice === 'b'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold'
                            : 'bg-gray-50 text-gray-500 border border-transparent hover:border-gray-200'
                        }`}
                      >
                        {choice === 'b' && <Check size={10} className="inline mr-1" />}
                        {valB}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Auto-merged info */}
              <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500 space-y-1">
                <p><strong>Se fusionan automáticamente:</strong></p>
                <p>Tags: {[...new Set([...(leadA.tags || []), ...(leadB.tags || [])])].join(', ') || '—'}</p>
                <p>Notas: {leadA.notes && leadB.notes ? 'Se concatenan ambas' : 'Se mantiene la existente'}</p>
                <p>Adjuntos: Se combinan todos ({(leadA.attachments?.length || 0) + (leadB.attachments?.length || 0)} total)</p>
              </div>

              <button onClick={() => { setStep('search'); setLeadB(null); setSearchQuery(''); }} className="text-sm text-gray-500 hover:text-gray-700">
                ← Cambiar lead B
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'compare' && leadB && (
          <div className="px-5 py-4 border-t border-gray-200 bg-gray-50/50">
            <button
              onClick={handleMerge}
              disabled={merging}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm py-2.5 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {merging ? (
                <><Loader2 size={16} className="animate-spin" /> Fusionando...</>
              ) : (
                <><Merge size={16} /> Fusionar en {leadA.name}</>
              )}
            </button>
            <p className="text-[10px] text-gray-400 text-center mt-2">
              Se eliminará &ldquo;{leadB.name}&rdquo; y sus datos se fusionarán en &ldquo;{leadA.name}&rdquo;.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
