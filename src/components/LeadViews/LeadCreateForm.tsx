import { useState, useCallback } from 'react';
import { X, Loader2, Check, AlertTriangle } from 'lucide-react';
import { Lead, LeadStatus } from '../../types/domain';
import * as LeadService from '../../services/LeadService';
import * as ActivityService from '../../services/ActivityService';

interface LeadCreateFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (lead: Lead) => void;
  onError: (message: string) => void;
  userId?: string;
  userName?: string;
}

const SERVICIOS_OPTIONS = ['Ingeniería Instalaciones', 'Consultoría Energética', 'Innovación 4.0'];
const TIPO_INMUEBLE_OPTIONS = ['Oficinas', 'Nave Industrial', 'Hoteles', 'Residencias', 'Local Comercial', 'Otro'];

interface FormData {
  name: string;
  apellidos: string;
  email: string;
  phone: string;
  company: string;
  cargo: string;
  sector: string;
  source: 'manual' | 'landing' | 'web-download' | 'web-contact';
  servicios: string[];
  tipoInmueble: string;
  superficie: string;
  localidad: string;
  direccion: string;
  referenciaCatastral: string;
  message: string;
  notes: string;
}

const INITIAL_FORM: FormData = {
  name: '',
  apellidos: '',
  email: '',
  phone: '',
  company: '',
  cargo: '',
  sector: '',
  source: 'manual',
  servicios: [],
  tipoInmueble: '',
  superficie: '',
  localidad: '',
  direccion: '',
  referenciaCatastral: '',
  message: '',
  notes: ''
};

const SOURCE_OPTIONS = [
  { value: 'manual' as const, label: 'Manual' },
  { value: 'landing' as const, label: 'Landing Page' },
  { value: 'web-download' as const, label: 'Descarga PDF' },
  { value: 'web-contact' as const, label: 'Formulario Web' }
];

