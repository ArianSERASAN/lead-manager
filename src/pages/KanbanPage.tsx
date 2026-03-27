import { useState } from 'react';
import { Lead } from '../types/domain';
import { Header } from '../components/Layout/Header';
import { LeadKanban } from '../components/LeadViews/LeadKanban';
import { LeadDetail } from '../components/LeadViews/LeadDetail';
import { LeadCreateForm } from '../components/LeadViews/LeadCreateForm';
import { useLeads } from '../hooks/leads/useLeads';
import { useLeadActions } from '../hooks/leads/useLeadActions';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export function KanbanPage() {
  const { appUser } = useAuth();
  const { addToast } = useToast();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { leads, loading: leadsLoading } = useLeads();

  const {
    updateLeadStatus,
    updateLeadNotes,
    updateLeadTags,
    assignLead
  } = useLeadActions(leads, addToast, () => {}, appUser?.uid, appUser?.name);

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
        title="Pipeline Kanban"
        user={appUser}
        stats={stats}
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
        <div className="fixed right-0 top-0 h-full w-full md:w-96 bg-gray-900/50 backdrop-blur-sm z-40 md:relative md:bg-transparent md:backdrop-blur-none overflow-y-auto">
          <div className="md:hidden p-4 flex justify-end">
            <button
              onClick={() => setSelectedLead(null)}
              className="text-white text-2xl"
            >
              ✕
            </button>
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
