import { Lead } from '../../types/domain';
import { enrichLeadViaCloudFunction, isLeadEnriched } from '../../services/ApolloEnrichmentService';
import { useState } from 'react';
import { Loader2, Sparkles, Building2, Briefcase, MapPin, Linkedin, Globe, Users, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatTimestamp } from '../../utils/format';

interface ApolloEnrichmentPanelProps {
  lead: Lead;
  onEnriched?: () => void;
}

export function ApolloEnrichmentPanel({ lead, onEnriched }: ApolloEnrichmentPanelProps) {
  const [isEnriching, setIsEnriching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enriched = isLeadEnriched(lead);
  const data = lead.enrichment;

  const handleEnrich = async () => {
    setIsEnriching(true);
    setError(null);
    try {
      const result = await enrichLeadViaCloudFunction(lead);
      if (result.success) {
        onEnriched?.();
      } else {
        setError(result.error || 'Error al enriquecer el lead.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setIsEnriching(false);
    }
  };

  // If not enriched yet, show the enrich button
  if (!enriched) {
    return (
      <div className="border border-dashed border-purple-300 bg-purple-50/50 rounded-xl p-4 text-center">
        <Sparkles size={24} className="mx-auto text-purple-500 mb-2" />
        <p className="text-sm font-semibold text-purple-800 mb-1">Enriquecer con Apollo</p>
        <p className="text-xs text-purple-600 mb-3">
          Obtén cargo, empresa, LinkedIn, sector y más datos de este contacto.
        </p>
        {error && (
          <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg p-2 mb-3">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}
        <button
          onClick={handleEnrich}
          disabled={isEnriching}
          className="w-full bg-purple-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
        >
          {isEnriching ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Enriqueciendo...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Enriquecer Lead
            </>
          )}
        </button>
      </div>
    );
  }

  // Show enrichment data
  return (
    <div className="border border-purple-200 bg-purple-50/30 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-green-600" />
          <span className="text-xs font-bold text-purple-800 uppercase tracking-wider">
            Apollo Enrichment
          </span>
        </div>
        {lead.enrichedAt && (
          <span className="text-[10px] text-gray-400">{formatTimestamp(lead.enrichedAt)}</span>
        )}
      </div>

      <div className="space-y-2.5">
        {/* Job Title */}
        {data?.title && (
          <InfoRow icon={<Briefcase size={14} />} label="Cargo" value={data.title} />
        )}

        {/* Seniority */}
        {data?.seniority && (
          <InfoRow
            icon={<Users size={14} />}
            label="Nivel"
            value={formatSeniority(data.seniority)}
          />
        )}

        {/* LinkedIn */}
        {data?.linkedinUrl && (
          <div className="flex items-start gap-2">
            <Linkedin size={14} className="text-gray-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-[10px] text-gray-400 uppercase block">LinkedIn</span>
              <a
                href={data.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary-600 hover:underline break-all"
              >
                Ver perfil
              </a>
            </div>
          </div>
        )}

        {/* Location */}
        {(data?.city || data?.country) && (
          <InfoRow
            icon={<MapPin size={14} />}
            label="Ubicación"
            value={[data.city, data.state, data.country].filter(Boolean).join(', ')}
          />
        )}

        {/* Company Section */}
        {data?.organizationName && (
          <>
            <div className="border-t border-purple-200 my-3" />
            <InfoRow
              icon={<Building2 size={14} />}
              label="Empresa"
              value={data.organizationName}
            />
          </>
        )}

        {data?.organizationIndustry && (
          <InfoRow icon={<Globe size={14} />} label="Sector" value={data.organizationIndustry} />
        )}

        {data?.organizationSize && (
          <InfoRow
            icon={<Users size={14} />}
            label="Empleados"
            value={`~${data.organizationSize.toLocaleString('es-ES')}`}
          />
        )}

        {data?.organizationFoundedYear && (
          <InfoRow
            icon={<Calendar size={14} />}
            label="Fundada"
            value={String(data.organizationFoundedYear)}
          />
        )}

        {data?.organizationWebsite && (
          <div className="flex items-start gap-2">
            <Globe size={14} className="text-gray-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-[10px] text-gray-400 uppercase block">Web</span>
              <a
                href={data.organizationWebsite.startsWith('http') ? data.organizationWebsite : `https://${data.organizationWebsite}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary-600 hover:underline break-all"
              >
                {data.organizationDomain || data.organizationWebsite}
              </a>
            </div>
          </div>
        )}

        {data?.organizationLinkedin && (
          <div className="flex items-start gap-2">
            <Linkedin size={14} className="text-gray-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-[10px] text-gray-400 uppercase block">LinkedIn Empresa</span>
              <a
                href={data.organizationLinkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary-600 hover:underline"
              >
                Ver página
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Re-enrich button */}
      <button
        onClick={handleEnrich}
        disabled={isEnriching}
        className="w-full mt-4 bg-white border border-purple-200 text-purple-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-purple-50 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
      >
        {isEnriching ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Actualizando...
          </>
        ) : (
          <>
            <Sparkles size={14} />
            Re-enriquecer
          </>
        )}
      </button>

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg p-2 mt-2">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

// ─── Helper Components ──────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-gray-400 mt-0.5 shrink-0">{icon}</span>
      <div>
        <span className="text-[10px] text-gray-400 uppercase block">{label}</span>
        <span className="text-sm text-gray-800 font-medium">{value}</span>
      </div>
    </div>
  );
}

function formatSeniority(seniority: string): string {
  const map: Record<string, string> = {
    c_suite: 'C-Suite',
    vp: 'VP',
    director: 'Director',
    manager: 'Manager',
    senior: 'Senior',
    entry: 'Entry Level',
    owner: 'Propietario',
    founder: 'Fundador',
    partner: 'Socio',
  };
  return map[seniority] || seniority;
}
