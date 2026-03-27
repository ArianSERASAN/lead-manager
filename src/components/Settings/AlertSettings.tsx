import { useState, useEffect, useCallback } from 'react';
import {
  Bell, BellOff, Mail, Flame, Clock, AlertCircle, CalendarClock,
  Plus, X, Loader2, Save, Check,
} from 'lucide-react';
import { AlertConfig, LeadSource } from '../../types/domain';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import * as AlertConfigService from '../../services/AlertConfigService';

const SOURCE_LABELS: Record<LeadSource, string> = {
  landing: 'Landing Page',
  'web-download': 'Descarga PDF',
  'web-contact': 'Formulario Web',
  manual: 'Manual',
};

export function AlertSettings() {
  const { appUser } = useAuth();
  const { addToast } = useToast();
  const [config, setConfig] = useState<AlertConfig>(AlertConfigService.DEFAULT_ALERT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const unsub = AlertConfigService.subscribeToAlertConfig((c) => {
      setConfig(c);
      setLoading(false);
      setHasChanges(false);
    });
    return unsub;
  }, []);

  const update = useCallback((patch: Partial<AlertConfig>) => {
    setConfig(prev => ({ ...prev, ...patch }));
    setHasChanges(true);
  }, []);

  const handleSave = async () => {
    if (!appUser) return;
    setSaving(true);
    try {
      await AlertConfigService.saveAlertConfig(config, appUser.uid);
      addToast({ message: 'Configuración de alertas guardada', type: 'success' });
      setHasChanges(false);
    } catch (err) {
      addToast({ message: 'Error al guardar configuración', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ─── 1. Nuevo Lead ─── */}
      <AlertCard
        icon={<Mail size={18} />}
        title="Nuevo Lead"
        description="Email al instante cuando entra un lead nuevo"
        enabled={config.newLead.enabled}
        onToggle={(v) => update({ newLead: { ...config.newLead, enabled: v } })}
      >
        <RecipientList
          recipients={config.newLead.recipients}
          onChange={(r) => { update({ newLead: { ...config.newLead, recipients: r } }); }}
        />
        <div className="mt-3">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2">Orígenes que disparan la alerta</label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(SOURCE_LABELS) as LeadSource[]).map(src => {
              const active = config.newLead.sources.includes(src);
              return (
                <button
                  key={src}
                  type="button"
                  onClick={() => {
                    const sources = active
                      ? config.newLead.sources.filter(s => s !== src)
                      : [...config.newLead.sources, src];
                    update({ newLead: { ...config.newLead, sources } });
                  }}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
                    active
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {SOURCE_LABELS[src]}
                </button>
              );
            })}
          </div>
        </div>
      </AlertCard>

      {/* ─── 2. Lead Caliente ─── */}
      <AlertCard
        icon={<Flame size={18} />}
        title="Lead Caliente"
        description="Aviso cuando un lead supera el umbral de score"
        enabled={config.hotLead.enabled}
        onToggle={(v) => update({ hotLead: { ...config.hotLead, enabled: v } })}
      >
        <RecipientList
          recipients={config.hotLead.recipients}
          onChange={(r) => update({ hotLead: { ...config.hotLead, recipients: r } })}
        />
        <div className="mt-3">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2">Umbral de Score</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={30}
              max={95}
              step={5}
              value={config.hotLead.scoreThreshold}
              onChange={(e) => update({ hotLead: { ...config.hotLead, scoreThreshold: +e.target.value } })}
              className="flex-1 accent-orange-500"
            />
            <span className="text-sm font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg min-w-[48px] text-center">
              {config.hotLead.scoreThreshold}
            </span>
          </div>
        </div>
      </AlertCard>

      {/* ─── 3. Lead Sin Atender ─── */}
      <AlertCard
        icon={<Clock size={18} />}
        title="Lead Sin Atender"
        description="Recordatorio cuando un lead lleva demasiado tiempo en 'Nuevo'"
        enabled={config.unattended.enabled}
        onToggle={(v) => update({ unattended: { ...config.unattended, enabled: v } })}
      >
        <RecipientList
          recipients={config.unattended.recipients}
          onChange={(r) => update({ unattended: { ...config.unattended, recipients: r } })}
        />
        <div className="mt-3">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2">Horas sin gestionar</label>
          <div className="flex items-center gap-3">
            <select
              value={config.unattended.hoursThreshold}
              onChange={(e) => update({ unattended: { ...config.unattended, hoursThreshold: +e.target.value } })}
              className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium"
            >
              {[2, 4, 6, 8, 12, 24, 48, 72].map(h => (
                <option key={h} value={h}>{h}h</option>
              ))}
            </select>
            <span className="text-xs text-gray-500">desde que llegó el lead</span>
          </div>
        </div>
      </AlertCard>

      {/* ─── 4. Lead Estancado ─── */}
      <AlertCard
        icon={<AlertCircle size={18} />}
        title="Lead Estancado"
        description="Aviso cuando un lead en progreso no tiene actividad"
        enabled={config.stale.enabled}
        onToggle={(v) => update({ stale: { ...config.stale, enabled: v } })}
      >
        <RecipientList
          recipients={config.stale.recipients}
          onChange={(r) => update({ stale: { ...config.stale, recipients: r } })}
        />
        <div className="mt-3">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2">Días sin actividad</label>
          <div className="flex items-center gap-3">
            <select
              value={config.stale.daysThreshold}
              onChange={(e) => update({ stale: { ...config.stale, daysThreshold: +e.target.value } })}
              className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium"
            >
              {[3, 5, 7, 10, 14, 21, 30].map(d => (
                <option key={d} value={d}>{d} días</option>
              ))}
            </select>
            <span className="text-xs text-gray-500">en estado Contactado o En Progreso</span>
          </div>
        </div>
      </AlertCard>

      {/* ─── 5. Resumen Periódico ─── */}
      <AlertCard
        icon={<CalendarClock size={18} />}
        title="Resumen Periódico"
        description="Email con métricas, nuevos leads y pendientes"
        enabled={config.digest.enabled}
        onToggle={(v) => update({ digest: { ...config.digest, enabled: v } })}
      >
        <RecipientList
          recipients={config.digest.recipients}
          onChange={(r) => update({ digest: { ...config.digest, recipients: r } })}
        />
        <div className="mt-3">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2">Frecuencia</label>
          <div className="flex gap-2">
            {(['daily', 'weekly'] as const).map(freq => (
              <button
                key={freq}
                type="button"
                onClick={() => update({ digest: { ...config.digest, frequency: freq } })}
                className={`text-xs font-medium px-4 py-2 rounded-lg border transition-all ${
                  config.digest.frequency === freq
                    ? 'bg-purple-50 border-purple-300 text-purple-700'
                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {freq === 'daily' ? 'Diario (9:00)' : 'Semanal (Lunes 9:00)'}
              </button>
            ))}
          </div>
        </div>
      </AlertCard>

      {/* ─── Save Button ─── */}
      {hasChanges && (
        <div className="sticky bottom-4 z-10">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50"
          >
            {saving ? (
              <><Loader2 size={18} className="animate-spin" /> Guardando...</>
            ) : (
              <><Save size={18} /> Guardar Configuración de Alertas</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Alert Card wrapper ───────────────────────────────────────────

interface AlertCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  children: React.ReactNode;
}

function AlertCard({ icon, title, description, enabled, onToggle, children }: AlertCardProps) {
  return (
    <div className={`rounded-xl border transition-all ${
      enabled ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50/50'
    }`}>
      {/* Header — always visible */}
      <div className="flex items-center gap-3 p-4">
        <div className={`p-2 rounded-lg ${enabled ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-bold ${enabled ? 'text-gray-900' : 'text-gray-500'}`}>{title}</h4>
          <p className="text-xs text-gray-400">{description}</p>
        </div>
        <button
          onClick={() => onToggle(!enabled)}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            enabled ? 'bg-blue-600' : 'bg-gray-300'
          }`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`} />
        </button>
      </div>

      {/* Config — only when enabled */}
      {enabled && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-100 mt-0">
          <div className="pt-3">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Recipient list (email chips + input) ─────────────────────────

function RecipientList({ recipients, onChange }: { recipients: string[]; onChange: (r: string[]) => void }) {
  const [input, setInput] = useState('');

  const addEmail = () => {
    const email = input.trim().toLowerCase();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    if (recipients.includes(email)) return;
    onChange([...recipients, email]);
    setInput('');
  };

  const removeEmail = (email: string) => {
    onChange(recipients.filter(r => r !== email));
  };

  return (
    <div>
      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2">Destinatarios</label>
      {recipients.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {recipients.map(email => (
            <span
              key={email}
              className="inline-flex items-center gap-1 text-xs font-medium bg-blue-50 text-blue-700 pl-2.5 pr-1 py-1 rounded-lg"
            >
              {email}
              <button
                onClick={() => removeEmail(email)}
                className="p-0.5 rounded hover:bg-blue-200 transition-colors"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="email"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEmail(); } }}
          placeholder="email@ejemplo.com"
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={addEmail}
          type="button"
          className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
