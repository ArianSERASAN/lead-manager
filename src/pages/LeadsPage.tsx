import { useState } from 'react';
import { Lead } from '../types/domain';
import { Header } from '../components/Layout/Header';
import { FilterBar } from '../components/Filters/FilterBar';
import { LeadTable } from '../components/LeadViews/LeadTable';
import { LeadDetail } from '../components/LeadViews/LeadDetail';
import { LeadCreateForm } from '../components/LeadViews/LeadCreateForm';
import { SelectionHUD } from '../components/Shared/SelectionHUD';
import { ConfirmModal } from '../components/Shared/ConfirmModal';
import { useLeads } from '../hooks/leads/useLeads';
import { useLeadActions } from '../hooks/leads/useLeadActions';
import { useFilterLogic } from '../hooks/filtering/useFilterLogic';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { X } from 'lucide-react';

interface LeadsPageProps {
  showCreateForm?: boolean;
  onCloseCreateForm?: () => void;
}

export function LeadsPage({ showCreateForm = false, onCloseCreateForm }: LeadsPageProps) {
  const { appUser } = useAuth();
  const { addToast } = useToast();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; onConfirm: () => void; title: string; message: string } | null>(null);

  const { leads, loading: leadsLoading } = useLeads();

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

  const handleBulkDelete = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Leads',
      message: `¿Seguro que quieres eliminar ${selectedIds.length} leads? Esta acción no se puede deshacer.`,
      onConfirm: async () => {
        await bulkDelete(selectedIds);
        setConfirmModal(null);
      }
    });
  };

  const handleBulkStatusUpdate = (status: any) => {
    setConfirmModal({
      isOpen: true,
      title: 'Actualizar Estado',
      message: `¿Actualizar el estado de ${selectedIds.length} leads a ${status}?`,
      onConfirm: async () => {
        await bulkStatusUpdate(selectedIds, status);
        setConfirmModal(null);
      }
    });
  };

  return (
    <>
      <Header
        title="Leads"
        leadCount={filteredLeads.length}
        onNewLeadClick={() => onCloseCreateForm ? undefined : undefined}
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

      <div className="flex gap-6 mt-4">
        {/* Table — full width when no lead selected, shrinks when detail open */}
        <div className={`transition-all duration-300 ${selectedLead ? 'flex-1 min-w-0' : 'w-full'}`}>
          <LeadTable
            leads={filteredLeads}
            selectedIds={selectedIds}
            onSelect={setSelectedLead}
            onToggleSelection={(id) => {
              setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
            }}
            onToggleAll={(ids) => setSelectedIds(ids)}
            onDelete={deleteLead}
          />
        </div>

        {/* Detail panel — slides in from right */}
        {selectedLead && (
          <div className="w-[380px] shrink-0 relative">
            <button
              onClick={() => setSelectedLead(null)}
              className="absolute -left-3 top-4 z-10 w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:shadow-md transition-all"
            >
              <X size={14} />
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

      {confirmModal && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

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
