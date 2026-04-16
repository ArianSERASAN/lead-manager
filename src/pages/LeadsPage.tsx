import { useState } from 'react';
import { Lead, LeadStatus } from '../types/domain';
import { Header } from '../components/Layout/Header';
import { FilterBar } from '../components/Filters/FilterBar';
import { LeadTable } from '../components/LeadViews/LeadTable';
import { LeadDetail } from '../components/LeadViews/LeadDetail';
import { LeadCreateForm } from '../components/LeadViews/LeadCreateForm';
import { CSVImport } from '../components/LeadViews/CSVImport';
import { SelectionHUD } from '../components/Shared/SelectionHUD';
import { CancellationModal } from '../components/Shared/CancellationModal';
import { RoleGuard } from '../components/User/RoleGuard';
import { useLeads } from '../hooks/leads/useLeads';
import { useLeadActions } from '../hooks/leads/useLeadActions';
import { useFilterLogic } from '../hooks/filtering/useFilterLogic';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { exportLeadsToExcel } from '../services/ExcelExportService';
import { exportLeadsToPDF } from '../services/PDFExportService';
import { X, Loader2, Download, Upload, FileText } from 'lucide-react';
import { getLeadKey } from '../lib/leads';

interface LeadsPageProps {
  showCreateForm?: boolean;
  onOpenCreateForm?: () => void;
  onCloseCreateForm?: () => void;
}

interface CancellationTarget {
  type: 'single' | 'bulk';
  leadKeys: string[];
}

