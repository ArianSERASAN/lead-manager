import { useState, useRef, useCallback } from 'react';
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import {
  parseFile,
  autoMapHeaders,
  mapRow,
  validateRow,
  importLeads,
} from '../../services/CSVImportService';
import type { MappedLead } from '../../services/CSVImportService';

interface CSVImportProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
  userId?: string;
  userName?: string;
}

export function CSVImport({ isOpen, onClose, onSuccess, userId, userName }: CSVImportProps) {
  // States: 'upload' | 'preview' | 'importing' | 'results'
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'results'>('upload');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [headerMapping, setHeaderMapping] = useState<Record<string, string>>({});
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importResult, setImportResult] = useState({ imported: 0, errors: 0 });
  const fileRef = useRef<HTMLInputElement>(null);

  // Available lead fields for mapping dropdowns
  const LEAD_FIELDS = [
    { value: '', label: '— Ignorar —' },
    { value: 'name', label: 'Nombre' },
    { value: 'apellidos', label: 'Apellidos' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Teléfono' },
    { value: 'company', label: 'Empresa' },
    { value: 'cargo', label: 'Cargo' },
    { value: 'sector', label: 'Sector' },
    { value: 'localidad', label: 'Localidad' },
    { value: 'direccion', label: 'Dirección' },
    { value: 'tipoInmueble', label: 'Tipo inmueble' },
    { value: 'superficie', label: 'Superficie' },
    { value: 'referenciaCatastral', label: 'Ref. catastral' },
    { value: 'message', label: 'Mensaje' },
    { value: 'notes', label: 'Notas' },
  ];

  const handleFile = useCallback(async (file: File) => {
    const result = await parseFile(file);
    setHeaders(result.headers);
    setRows(result.rows);
    setParseErrors(result.errors);
    setHeaderMapping(autoMapHeaders(result.headers));
    setStep('preview');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.type === 'text/csv')) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleImport = async () => {
    if (!userId || !userName) return;
    setStep('importing');

    const mappedLeads: MappedLead[] = [];
    for (const row of rows) {
      const mapped = mapRow(row, headerMapping);
      const errors = validateRow(mapped);
      if (errors.length === 0) mappedLeads.push(mapped);
    }

    const result = await importLeads(mappedLeads, userId, userName);
    setImportResult({ imported: result.imported, errors: rows.length - mappedLeads.length + result.errors });
    setStep('results');
  };

  const handleClose = () => {
    setStep('upload');
    setHeaders([]);
    setRows([]);
    setHeaderMapping({});
    setParseErrors([]);
    onClose();
  };

  const handleFinish = () => {
    if (importResult.imported > 0) onSuccess(importResult.imported);
    handleClose();
  };

  // Count valid rows
  const validCount = rows.filter(row => {
    const mapped = mapRow(row, headerMapping);
    return validateRow(mapped).length === 0;
  }).length;
  const invalidCount = rows.length - validCount;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet size={20} className="text-primary-600" />
            <h2 className="text-base font-bold text-gray-900">Importar leads desde CSV / Excel</h2>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP: Upload */}
          {step === 'upload' && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center hover:border-primary-300 hover:bg-primary-50/30 transition-colors cursor-pointer"
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={36} className="text-gray-300 mx-auto mb-4" />
              <p className="text-sm font-semibold text-gray-700 mb-1">
                Arrastra un archivo CSV o Excel aquí
              </p>
              <p className="text-xs text-gray-400">
                Formatos: .csv, .xlsx
              </p>
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

          {/* STEP: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* Stats */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-gray-500">{rows.length} filas detectadas</span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">
                  {validCount} válidas
                </span>
                {invalidCount > 0 && (
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-lg">
                    {invalidCount} con errores
                  </span>
                )}
              </div>

              {/* Column mapping */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mapeo de columnas</p>
                <div className="grid grid-cols-2 gap-2">
                  {headers.map((header) => (
                    <div key={header} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-xs text-gray-600 font-medium truncate flex-1">{header}</span>
                      <span className="text-gray-300">&rarr;</span>
                      <select
                        value={headerMapping[header] || ''}
                        onChange={(e) => setHeaderMapping(prev => ({ ...prev, [header]: e.target.value }))}
                        className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        {LEAD_FIELDS.map(f => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Las columnas marcadas como 'Ignorar' se guardarán automáticamente como campos adicionales del lead.
                </p>
              </div>

              {/* Preview table (first 5 rows) */}
              <div className="overflow-x-auto">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Previsualización (primeras 5 filas)</p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-2 py-1.5 text-left text-gray-400 font-semibold">#</th>
                      {headers.filter(h => headerMapping[h]).map(h => (
                        <th key={h} className="px-2 py-1.5 text-left text-gray-400 font-semibold truncate max-w-[120px]">
                          {headerMapping[h]}
                        </th>
                      ))}
                      <th className="px-2 py-1.5 text-left text-gray-400 font-semibold">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 5).map((row, i) => {
                      const mapped = mapRow(row, headerMapping);
                      const errors = validateRow(mapped);
                      return (
                        <tr key={i} className={`border-b border-gray-50 ${errors.length > 0 ? 'bg-red-50/50' : ''}`}>
                          <td className="px-2 py-1.5 text-gray-400">{i + 1}</td>
                          {headers.filter(h => headerMapping[h]).map(h => (
                            <td key={h} className="px-2 py-1.5 text-gray-600 truncate max-w-[120px]">{row[h]}</td>
                          ))}
                          <td className="px-2 py-1.5">
                            {errors.length > 0 ? (
                              <span className="flex items-center gap-1 text-red-500">
                                <AlertCircle size={12} />
                                {errors[0]}
                              </span>
                            ) : (
                              <CheckCircle2 size={14} className="text-emerald-500" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {parseErrors.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs font-bold text-amber-700 mb-1">Advertencias del parser</p>
                  {parseErrors.slice(0, 3).map((err, i) => (
                    <p key={i} className="text-xs text-amber-600">{err}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP: Importing */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 size={36} className="text-primary-600 animate-spin mb-4" />
              <p className="text-sm font-semibold text-gray-700">Importando {validCount} leads...</p>
              <p className="text-xs text-gray-400 mt-1">Esto puede tardar unos segundos</p>
            </div>
          )}

          {/* STEP: Results */}
          {step === 'results' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4">
                <CheckCircle2 size={32} className="text-emerald-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2">Importación completada</h3>
              <div className="flex items-center gap-4 mt-2">
                <div className="text-center">
                  <p className="text-2xl font-black text-emerald-600">{importResult.imported}</p>
                  <p className="text-xs text-gray-400">importados</p>
                </div>
                {importResult.errors > 0 && (
                  <div className="text-center">
                    <p className="text-2xl font-black text-red-500">{importResult.errors}</p>
                    <p className="text-xs text-gray-400">con errores</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-2">
          {step === 'preview' && (
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
                Importar {validCount} leads
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
