import { useState, useEffect, useCallback } from 'react';
import {
  Mail, MailCheck, Clock, MessageSquareHeart, Send,
  Loader2, Save, Info,
} from 'lucide-react';
import { EmailSequenceConfig } from '../../types/domain';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import * as EmailSeqService from '../../services/EmailSequenceConfigService';

export function EmailSequenceSettings() {
  const { appUser } = useAuth();
  const { addToast } = useToast();
  const [config, setConfig] = useState<EmailSequenceConfig>(EmailSeqService.DEFAULT_EMAIL_SEQUENCE_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const unsub = EmailSeqService.subscribeToEmailSequenceConfig((c) => {
      setConfig(c);
      setLoading(false);
      setHasChanges(false);
    });
    return unsub;
  }, []);

  const update = useCallback((patch: Partial<EmailSequenceConfig>) => {
    setConfig(prev => ({ ...prev, ...patch }));
    setHasChanges(true);
  }, []);

  const handleSave = async () => {
    if (!appUser) return;
    setSaving(true);
    try {
      await EmailSeqService.saveEmailSequenceConfig(config, appUser.uid);
      addToast({ message: 'Configuración de emails guardada', type: 'success' });
      setHasChanges(false);
    } catch {
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
      {/* ─── Master toggle ─── */}
      <div className={`rounded-xl border-2 transition-all ${
        config.enabled ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200 bg-gray-50/50'
      }`}>
        <div className="flex items-center gap-3 p-4">
          <div className={`p-2.5 rounded-xl ${config.enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
            <Send size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className={`text-sm font-bold ${config.enabled ? 'text-gray-900' : 'text-gray-500'}`}>
              Secuencia de Emails Automáticos
            </h4>
            <p className="text-xs text-gray-400">
              {config.enabled
                ? 'Los leads reciben emails automáticos según la secuencia configurada'
                : 'Desactivado — no se envían emails automáticos a los leads'}
            </p>
          </div>
          <button
            onClick={() => update({ enabled: !config.enabled })}
            className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
              config.enabled ? 'bg-emerald-500' : 'bg-gray-300'
            }`}
          >
            <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${
              config.enabled ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>
      </div>

      {/* ─── Individual step cards (only when master is enabled) ─── */}
      {config.enabled && (
        <>
          {/* Info banner */}
          <div className="flex items-start gap-2.5 px-4 py-3 bg-primary-50/80 border border-primary-100 rounded-xl">
            <Info size={16} className="text-primary-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-primary-700 leading-relaxed">
              Los emails se envían automáticamente al lead usando las credenciales de Gmail configuradas. Cada paso puede activarse o desactivarse individualmente.
            </p>
          </div>

          {/* 1. Welcome */}
          <StepCard
            icon={<Mail size={18} />}
            title="Email de Bienvenida"
            description="Se envía al instante cuando un lead entra en el sistema"
            timing="Inmediato"
            enabled={config.welcome.enabled}
            onToggle={(v) => update({ welcome: { ...config.welcome, enabled: v } })}
            subject={config.welcome.subject}
            onSubjectChange={(s) => update({ welcome: { ...config.welcome, subject: s } })}
          />

          {/* 2. Follow-up */}
          <StepCard
            icon={<Clock size={18} />}
            title="Follow-up"
            description="Casos de éxito y propuesta de valor si el lead sigue sin responder"
            timing={`${config.followUp.delayDays} días después`}
            enabled={config.followUp.enabled}
            onToggle={(v) => update({ followUp: { ...config.followUp, enabled: v } })}
            subject={config.followUp.subject}
            onSubjectChange={(s) => update({ followUp: { ...config.followUp, subject: s } })}
          >
            <div className="mt-3">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2">
                Días de espera
              </label>
              <div className="flex items-center gap-3">
                <select
                  value={config.followUp.delayDays}
                  onChange={(e) => update({ followUp: { ...config.followUp, delayDays: +e.target.value } })}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium"
                >
                  {[1, 2, 3, 4, 5, 7].map(d => (
                    <option key={d} value={d}>{d} {d === 1 ? 'día' : 'días'}</option>
                  ))}
                </select>
                <span className="text-xs text-gray-500">desde la creación del lead</span>
              </div>
            </div>
          </StepCard>

          {/* 3. Reminder */}
          <StepCard
            icon={<MessageSquareHeart size={18} />}
            title="Recordatorio Final"
            description="Último intento más directo, mencionando subvenciones y consulta gratuita"
            timing={`${config.reminder.delayDays} días después`}
            enabled={config.reminder.enabled}
            onToggle={(v) => update({ reminder: { ...config.reminder, enabled: v } })}
            subject={config.reminder.subject}
            onSubjectChange={(s) => update({ reminder: { ...config.reminder, subject: s } })}
          >
            <div className="mt-3">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2">
                Días de espera
              </label>
              <div className="flex items-center gap-3">
                <select
                  value={config.reminder.delayDays}
                  onChange={(e) => update({ reminder: { ...config.reminder, delayDays: +e.target.value } })}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium"
                >
                  {[5, 7, 10, 14, 21].map(d => (
                    <option key={d} value={d}>{d} días</option>
                  ))}
                </select>
                <span className="text-xs text-gray-500">desde la creación del lead</span>
              </div>
            </div>
          </StepCard>

          {/* 4. Contacted */}
          <StepCard
            icon={<MailCheck size={18} />}
            title="Email de Contacto Realizado"
            description="Agradecimiento cuando el lead pasa a estado 'Contactado'"
            timing="Al cambiar estado"
            enabled={config.contacted.enabled}
            onToggle={(v) => update({ contacted: { ...config.contacted, enabled: v } })}
            subject={config.contacted.subject}
            onSubjectChange={(s) => update({ contacted: { ...config.contacted, subject: s } })}
          />

          {/* Sender name */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2">
              Nombre del remitente
            </label>
            <input
              type="text"
              value={config.senderName}
              onChange={(e) => update({ senderName: e.target.value })}
              placeholder="SERASAN Engineering"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            <p className="text-[11px] text-gray-400 mt-1.5">
              Aparece como "De: {config.senderName || 'SERASAN Engineering'} &lt;gmail configurado&gt;"
            </p>
          </div>
        </>
      )}

      {/* ─── Save Button ─── */}
      {hasChanges && (
        <div className="sticky bottom-4 z-10">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-600/30 transition-all disabled:opacity-50"
          >
            {saving ? (
              <><Loader2 size={18} className="animate-spin" /> Guardando...</>
            ) : (
              <><Save size={18} /> Guardar Configuración de Emails</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Step Card ────────────────────────────────────────────────────

interface StepCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  timing: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  subject: string;
  onSubjectChange: (subject: string) => void;
  children?: React.ReactNode;
}

function StepCard({ icon, title, description, timing, enabled, onToggle, subject, onSubjectChange, children }: StepCardProps) {
  return (
    <div className={`rounded-xl border transition-all ${
      enabled ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50/50'
    }`}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <div className={`p-2 rounded-lg ${enabled ? 'bg-primary-50 text-primary-600' : 'bg-gray-100 text-gray-400'}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={`text-sm font-bold ${enabled ? 'text-gray-900' : 'text-gray-500'}`}>{title}</h4>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              enabled ? 'bg-primary-50 text-primary-600' : 'bg-gray-100 text-gray-400'
            }`}>
              {timing}
            </span>
          </div>
          <p className="text-xs text-gray-400">{description}</p>
        </div>
        <button
          onClick={() => onToggle(!enabled)}
          className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
            enabled ? 'bg-primary-600' : 'bg-gray-300'
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
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2">
              Asunto del email
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => onSubjectChange(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
