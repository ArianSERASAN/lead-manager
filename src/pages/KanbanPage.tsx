import { useState } from 'react';
import { Lead } from '../types/domain';
import { Header } from '../components/Layout/Header';
import { LeadKanban } from '../components/LeadViews/LeadKanban';
import { LeadDetail } from '../components/LeadViews/LeadDetail';
import { LeadCreateForm } from '../components/LeadViews/LeadCreateForm';
import { useLeadStore } from '../stores/useLeadStore';
import { useLeadActions } from '../hooks/leads/useLeadActions';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export function KanbanPage() {
  const { appUser } = useAuth();
  const { addToast } = useToast();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const allLeads = useLeadStore((s) => s.leads);
  const leadsLoading = useLeadStore((s) => s.loading);

  // Excluir cancelados del pipeline — sólo van al historial
  const leads = allLeads.filter(l => l.status !== 'cancelado');

  const {
    updateLeadStatus,
    updateLeadNotes,
    updateLeadTags,
    assignLead
  } = useLeadActions(allLeads, addToast, () => {}, appUser?.uid, appUser?.name);

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'nuevo').length,
    inProgress: leads.filter(l => l.status === 'en-progreso').length,
    closed: leads.filter(l => l.status === 'cerrado').length
  };

  const handleCreateSuccess = (lead: Lead) => {
    addToast({
      message: `${lead.name} creado exitosamente`,
      type: 'success'
    });
  };

  const handleCreateError = (message: string) => {
    addToast({
      message,
      type: 'error'
    });
  };

  return (
    <>
      <Header
        title="Pipeline"
        leadCount={leads.length}
        onNewLeadClick={() => setShowCreateForm(true)}
      />

      <div className="h-full">
        <LeadKanban
          leads={leads}
          onLeadClick={setSelectedLead}
          onStatusChange={updateLeadStatus}
          isLoading={leadsLoading}
        />
      </div>

      {/* Lead Detail Sidebar */}
      {selectedLead && (
        <div className="fixed inset-0 z-40 md:relative md:inset-auto">
          {/* Backdrop — mobile only */}
          <div
            className="md:hidden absolute inset-0 bg-gray-900/50 backdrop-blur-sm modal-backdrop-enter"
            onClick={() => setSelectedLead(null)}
          />
          {/* Panel */}
          <div className="absolute right-0 top-0 h-full w-full md:w-96 md:relative md:h-auto bg-white md:bg-transparent overflow-y-auto animate-slide-in-right md:animate-none">
            <div className="md:hidden sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
              <button
                onClick={() => setSelectedLead(null)}
                className="flex items-center gap-2 text-sm font-semibold text-gray-600 active:text-gray-900 min-h-[44px] px-2"
              >
                ← Volver
              </button>
              <span className="text-sm font-bold text-gray-900 truncate max-w-[200px]">{selectedLead.name}</span>
            </div>
            <div className="p-4 md:p-0">
              <LeadDetail
                lead={selectedLead}
                onStatusChange={(status) => updateLeadStatus(selectedLead.id, status)}
                onNotesChange={(notes) => updateLeadNotes(selectedLead.id, notes)}
                onTagsChange={(tags) => updateLeadTags(selectedLead.id, tags)}
                onAssign={(userId) => assignLead(selectedLead.id, userId)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Create Lead Form Modal */}
      <LeadCreateForm
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onSuccess={handleCreateSuccess}
        onError={handleCreateError}
        userId={appUser?.uid}
        userName={appUser?.name}
      />
    </>
  );
}
