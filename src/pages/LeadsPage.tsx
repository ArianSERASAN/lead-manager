import { useState } from 'react';
import { Lead } from '../types/domain';
import { Header } from '../components/Layout/Header';
import { FilterBar } from '../components/Filters/FilterBar';
import { LeadTable } from '../components/LeadViews/LeadTable';
import { LeadDetail } from '../components/LeadViews/LeadDetail';
import { LeadCreateForm } from '../components/LeadViews/LeadCreateForm';
import { SelectionHUD } from '../components/Shared/SelectionHUD';
import { useLeads } from '../hooks/leads/useLeads';
import { useLeadActions } from '../hooks/leads/useLeadActions';
import { useFilterLogic } from '../hooks/filtering/useFilterLogic';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { X, Loader2 } from 'lucide-react';
import { LeadStatus } from '../types/domain';

interface LeadsPageProps {
  showCreateForm?: boolean;
  onOpenCreateForm?: () => void;
  onCloseCreateForm?: () => void;
}

export function LeadsPage({ showCreateForm = false, onOpenCreateForm, onCloseCreateForm }: LeadsPageProps) {
  const { appUser } = useAuth();
  const { addToast } = useToast();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { leads, loading: leadsLoading, hasMore, loadMore, loadingMore } = useLeads();

  const {
    updateLeadStatus,
    updateLeadNotes,
    updateLeadTags,
    assignLead,
    deleteLead,
    bulkStatusUpdate,
    bulkDelete,
    pendingDeleteIds
  } = useLeadActions(leads, addToast, () => setSelectedIds([]), appUser?.uid, appUser?.name);

  const {
    activeTab,
    setActiveTab,
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
    filteredLeads,
    activeFilterCount,
    applyFilterState,
    clearAllFilters,
    getCurrentFilterState
  } = useFilterLogic(leads, pendingDeleteIds);

  // Direct execution — no confirmation modals. Bulk delete already has 5s undo toast.
  const handleBulkDelete = () => bulkDelete(selectedIds);
  const handleBulkStatusUpdate = (status: LeadStatus) => {
    if (!status) return;
    bulkStatusUpdate(selectedIds, status);
  };

  return (
    <>
      <Header
        title="Leads"
        leadCount={filteredLeads.length}
        onNewLeadClick={onOpenCreateForm}
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
        activeFilterCount={activeFilterCount}
        onApplyFilterState={applyFilterState}
        getCurrentFilterState={getCurrentFilterState}
        onClearAllFilters={clearAllFilters}
      />

      {selectedIds.length > 0 && (
        <SelectionHUD
          selectedCount={selectedIds.length}
          onBulkDelete={handleBulkDelete}
          onBulkStatusUpdate={handleBulkStatusUpdate}
          onClearSelection={() => setSelectedIds([])}
        />
      )}

      <div className="flex flex-col md:flex-row gap-4 md:gap-6 mt-4">
        <div className={`transition-all duration-300 ${selectedLead ? 'hidden md:block md:flex-1 md:min-w-0' : 'w-full'}`}>
          <LeadTable
            leads={filteredLeads}
            selectedIds={selectedIds}
            onSelect={setSelectedLead}
            onToggleSelection={(id) => {
              setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
            }}
            onToggleAll={(ids) => setSelectedIds(ids)}
            onDelete={deleteLead}
            loading={leadsLoading}
            hasActiveFilters={activeFilterCount > 0}
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
                  'Cargar más leads'
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
              ← Volver a la lista
            </button>
            <LeadDetail
              lead={selectedLead}
              onStatusChange={(status) => updateLeadStatus(selectedLead.id, status)}
              onNotesChange={(notes) => updateLeadNotes(selectedLead.id, notes)}
              onTagsChange={(tags) => updateLeadTags(selectedLead.id, tags)}
              onAssign={(userId) => assignLead(selectedLead.id, userId)}
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
    </>
  );
}
