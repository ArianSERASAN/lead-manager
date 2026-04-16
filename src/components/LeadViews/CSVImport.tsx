import { useState, useRef, useCallback, type MouseEvent } from 'react';
import {
  X, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Download,
  Loader2, ChevronDown, ChevronRight, Tag,
} from 'lucide-react';
import {
  parseFile,
  autoMapHeaders,
  mapRow,
  validateRow,
  importLeads,
  buildMissingFieldDefinitions,
  STANDARD_FIELD_LABELS,
  checkDuplicatesInBatch,
  downloadOfficialImportTemplate,
  generateSlug,
  getOfficialImportColumn,
  isOfficialCustomFieldName,
  type DuplicateMatch,
  type OfficialImportColumn,
} from '../../services/CSVImportService';
import { saveFieldSchema } from '../../services/FieldSchemaService';
import { useFieldSchema } from '../../hooks/leads/useFieldSchema';
import type { FieldDefinition } from '../../types/domain';

interface CSVImportProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
  userId?: string;
  userName?: string;
}

type Step = 'upload' | 'review' | 'importing' | 'results';

function getOfficialDestinationLabel(column: OfficialImportColumn): string {
  if (column.leadField && column.customField) {
    return `${STANDARD_FIELD_LABELS[column.leadField] || column.leadField} + campo oficial`;
  }
  if (column.leadField) {
    return STANDARD_FIELD_LABELS[column.leadField] || column.leadField;
  }
  return 'Campo oficial';
}