export function LeadCreateForm({
  isOpen,
  onClose,
  onSuccess,
  onError,
  userId,
  userName
}: LeadCreateFormProps) {
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<{ name: string; status: string } | null>(null);

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es obligatorio';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El email es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El email no es válido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // Create the lead
      const leadId = await LeadService.createLead({
        name: formData.name,
        apellidos: formData.apellidos || undefined,
        email: formData.email,
        phone: formData.phone || undefined,
        company: formData.company || undefined,
        cargo: formData.cargo || undefined,
        sector: formData.sector || undefined,
        source: formData.source,
        servicios: formData.servicios.length > 0 ? formData.servicios : undefined,
        tipoInmueble: formData.tipoInmueble || undefined,
        superficie: formData.superficie || undefined,
        localidad: formData.localidad || undefined,
        direccion: formData.direccion || undefined,
        referenciaCatastral: formData.referenciaCatastral || undefined,
        message: formData.message || undefined,
        notes: formData.notes || undefined,
        tags: [],
        status: 'nuevo' as LeadStatus
      });

      // Record activity
      if (userId && userName) {
        await ActivityService.recordActivity(
          leadId,
          'leads',
          userId,
          userName,
          'created',
          { description: `Lead creado manualmente por ${userName}` }
        );
      }

      // Reset form
      setFormData(INITIAL_FORM);
      setErrors({});

      // Notify success
      onSuccess({
        id: leadId,
        name: formData.name,
        apellidos: formData.apellidos || '',
        email: formData.email,
        phone: formData.phone || '',
        company: formData.company || '',
        cargo: formData.cargo || '',
        sector: formData.sector || '',
        source: formData.source,
        servicios: formData.servicios,
        tipoInmueble: formData.tipoInmueble || '',
        superficie: formData.superficie || '',
        localidad: formData.localidad || '',
        direccion: formData.direccion || '',
        referenciaCatastral: formData.referenciaCatastral || '',
        status: 'nuevo',
        tags: [],
        score: 0,
        createdAt: new Date(),
        message: formData.message || '',
        notes: formData.notes || '',
        customFields: {}
      } as Lead);

      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al crear el lead';
      onError(message);
    } finally {
      setIsLoading(false);
    }
  }, [formData, validateForm, userId, userName, onSuccess, onError, onClose]);

  const handleChange = useCallback((field: keyof FormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as string]) {
      setErrors(prev => {
        const { [field as string]: _, ...rest } = prev;
        return rest;
      });
    }
  }, [errors]);

  const handleServicioToggle = useCallback((servicio: string) => {
    setFormData(prev => ({
      ...prev,
      servicios: prev.servicios.includes(servicio)
        ? prev.servicios.filter(s => s !== servicio)
        : [...prev.servicios, servicio]
    }));
  }, []);

  const handleEmailBlur = async () => {
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setDuplicateWarning(null);
      return;
    }
    try {
      const existing = await LeadService.checkDuplicateEmail(formData.email);
      setDuplicateWarning(existing);
    } catch {
      setDuplicateWarning(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm modal-backdrop-enter"
        onClick={onClose}
      />

      {/* Modal */}
      <div role="dialog" aria-modal="true" aria-labelledby="create-lead-title" className="relative bg-white/95 backdrop-blur-xl rounded-t-2xl sm:rounded-[40px] shadow-2xl w-full max-w-md max-h-[92vh] sm:max-h-[90vh] flex flex-col border border-white/20 modal-enter">
        {/* Header (fixed) */}
        <div className="px-8 pt-8 pb-4 shrink-0">
          <button
            onClick={onClose}
            aria-label="Cerrar formulario"
            className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
          <h2 id="create-lead-title" className="text-3xl font-black text-gray-900 mb-1">Nuevo Lead</h2>
          <p className="text-sm text-gray-500">Completa los campos para crear un nuevo lead</p>
        </div>

        {/* Scrollable form area */}
        <div className="overflow-y-auto px-8 pb-2 flex-1">
          <form id="create-lead-form" onSubmit={handleSubmit} className="space-y-5 py-2">
            {/* ── Datos personales ── */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label htmlFor="lead-name" className="block text-sm font-bold text-gray-700 mb-2">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  id="lead-name"
                  type="text"
                  required
                  aria-required="true"
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? 'lead-name-error' : undefined}
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Nombre"
                  className={`w-full px-4 py-3 rounded-xl border-2 transition-colors duration-150 focus:outline-none ${
                    errors.name
                      ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-500'
                      : 'border-gray-200 bg-gray-50 focus:border-primary-500 focus:ring-2 focus:ring-primary-500'
                  }`}
                />
                {errors.name && (
                  <p id="lead-name-error" role="alert" className="text-xs text-red-600 mt-1">{errors.name}</p>
                )}
              </div>
              <div className="flex-1">
                <label htmlFor="lead-apellidos" className="block text-sm font-bold text-gray-700 mb-2">
                  Apellidos
                </label>
                <input
                  id="lead-apellidos"
                  type="text"
                  value={formData.apellidos}
                  onChange={(e) => handleChange('apellidos', e.target.value)}
                  placeholder="Apellidos"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 transition-colors duration-150 focus:outline-none"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="lead-email" className="block text-sm font-bold text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="lead-email"
                type="email"
                required
                aria-required="true"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'lead-email-error' : undefined}
                value={formData.email}
                onChange={(e) => { handleChange('email', e.target.value); setDuplicateWarning(null); }}
                onBlur={handleEmailBlur}
                placeholder="correo@ejemplo.com"
                className={`w-full px-4 py-3 rounded-xl border-2 transition-colors duration-150 focus:outline-none ${
                  errors.email
                    ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-500'
                    : 'border-gray-200 bg-gray-50 focus:border-primary-500 focus:ring-2 focus:ring-primary-500'
                }`}
              />
              {errors.email && (
                <p id="lead-email-error" role="alert" className="text-xs text-red-600 mt-1">{errors.email}</p>
              )}
              {duplicateWarning && (
                <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg mt-1">
                  <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700">
                    Ya existe un lead con este email: <span className="font-bold">{duplicateWarning.name}</span> ({duplicateWarning.status})
                  </p>
                </div>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="lead-phone" className="block text-sm font-bold text-gray-700 mb-2">
                Teléfono
              </label>
              <input
                id="lead-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+34 600 000 000"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 transition-colors duration-150 focus:outline-none"
              />
            </div>

            {/* Company + Cargo */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label htmlFor="lead-company" className="block text-sm font-bold text-gray-700 mb-2">
                  Empresa
                </label>
                <input
                  id="lead-company"
                  type="text"
                  value={formData.company}
                  onChange={(e) => handleChange('company', e.target.value)}
                  placeholder="Nombre empresa"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 transition-colors duration-150 focus:outline-none"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="lead-cargo" className="block text-sm font-bold text-gray-700 mb-2">
                  Cargo
                </label>
                <input
                  id="lead-cargo"
                  type="text"
                  value={formData.cargo}
                  onChange={(e) => handleChange('cargo', e.target.value)}
                  placeholder="Cargo"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 transition-colors duration-150 focus:outline-none"
                />
              </div>
            </div>

            {/* Sector */}
            <div>
              <label htmlFor="lead-sector" className="block text-sm font-bold text-gray-700 mb-2">
                Sector
              </label>
              <input
                id="lead-sector"
                type="text"
                value={formData.sector}
                onChange={(e) => handleChange('sector', e.target.value)}
                placeholder="Sector de la empresa"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 transition-colors duration-150 focus:outline-none"
              />
            </div>

            {/* Source */}
            <div>
              <label htmlFor="lead-source" className="block text-sm font-bold text-gray-700 mb-2">
                Origen
              </label>
              <select
                id="lead-source"
                value={formData.source}
                onChange={(e) => handleChange('source', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 transition-colors duration-150 focus:outline-none font-semibold text-gray-700"
              >
                {SOURCE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Servicios de interés */}
            <div>
              <p className="block text-sm font-bold text-gray-700 mb-2">Servicios de interés</p>
              <div className="space-y-2">
                {SERVICIOS_OPTIONS.map(servicio => (
                  <label key={servicio} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formData.servicios.includes(servicio)}
                      onChange={() => handleServicioToggle(servicio)}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">{servicio}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* ── Datos del inmueble ── */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Datos del inmueble (opcional)</p>
              <div className="space-y-4">
                {/* Tipo inmueble */}
                <div>
                  <label htmlFor="lead-tipo-inmueble" className="block text-sm font-bold text-gray-700 mb-2">
                    Tipo de inmueble
                  </label>
                  <select
                    id="lead-tipo-inmueble"
                    value={formData.tipoInmueble}
                    onChange={(e) => handleChange('tipoInmueble', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 transition-colors duration-150 focus:outline-none text-gray-700"
                  >
                    <option value="">Seleccionar tipo...</option>
                    {TIPO_INMUEBLE_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                {/* Superficie + Localidad */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label htmlFor="lead-superficie" className="block text-sm font-bold text-gray-700 mb-2">
                      Superficie (m²)
                    </label>
                    <input
                      id="lead-superficie"
                      type="text"
                      value={formData.superficie}
                      onChange={(e) => handleChange('superficie', e.target.value)}
                      placeholder="Ej: 500"
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 transition-colors duration-150 focus:outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label htmlFor="lead-localidad" className="block text-sm font-bold text-gray-700 mb-2">
                      Localidad / CP
                    </label>
                    <input
                      id="lead-localidad"
                      type="text"
                      value={formData.localidad}
                      onChange={(e) => handleChange('localidad', e.target.value)}
                      placeholder="Ciudad o CP"
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 transition-colors duration-150 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Dirección */}
                <div>
                  <label htmlFor="lead-direccion" className="block text-sm font-bold text-gray-700 mb-2">
                    Dirección
                  </label>
                  <input
                    id="lead-direccion"
                    type="text"
                    value={formData.direccion}
                    onChange={(e) => handleChange('direccion', e.target.value)}
                    placeholder="Dirección del edificio"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 transition-colors duration-150 focus:outline-none"
                  />
                </div>

                {/* Referencia Catastral */}
                <div>
                  <label htmlFor="lead-ref-catastral" className="block text-sm font-bold text-gray-700 mb-2">
                    Referencia Catastral
                  </label>
                  <input
                    id="lead-ref-catastral"
                    type="text"
                    value={formData.referenciaCatastral}
                    onChange={(e) => handleChange('referenciaCatastral', e.target.value)}
                    placeholder="Ref. catastral (opcional)"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 transition-colors duration-150 focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            {/* ── Mensaje y notas ── */}
            <div className="border-t border-gray-100 pt-4 space-y-4">
              {/* Message */}
              <div>
                <label htmlFor="lead-message" className="block text-sm font-bold text-gray-700 mb-2">
                  Mensaje
                </label>
                <textarea
                  id="lead-message"
                  value={formData.message}
                  onChange={(e) => handleChange('message', e.target.value)}
                  placeholder="Mensaje del lead (opcional)"
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 transition-colors duration-150 focus:outline-none resize-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="lead-notes" className="block text-sm font-bold text-gray-700 mb-2">
                  Notas internas
                </label>
                <textarea
                  id="lead-notes"
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Notas internas (opcional)"
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 transition-colors duration-150 focus:outline-none resize-none"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Buttons (fixed at bottom) */}
        <div className="px-8 py-6 shrink-0 border-t border-gray-100">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors duration-150 btn-press"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="create-lead-form"
              disabled={isLoading}
              className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white font-bold hover:shadow-lg hover:shadow-primary-600/30 transition-shadow duration-200 btn-press disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Creando...</span>
                </>
              ) : (
                <>
                  <Check size={18} />
                  <span>Crear Lead</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
