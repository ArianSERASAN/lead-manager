import { useState, useCallback } from 'react';
import { X, Loader2, Check } from 'lucide-react';
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

interface FormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  source: 'manual' | 'landing' | 'web-download' | 'web-contact';
  message: string;
  notes: string;
}

const INITIAL_FORM: FormData = {
  name: '',
  email: '',
  phone: '',
  company: '',
  source: 'manual',
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
        email: formData.email,
        phone: formData.phone || undefined,
        company: formData.company || undefined,
        source: formData.source,
        message: formData.message || undefined,
        notes: formData.notes || undefined,
        tags: [],
        status: 'nuevo' as LeadStatus
      });

      // Record activity
      if (userId && userName) {
        const colName = LeadService.getCollectionName(formData.source);
        await ActivityService.recordActivity(
          leadId,
          colName,
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
        email: formData.email,
        phone: formData.phone || '',
        company: formData.company || '',
        source: formData.source,
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

  const handleChange = useCallback((field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    }
  }, [errors]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div role="dialog" aria-modal="true" aria-labelledby="create-lead-title" className="relative bg-white/95 backdrop-blur-xl rounded-[40px] shadow-2xl w-full max-w-md p-8 border border-white/20">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Cerrar formulario"
          className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={24} />
        </button>

        {/* Header */}
        <div className="mb-8">
          <h2 id="create-lead-title" className="text-3xl font-black text-gray-900 mb-2">Nuevo Lead</h2>
          <p className="text-sm text-gray-500">Completa los campos para crear un nuevo lead</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
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
              placeholder="Nombre completo"
              className={`w-full px-4 py-3 rounded-xl border-2 transition-all focus:outline-none ${
                errors.name
                  ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-500'
                  : 'border-gray-200 bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500'
              }`}
            />
            {errors.name && (
              <p id="lead-name-error" role="alert" className="text-xs text-red-600 mt-1">{errors.name}</p>
            )}
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
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="correo@ejemplo.com"
              className={`w-full px-4 py-3 rounded-xl border-2 transition-all focus:outline-none ${
                errors.email
                  ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-500'
                  : 'border-gray-200 bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500'
              }`}
            />
            {errors.email && (
              <p id="lead-email-error" role="alert" className="text-xs text-red-600 mt-1">{errors.email}</p>
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
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all focus:outline-none"
            />
          </div>

          {/* Company */}
          <div>
            <label htmlFor="lead-company" className="block text-sm font-bold text-gray-700 mb-2">
              Empresa
            </label>
            <input
              id="lead-company"
              type="text"
              value={formData.company}
              onChange={(e) => handleChange('company', e.target.value)}
              placeholder="Nombre de la empresa"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all focus:outline-none"
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
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all focus:outline-none font-semibold text-gray-700"
            >
              {SOURCE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

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
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all focus:outline-none resize-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="lead-notes" className="block text-sm font-bold text-gray-700 mb-2">
              Notas
            </label>
            <textarea
              id="lead-notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Notas internas (opcional)"
              rows={2}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all focus:outline-none resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold hover:shadow-lg hover:shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
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
        </form>
      </div>
    </div>
  );
}