export function LeadsPage({ showCreateForm = false, onOpenCreateForm, onCloseCreateForm }: LeadsPageProps) {
  const { appUser } = useAuth();
  const { addToast } = useToast();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedLeadKeys, setSelectedLeadKeys] = useState<string[]>([]);
  const [cancellationTarget, setCancellationTarget] = useState<CancellationTarget | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const { leads, loading: leadsLoading, hasMore, loadMore, loadingMore } = useLeads();

  const {
    updateLeadStatus,
    updateLeadNotes,
    updateLeadTags,
    assignLead,
    cancelLead,
    bulkCancelLeads,
    bulkStatusUpdate,
  } = useLeadActions(leads, addToast, () => setSelectedLeadKeys([]), appUser?.uid, appUser?.name);

  const {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    sourceFilter,
    setSourceFilter,
    dateFilter,
    setDateFilter,
    tags,
    setTags,
    assignedTo,
    setAssignedTo,
    scoreMin,
    setScoreMin,
    scoreMax,
    setScoreMax,
    staleDays,
    setStaleDays,
    filledFieldsMin,
    setFilledFieldsMin,
    filteredLeads,
    activeFilterCount,
    applyFilterState,
    clearAllFilters,
    getCurrentFilterState,
  } = useFilterLogic(leads);

  const handleBulkStatusUpdate = async (status: LeadStatus) => {
    if (!status || bulkActionLoading) return;
    setBulkActionLoading(true);
    try {
      await bulkStatusUpdate(selectedLeadKeys, status);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleRequestCancelSingle = () => {
    if (!selectedLead) return;
    setCancellationTarget({ type: 'single', leadKeys: [getLeadKey(selectedLead)] });
  };

  const handleRequestCancelBulk = () => {
    if (selectedLeadKeys.length === 0) return;
    setCancellationTarget({ type: 'bulk', leadKeys: [...selectedLeadKeys] });
  };

  const handleConfirmCancellation = async (reason: string) => {
    if (!cancellationTarget || bulkActionLoading) return;

    const { type, leadKeys } = cancellationTarget;
    setCancellationTarget(null);
    setBulkActionLoading(true);

    try {
      if (type === 'single') {
        await cancelLead(leadKeys[0], reason);
        if (selectedLead && getLeadKey(selectedLead) === leadKeys[0]) setSelectedLead(null);
      } else {
        await bulkCancelLeads(leadKeys, reason);
        setSelectedLeadKeys([]);
        setSelectedLead(null);
      }
    } finally {
      setBulkActionLoading(false);
    }
  };

  const cancellationLeadName = cancellationTarget?.type === 'single'
    ? leads.find((lead) => getLeadKey(lead) === cancellationTarget.leadKeys[0])?.name
    : undefined;

  return (
    <>
      <Header
        title="Leads"
        leadCount={filteredLeads.length}
        onNewLeadClick={onOpenCreateForm}
        actions={
          <>
            <button
              onClick={() => exportLeadsToExcel(filteredLeads)}
              disabled={filteredLeads.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              title="Exportar leads a Excel"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Excel</span>
            </button>
            <button
              onClick={() => { void exportLeadsToPDF(filteredLeads); }}
              disabled={filteredLeads.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              title="Exportar leads a PDF"
            >
              <FileText size={16} />
              <span className="hidden sm:inline">PDF</span>
            </button>
            <RoleGuard requires="canEdit">
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all text-sm"
                title="Importar leads desde CSV o Excel"
              >
                <Upload size={16} />
                <span className="hidden sm:inline">Importar</span>
              </button>
            </RoleGuard>
          </>
        }
      />

      <FilterBar
        searchTerm={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        sourceFilter={sourceFilter}
        onSourceChange={setSourceFilter}
        dateFilter={dateFilter}
        onDateChange={setDateFilter}
        leads={leads}
        activeTab="dashboard"
        tags={tags}
        onTagsChange={setTags}
        assignedTo={assignedTo}
        onAssignedToChange={setAssignedTo}
        scoreMin={scoreMin}
        scoreMax={scoreMax}
        onScoreRangeChange={(min, max) => {
          setScoreMin(min);
          setScoreMax(max);
        }}
        filledFieldsMin={filledFieldsMin}
        onFilledFieldsMinChange={setFilledFieldsMin}
        activeFilterCount={activeFilterCount}
        filteredCount={filteredLeads.length}
        totalCount={leads.filter((lead) => lead.status !== 'cancelado').length}
        onApplyFilterState={applyFilterState}
        getCurrentFilterState={getCurrentFilterState}
        onClearAllFilters={clearAllFilters}
      />

      {selectedLeadKeys.length > 0 && (
        <SelectionHUD
          selectedCount={selectedLeadKeys.length}
          onBulkCancel={handleRequestCancelBulk}
          onBulkStatusUpdate={handleBulkStatusUpdate}
          onClearSelection={() => setSelectedLeadKeys([])}
          disabled={bulkActionLoading}
          onExportSelected={() => {
            const selectedLeadSet = new Set(selectedLeadKeys);
            const selectedLeads = leads.filter((lead) => selectedLeadSet.has(getLeadKey(lead)));
            exportLeadsToExcel(selectedLeads, `leads_seleccionados_${new Date().toISOString().slice(0, 10)}.xlsx`);
          }}
        />
      )}

      <div className="flex flex-col md:flex-row gap-4 md:gap-6 mt-4">
        <div className={`transition-all duration-300 ${selectedLead ? 'hidden md:block md:flex-1 md:min-w-0' : 'w-full'}`}>
          <LeadTable
            leads={filteredLeads}
            selectedIds={selectedLeadKeys}
            onSelect={setSelectedLead}
            onToggleSelection={(leadKey) => {
              setSelectedLeadKeys((prev) => prev.includes(leadKey)
                ? prev.filter((key) => key !== leadKey)
                : [...prev, leadKey]);
            }}
            onToggleAll={(leadKeys) => setSelectedLeadKeys(leadKeys)}
            onDelete={() => {}}
            loading={leadsLoading}
            hasActiveFilters={activeFilterCount > 0}
            onNewLead={onOpenCreateForm}
          />

          {hasMore && (
            <div className="mt-4 text-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all duration-150 active:scale-[0.97] disabled:opacity-50"
              >
                {loadingMore ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    Cargando...
                  </span>
                ) : (
                  'Cargar mas leads'
                )}
              </button>
            </div>
          )}
        </div>

        {selectedLead && (
          <div className="w-full md:w-[380px] shrink-0 relative">
            <button
              onClick={() => setSelectedLead(null)}
              aria-label="Cerrar detalle del lead"
              className="absolute -left-3 top-4 z-10 w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:shadow-md transition-all hidden md:flex"
            >
              <X size={14} />
            </button>
            <button
              onClick={() => setSelectedLead(null)}
              aria-label="Cerrar detalle del lead"
              className="md:hidden w-full mb-2 py-2 text-sm font-semibold text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Volver a la lista
            </button>
            <LeadDetail
              lead={selectedLead}
              onStatusChange={(status) => updateLeadStatus(getLeadKey(selectedLead), status)}
              onNotesChange={(notes) => updateLeadNotes(getLeadKey(selectedLead), notes)}
              onTagsChange={(nextTags) => updateLeadTags(getLeadKey(selectedLead), nextTags)}
              onAssign={(userId) => assignLead(getLeadKey(selectedLead), userId)}
              onCancel={handleRequestCancelSingle}
              siblingLeads={filteredLeads}
            />
          </div>
        )}
      </div>

      <LeadCreateForm
        isOpen={showCreateForm}
        onClose={() => onCloseCreateForm?.()}
        onSuccess={(lead) => {
          addToast({ message: `${lead.name} creado exitosamente`, type: 'success' });
        }}
        onError={(message) => {
          addToast({ message, type: 'error' });
        }}
        userId={appUser?.uid}
        userName={appUser?.name}
      />

      <CancellationModal
        isOpen={!!cancellationTarget}
        leadName={cancellationLeadName}
        isBulk={cancellationTarget?.type === 'bulk'}
        bulkCount={cancellationTarget?.leadKeys.length ?? 0}
        onConfirm={handleConfirmCancellation}
        onClose={() => setCancellationTarget(null)}
      />

      <CSVImport
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={(count) => {
          setShowImportModal(false);
          addToast({ message: `${count} lead${count !== 1 ? 's' : ''} importado${count !== 1 ? 's' : ''} correctamente`, type: 'success' });
        }}
        userId={appUser?.uid}
        userName={appUser?.name}
      />
    </>
  );
}
