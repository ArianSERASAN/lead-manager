import { useCallback } from 'react';
import { Lead, LeadStatus } from '../../types/domain';
import * as LeadService from '../../services/LeadService';
import * as ActivityService from '../../services/ActivityService';

const COLLECTION = 'leads';

interface Toast {
  message: string;
  type: 'success' | 'error' | 'undo' | 'info';
  onUndo?: () => void;
}

export function useLeadActions(
  leads: Lead[],
  addToast: (toast: Toast) => string,
  clearSelection: () => void,
  userId?: string,
  userName?: string
) {
  const cancelLead = useCallback(async (id: string, reason: string) => {
    const lead = leads.find(l => l.id === id);
    if (!lead || !userId || !userName) return;
    try {
      await LeadService.cancelLead(lead, reason, userId, userName);
      addToast({ message: `${lead.name} cancelado`, type: 'success' });

      await ActivityService.recordActivity(
        lead.id, COLLECTION, userId, userName,
        'cancelled',
        { field: 'status', oldValue: lead.status, newValue: 'cancelado', note: reason }
      );
    } catch {
      addToast({ message: 'Error al cancelar el lead', type: 'error' });
    }
  }, [leads, addToast, userId, userName]);

  const bulkCancelLeads = useCallback(async (selectedIds: string[], reason: string) => {
    if (selectedIds.length === 0 || !userId || !userName) return;
    try {
      const leadsToCancel = leads.filter(l => selectedIds.includes(l.id));
      await Promise.all(leadsToCancel.map(lead =>
        LeadService.cancelLead(lead, reason, userId, userName)
      ));
      addToast({ message: `${selectedIds.length} leads cancelados`, type: 'success' });

      await Promise.all(leadsToCancel.map(lead =>
        ActivityService.recordActivity(
          lead.id, COLLECTION, userId, userName,
          'cancelled',
          { field: 'status', oldValue: lead.status, newValue: 'cancelado', note: reason }
        )
      ));

      clearSelection();
    } catch {
      addToast({ message: 'Error al cancelar los leads', type: 'error' });
    }
  }, [leads, addToast, clearSelection, userId, userName]);

  const updateLeadStatus = useCallback(async (id: string, status: LeadStatus) => {
    try {
      const lead = leads.find(l => l.id === id);
      if (!lead) return;

      const prevStatus = lead.status;
      await LeadService.updateLeadStatus(lead, status, userId, userName);

      const label = status === 'cerrado' ? 'Cerrado como ganado' : `Estado: ${status}`;
      addToast({
        message: label,
        type: 'undo',
        onUndo: async () => {
          try {
            await LeadService.updateLeadStatus({ ...lead, status } as Lead, prevStatus, userId, userName);
          } catch { /* silent revert failure */ }
        },
      });

      if (userId && userName) {
        await ActivityService.recordActivity(
          lead.id, COLLECTION, userId, userName,
          status === 'cerrado' ? 'closed' : 'status_change',
          { field: 'status', oldValue: lead.status, newValue: status }
        );
      }
    } catch {
      addToast({ message: 'Error al actualizar estado', type: 'error' });
    }
  }, [leads, addToast, userId, userName]);

  const updateLeadNotes = useCallback(async (id: string, notes: string) => {
    try {
      const lead = leads.find(l => l.id === id);
      if (!lead) return;

      const prevNotes = lead.notes || '';
      await LeadService.updateLeadNotes(lead, notes);

      addToast({
        message: 'Notas guardadas',
        type: 'undo',
        onUndo: async () => {
          try {
            await LeadService.updateLeadNotes(lead, prevNotes);
          } catch { /* silent */ }
        },
      });

      if (userId && userName) {
        await ActivityService.recordActivity(
          lead.id, COLLECTION, userId, userName,
          'note_added', { note: notes }
        );
      }
    } catch {
      addToast({ message: 'Error al guardar notas', type: 'error' });
    }
  }, [leads, addToast, userId, userName]);

  const bulkStatusUpdate = useCallback(async (selectedIds: string[], status: LeadStatus) => {
    if (selectedIds.length === 0 || !status) return;
    try {
      const leadsToUpdate = leads.filter(l => selectedIds.includes(l.id));
      await LeadService.bulkUpdateStatus(leadsToUpdate, status);
      addToast({ message: `${selectedIds.length} leads actualizados`, type: 'success' });

      if (userId && userName) {
        await Promise.all(leadsToUpdate.map(lead =>
          ActivityService.recordActivity(
            lead.id, COLLECTION, userId, userName,
            'status_change',
            { field: 'status', oldValue: lead.status, newValue: status }
          )
        ));
      }

      clearSelection();
    } catch {
      addToast({ message: 'Error en actualización masiva', type: 'error' });
    }
  }, [leads, addToast, clearSelection, userId, userName]);

  const updateLeadTags = useCallback(async (id: string, tags: string[]) => {
    try {
      const lead = leads.find(l => l.id === id);
      if (!lead) return;

      const prevTags = [...(lead.tags || [])];
      await LeadService.updateLeadTags(lead, tags);

      addToast({
        message: 'Etiquetas actualizadas',
        type: 'undo',
        onUndo: async () => {
          try {
            await LeadService.updateLeadTags(lead, prevTags);
          } catch { /* silent */ }
        },
      });

      if (userId && userName) {
        const addedTags = tags.filter(t => !prevTags.includes(t));
        const removedTags = prevTags.filter(t => !tags.includes(t));

        if (addedTags.length > 0) {
          await ActivityService.recordActivity(lead.id, COLLECTION, userId, userName, 'tag_added', { newValue: addedTags });
        }
        if (removedTags.length > 0) {
          await ActivityService.recordActivity(lead.id, COLLECTION, userId, userName, 'tag_removed', { oldValue: removedTags });
        }
      }
    } catch {
      addToast({ message: 'Error al actualizar etiquetas', type: 'error' });
    }
  }, [leads, addToast, userId, userName]);

  const assignLead = useCallback(async (id: string, assignedUserId: string) => {
    try {
      const lead = leads.find(l => l.id === id);
      if (!lead) return;

      const prevAssignee = lead.assignedTo;
      await LeadService.assignLead(lead, assignedUserId);

      addToast({
        message: 'Lead asignado',
        type: 'undo',
        onUndo: async () => {
          try {
            if (prevAssignee) {
              await LeadService.assignLead(lead, prevAssignee);
            } else {
              await LeadService.updateLeadField(lead, 'assignedTo', null);
            }
          } catch { /* silent */ }
        },
      });

      if (userId && userName) {
        await ActivityService.recordActivity(lead.id, COLLECTION, userId, userName, 'assigned', { newValue: assignedUserId });
      }
    } catch {
      addToast({ message: 'Error al asignar lead', type: 'error' });
    }
  }, [leads, addToast, userId, userName]);

  const bulkAssignLeads = useCallback(async (selectedIds: string[], assignToUserId: string) => {
    if (selectedIds.length === 0 || !assignToUserId) return;
    try {
      const leadsToAssign = leads.filter(l => selectedIds.includes(l.id));
      await LeadService.bulkAssign(leadsToAssign, assignToUserId);
      addToast({ message: `${selectedIds.length} leads asignados`, type: 'success' });
      clearSelection();
    } catch {
      addToast({ message: 'Error al asignar leads', type: 'error' });
    }
  }, [leads, addToast, clearSelection]);

  const bulkAddTagToLeads = useCallback(async (selectedIds: string[], tag: string) => {
    if (selectedIds.length === 0 || !tag) return;
    try {
      const leadsToTag = leads.filter(l => selectedIds.includes(l.id));
      await LeadService.bulkAddTag(leadsToTag, tag);
      addToast({ message: `Etiqueta "${tag}" añadida a ${selectedIds.length} leads`, type: 'success' });
      clearSelection();
    } catch {
      addToast({ message: 'Error al etiquetar leads', type: 'error' });
    }
  }, [leads, addToast, clearSelection]);

  return {
    updateLeadStatus,
    updateLeadNotes,
    updateLeadTags,
    assignLead,
    cancelLead,
    bulkCancelLeads,
    bulkStatusUpdate,
    bulkAssignLeads,
    bulkAddTagToLeads,
  };
}