export function CSVImport({ isOpen, onClose, onSuccess, userId, userName }: CSVImportProps) {
  const { fields: existingSchema } = useFieldSchema();

  const [step, setStep] = useState<Step>('upload');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [autoMapping, setAutoMapping] = useState<Record<string, string>>({});
  const [columnSections, setColumnSections] = useState<Record<string, string>>({});
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importResult, setImportResult] = useState({ imported: 0, errors: 0 });
  const [showAutoMapped, setShowAutoMapped] = useState(false);
  const [showUnknownFields, setShowUnknownFields] = useState(false);
  const [duplicates, setDuplicates] = useState<Map<string, DuplicateMatch>>(new Map());
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Derived state ──────────────────────────────────────────────────────────

  const previewRows = rows.map((row) => {
    const lead = mapRow(row, autoMapping);
    const errors = validateRow(lead);
    return { lead, errors };
  });
  const validPreviewLeads = previewRows
    .filter(({ errors }) => errors.length === 0)
    .map(({ lead }) => lead);
  const validCount = validPreviewLeads.length;
  const invalidCount = rows.length - validCount;
  const duplicatePreviewCount = validPreviewLeads.filter(
    (lead) => lead.email && duplicates.has(lead.email.toLowerCase().trim())
  ).length;
  const finalImportCount = skipDuplicates ? validCount - duplicatePreviewCount : validCount;

  const officialEntries = headers
    .map((header) => ({ header, column: getOfficialImportColumn(header) }))
    .filter((entry): entry is { header: string; column: OfficialImportColumn } => Boolean(entry.column))
    .sort((a, b) => a.column.order - b.column.order);

  const officialEntriesBySection: Record<string, { header: string; column: OfficialImportColumn }[]> = {};
  for (const entry of officialEntries) {
    if (!officialEntriesBySection[entry.column.section]) officialEntriesBySection[entry.column.section] = [];
    officialEntriesBySection[entry.column.section].push(entry);
  }

  // Auto-mapped generic columns (map to a standard lead field but are not part of the official template)
  const autoMappedEntries = headers.filter((h) => autoMapping[h] && !getOfficialImportColumn(h));

  // Columns that will become new custom fields (not mapped, not already in schema)
  const existingSlugs = new Set(existingSchema.map((f) => f.name));
  const officialFieldNames = new Set(
    officialEntries
      .map(({ column }) => column.customField)
      .filter((value): value is string => Boolean(value))
  );

  const officialMissingFieldEntries = officialEntries.filter(
    ({ column }) => column.customField && !existingSlugs.has(column.customField)
  );

  const officialExistingFieldEntries = officialEntries.filter(
    ({ column }) => column.customField && existingSlugs.has(column.customField)
  );

  const newFieldHeaders = headers.filter((h) => {
    if (getOfficialImportColumn(h)) return false;
    if (autoMapping[h]) return false; // mapped to standard field
    const slug = generateSlug(h);
    return slug && !existingSlugs.has(slug);
  });

  // Group new fields by section
  const newFieldsBySection: Record<string, string[]> = {};
  for (const h of newFieldHeaders) {
    const rawSection = columnSections[h] || '';
    const normalizedSection = rawSection.replace(/^[A-Z]\.\s+/, '').trim();
    const sectionLabel = normalizedSection || 'Sin sección';
    const section = sectionLabel;
    if (!newFieldsBySection[section]) newFieldsBySection[section] = [];
    newFieldsBySection[section].push(h);
  }

  // Already-in-schema custom fields (not shown as "new")
  const existingCustomHeaders = headers.filter((h) => {
    if (getOfficialImportColumn(h)) return false;
    if (autoMapping[h]) return false;
    const slug = generateSlug(h);
    return slug && !officialFieldNames.has(slug) && existingSlugs.has(slug);
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleFile = useCallback(async (file: File) => {
    const result = await parseFile(file);
    setHeaders(result.headers);
    setRows(result.rows);
    setParseErrors(result.errors);
    const mapping = autoMapHeaders(result.headers);
    setAutoMapping(mapping);
    setColumnSections(result.columnSections);
    setShowUnknownFields(false);
    setStep('review');

    // Check duplicates in background
    setCheckingDuplicates(true);
    try {
      const emails = result.rows
        .map((row) => {
          const emailHeader = Object.keys(mapping).find((h) => mapping[h] === 'email');
          return emailHeader ? row[emailHeader] : '';
        })
        .filter(Boolean);
      const dupes = await checkDuplicatesInBatch(emails);
      setDuplicates(dupes);
    } catch {
      // Non-blocking — continue without duplicate info
    } finally {
      setCheckingDuplicates(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (
      file &&
      (file.name.endsWith('.csv') ||
        file.name.endsWith('.xlsx') ||
        file.name.endsWith('.xls') ||
        file.type === 'text/csv')
    ) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleImport = async () => {
    if (!userId || !userName) return;
    setStep('importing');

    // 1. Only keep official fields in schema (unknown columns stay as ad-hoc lead data)
    const candidateFieldDefs: FieldDefinition[] = buildMissingFieldDefinitions(
      headers,
      autoMapping,
      columnSections,
      existingSchema,
      userId
    );
    const newOfficialFieldDefs = candidateFieldDefs.filter((field) => isOfficialCustomFieldName(field.name));
    const normalizedExistingSchema = existingSchema.map((field) => (
      isOfficialCustomFieldName(field.name) && !field.official
        ? { ...field, official: true }
        : field
    ));
    const schemaNeedsNormalization = normalizedExistingSchema.some((field, index) => field !== existingSchema[index]);

    if (schemaNeedsNormalization || newOfficialFieldDefs.length > 0) {
      await saveFieldSchema([...normalizedExistingSchema, ...newOfficialFieldDefs]);
    }

    // 2. Map, validate, and optionally skip duplicates
    let mappedLeads = [...validPreviewLeads];

    if (skipDuplicates && duplicates.size > 0) {
      mappedLeads = mappedLeads.filter(
        (lead) => !lead.email || !duplicates.has(lead.email.toLowerCase().trim())
      );
    }

    // 3. Import to Firestore
    const result = await importLeads(mappedLeads, userId, userName);
    setImportResult({
      imported: result.imported,
      errors: rows.length - mappedLeads.length + result.errors,
    });
    setStep('results');
  };

  const handleClose = () => {
    setStep('upload');
    setHeaders([]);
    setRows([]);
    setAutoMapping({});
    setColumnSections({});
    setParseErrors([]);
    setShowAutoMapped(false);
    setShowUnknownFields(false);
    setDuplicates(new Map());
    setSkipDuplicates(true);
    onClose();
  };

  const handleFinish = () => {
    if (importResult.imported > 0) onSuccess(importResult.imported);
    handleClose();
  };

  if (!isOpen) return null;

  const handleDownloadTemplate = (event?: MouseEvent) => {
    event?.stopPropagation();
    downloadOfficialImportTemplate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-2xl max-h-[88vh] overflow-hidden flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet size={20} className="text-primary-600" />
            <h2 className="text-base font-bold text-gray-900">
              Importar leads desde CSV / Excel
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── STEP: Upload ── */}
          {step === 'upload' && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center hover:border-primary-300 hover:bg-primary-50/30 transition-colors cursor-pointer"
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={36} className="text-gray-300 mx-auto mb-4" />
              <p className="text-sm font-semibold text-gray-700 mb-1">
                Arrastra un archivo CSV o Excel aqui
              </p>
              <p className="text-xs text-gray-400">Formatos: .csv, .xlsx</p>
              <div className="mt-5 rounded-xl border border-primary-100 bg-primary-50/50 px-4 py-3 text-left max-w-xl mx-auto">
                <p className="text-[11px] font-bold text-primary-700 uppercase tracking-wider mb-2">
                  Plantilla oficial recomendada
                </p>
                <div className="grid gap-1 text-xs text-primary-900">
                  <p><span className="font-semibold">Empresa:</span> Empresa, CIF, Sector, Facturacion, Empleados, Sede, Web</p>
                  <p><span className="font-semibold">Contacto:</span> CEO, Cargo, LinkedIn CEO, Facilities/COO, Email, Telefono</p>
                  <p><span className="font-semibold">Activos e inmueble:</span> N Activos, m2 Totales, Regimen, Ano Construccion, Cert. Energetica, Instalaciones</p>
                  <p><span className="font-semibold">Scoring:</span> Score Total, Score Obsolescencia, Score Potencial, Score Control, Score Contacto, Score Tamano, Score ESG, Tier, Temperatura</p>
                  <p><span className="font-semibold">Prospeccion:</span> Hook Inicial, Problema Identificado, Propuesta Concreta, PDF Generado</p>
                </div>
                <p className="text-[11px] text-primary-600 mt-2">
                  Las columnas fuera de esta plantilla seguiran entrando como campos adicionales.
                </p>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-primary-200 bg-white px-3 py-2 text-xs font-semibold text-primary-700 hover:bg-primary-50 transition-colors"
                >
                  <Download size={14} />
                  Descargar plantilla .xlsx
                </button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </div>
          )}

          {/* ── STEP: Review ── */}
          {step === 'review' && (
            <div className="space-y-5">
              {/* Stats bar */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-gray-500">
                  {rows.length} filas detectadas
                </span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                  {validCount} válidas
                </span>
                {invalidCount > 0 && (
                  <span className="text-xs font-bold text-red-500 bg-red-50 px-2.5 py-1 rounded-lg">
                    {invalidCount} vacías
                  </span>
                )}
                <span className="text-xs text-gray-400 ml-auto">
                  {headers.length} columnas
                </span>
                <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2.5 py-1 rounded-lg">
                  {finalImportCount} para importar
                </span>
              </div>

              {parseErrors.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs font-bold text-amber-700 mb-1">Advertencias</p>
                  {parseErrors.slice(0, 2).map((err, i) => (
                    <p key={i} className="text-xs text-amber-600">{err}</p>
                  ))}
                </div>
              )}

              {/* ── Duplicate warning ── */}
              {duplicates.size > 0 && (
                <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle size={15} className="text-orange-500" />
                    <span className="text-sm font-semibold text-orange-800">
                      {duplicates.size} emails ya existen en el sistema
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={skipDuplicates}
                        onChange={() => setSkipDuplicates(true)}
                        className="text-primary-600"
                      />
                      <span className="text-xs font-medium text-gray-700">Omitir duplicados</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={!skipDuplicates}
                        onChange={() => setSkipDuplicates(false)}
                        className="text-primary-600"
                      />
                      <span className="text-xs font-medium text-gray-700">Importar de todas formas</span>
                    </label>
                  </div>
                  <div className="mt-2 max-h-24 overflow-y-auto space-y-0.5">
                    {[...duplicates.entries()].slice(0, 5).map(([email, match]) => (
                      <p key={email} className="text-[11px] text-orange-600">
                        {email} → ya existe como &ldquo;{match.name}&rdquo; ({match.status})
                      </p>
                    ))}
                    {duplicates.size > 5 && (
                      <p className="text-[11px] text-orange-400">...y {duplicates.size - 5} más</p>
                    )}
                  </div>
                </div>
              )}
              {checkingDuplicates && (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Loader2 size={12} className="animate-spin" />
                  Comprobando duplicados...
                </div>
              )}

              {!checkingDuplicates && (invalidCount > 0 || duplicatePreviewCount > 0) && (
                <div className="rounded-xl border border-gray-200 bg-gray-50/70 px-4 py-3">
                  <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Resumen operativo
                  </p>
                  <div className="grid gap-1 text-sm text-gray-600">
                    <p>Filas válidas detectadas: <span className="font-semibold text-gray-900">{validCount}</span></p>
                    {invalidCount > 0 && (
                      <p>Filas descartadas por venir vacías: <span className="font-semibold text-gray-900">{invalidCount}</span></p>
                    )}
                    {duplicatePreviewCount > 0 && (
                      <p>
                        Duplicados en el archivo actual: <span className="font-semibold text-gray-900">{duplicatePreviewCount}</span>
                        {skipDuplicates ? ' (se omitirán)' : ' (se importarán)'}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {officialEntries.length > 0 && (
                <div className="rounded-xl border border-primary-100 bg-primary-50/40 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-primary-100">
                    <CheckCircle2 size={15} className="text-primary-600" />
                    <span className="text-sm font-semibold text-primary-800">
                      Plantilla oficial detectada
                    </span>
                    <span className="text-xs font-bold text-primary-600 bg-primary-100 px-2 py-0.5 rounded-full">
                      {officialEntries.length}
                    </span>
                    {officialMissingFieldEntries.length > 0 && (
                      <span className="text-[11px] font-semibold text-primary-700 ml-auto">
                        {officialMissingFieldEntries.length} campos oficiales se crearán
                      </span>
                    )}
                  </div>
                  <div className="px-4 py-3 space-y-3">
                    {Object.entries(officialEntriesBySection).map(([section, entries]) => (
                      <div key={section}>
                        <p className="text-[10px] font-bold text-primary-600 uppercase tracking-wider mb-1.5">
                          {section}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {entries.map(({ header, column }) => (
                            <span
                              key={header}
                              className="text-xs bg-white border border-primary-200 text-primary-700 rounded-md px-2 py-0.5"
                            >
                              {header}{' -> '}{getOfficialDestinationLabel(column)}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Auto-mapped fields ── */}
              {autoMappedEntries.length > 0 && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 overflow-hidden">
                  <button
                    onClick={() => setShowAutoMapped((v) => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-emerald-600" />
                      <span className="text-sm font-semibold text-emerald-800">
                        Detectados automáticamente
                      </span>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                        {autoMappedEntries.length}
                      </span>
                    </div>
                    {showAutoMapped ? (
                      <ChevronDown size={14} className="text-emerald-500" />
                    ) : (
                      <ChevronRight size={14} className="text-emerald-500" />
                    )}
                  </button>

                  {showAutoMapped && (
                    <div className="px-4 pb-3 flex flex-wrap gap-2">
                      {autoMappedEntries.map((h) => (
                        <div
                          key={h}
                          className="flex items-center gap-1.5 bg-white border border-emerald-200 rounded-lg px-2.5 py-1 text-xs"
                        >
                          <span className="text-gray-500 truncate max-w-[90px]">{h}</span>
                          <span className="text-emerald-400">{'->'}</span>
                          <span className="font-semibold text-emerald-700">
                            {STANDARD_FIELD_LABELS[autoMapping[h]] || autoMapping[h]}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Already in schema ── */}
              {existingCustomHeaders.length > 0 && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag size={14} className="text-indigo-500" />
                    <span className="text-sm font-semibold text-indigo-800">
                      Ya en tus campos personalizados
                    </span>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                      {existingCustomHeaders.length}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {existingCustomHeaders.map((h) => (
                      <span
                        key={h}
                        className="text-xs bg-white border border-indigo-200 text-indigo-600 rounded-md px-2 py-0.5"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ── New fields to create ── */}
              {officialExistingFieldEntries.length > 0 && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag size={14} className="text-indigo-500" />
                    <span className="text-sm font-semibold text-indigo-800">
                      Campos oficiales ya existentes en la ficha
                    </span>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                      {officialExistingFieldEntries.length}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {officialExistingFieldEntries.map(({ header }) => (
                      <span
                        key={header}
                        className="text-xs bg-white border border-indigo-200 text-indigo-600 rounded-md px-2 py-0.5"
                      >
                        {header}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {newFieldHeaders.length > 0 && (
                <div className="rounded-xl border border-amber-100 bg-amber-50/40 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-100">
                    <AlertCircle size={15} className="text-amber-500" />
                    <span className="text-sm font-semibold text-amber-800">
                      Columnas no previstas que se crearán como campos adicionales
                    </span>
                    <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                      {newFieldHeaders.length}
                    </span>
                    <div className="ml-auto flex items-center gap-1.5">
                      <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                        {newFieldHeaders.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowUnknownFields((value) => !value)}
                        className="p-0.5 text-amber-500 hover:text-amber-700 transition-colors"
                        title={showUnknownFields ? 'Ocultar detalle' : 'Ver detalle'}
                      >
                        {showUnknownFields ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    </div>
                  </div>
                  <div className="px-4 py-3 space-y-3">
                    <p className="text-xs text-amber-700">
                      Se guardarán como datos adicionales por lead y quedarán visibles en la ficha completa.
                    </p>
                    {showUnknownFields && Object.entries(newFieldsBySection).map(([section, sectionHeaders]) => (
                      <div key={section}>
                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1.5">
                          {section}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {sectionHeaders.map((h) => (
                            <span
                              key={h}
                              className="text-xs bg-white border border-amber-200 text-amber-700 rounded-md px-2 py-0.5"
                            >
                              {h}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {validCount === 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                  <AlertCircle size={20} className="text-red-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-red-700">
                    Ninguna fila tiene Nombre y Email válidos
                  </p>
                  <p className="text-xs text-red-500 mt-1">
                    Asegúrate de que el archivo tiene columnas de nombre y email con datos.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── STEP: Importing ── */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 size={36} className="text-primary-600 animate-spin mb-4" />
              <p className="text-sm font-semibold text-gray-700">
                Importando {finalImportCount} leads...
              </p>
              <p className="text-xs text-gray-400 mt-1">Guardando campos y datos en Firestore</p>
            </div>
          )}

          {/* ── STEP: Results ── */}
          {step === 'results' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4">
                <CheckCircle2 size={32} className="text-emerald-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-3">
                Importación completada
              </h3>
              <div className="flex items-center gap-6 mt-1">
                <div className="text-center">
                  <p className="text-2xl font-black text-emerald-600">
                    {importResult.imported}
                  </p>
                  <p className="text-xs text-gray-400">leads importados</p>
                </div>
                {importResult.errors > 0 && (
                  <div className="text-center">
                    <p className="text-2xl font-black text-red-500">
                      {importResult.errors}
                    </p>
                    <p className="text-xs text-gray-400">con errores</p>
                  </div>
                )}
              </div>
              {newFieldHeaders.length > 0 && (
                <p className="text-xs text-gray-400 mt-4 text-center max-w-md">
                  Se detectaron <strong className="text-gray-600">{newFieldHeaders.length} columnas no previstas</strong>.
                  Se importaron igualmente y se muestran en cada ficha como datos adicionales, sin crear ruido en Configuración.
                </p>
              )}
              {(officialMissingFieldEntries.length > 0 || duplicatePreviewCount > 0 || invalidCount > 0) && (
                <div className="mt-4 w-full max-w-md rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-left">
                  <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Resumen de esta importación
                  </p>
                  <div className="space-y-1 text-sm text-gray-600">
                    {officialMissingFieldEntries.length > 0 && (
                      <p>Campos oficiales creados: <span className="font-semibold text-gray-900">{officialMissingFieldEntries.length}</span></p>
                    )}
                    {newFieldHeaders.length > 0 && (
                      <p>Campos adicionales creados: <span className="font-semibold text-gray-900">{newFieldHeaders.length}</span></p>
                    )}
                    {invalidCount > 0 && (
                      <p>Filas vacías descartadas: <span className="font-semibold text-gray-900">{invalidCount}</span></p>
                    )}
                    {duplicatePreviewCount > 0 && skipDuplicates && (
                      <p>Duplicados omitidos: <span className="font-semibold text-gray-900">{duplicatePreviewCount}</span></p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-2 shrink-0">
          {step === 'review' && (
            <>
              <button
                onClick={() => { setStep('upload'); setRows([]); setHeaders([]); }}
                className="px-4 py-2 text-sm font-semibold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cambiar archivo
              </button>
              <button
                onClick={handleImport}
                disabled={validCount === 0 || !userId}
                className="px-5 py-2 text-sm font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                Confirmar e importar {finalImportCount} leads →
              </button>
            </>
          )}
          {step === 'results' && (
            <button
              onClick={handleFinish}
              className="px-5 py-2 text-sm font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-colors"
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
