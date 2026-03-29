import { useCallback } from 'react';
import { Lead, LeadStatus } from '../../types/domain';
import * as LeadService from '../../services/LeadService';
import * as ActivityService from '../../services/ActivityService';

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
        lead.id,
        lead._collection || LeadService.getCollectionName(lead.source),
        userId,
        userName,
        'cancelled',
        { field: 'status', oldValue: lead.status, newValue: 'cancelado', note: reason }
      );
    } catch (error) {
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
          lead.id,
          lead._collection || LeadService.getCollectionName(lead.source),
          userId,
          userName,
          'cancelled',
          { field: 'status', oldValue: lead.status, newValue: 'cancelado', note: reason }
        )
      ));

      clearSelection();
    } catch (error) {
      addToast({ message: 'Error al cancelar los leads', type: 'error' });
    }
  }, [leads, addToast, clearSelection, userId, userName]);

  const updateLeadStatus = useCallback(async (id: string, status: LeadStatus) => {
    try {
      const lead = leads.find(l => l.id === id);
      if (!lead) return;
      await LeadService.updateLeadStatus(lead, status, userId, userName);

      const label = status === 'cerrado' ? 'Cerrado como ganado' : `Estado: ${status}`;
      addToast({ message: label, type: 'success' });

      if (userId && userName) {
        const colName = lead._collection || LeadService.getCollectionName(lead.source);
        await ActivityService.recordActivity(
          lead.id,
          colName,
          userId,
          userName,
          status === 'cerrado' ? 'closed' : 'status_change',
          { field: 'status', oldValue: lead.status, newValue: status }
        );
      }
    } catch (error) {
      addToast({ message: 'Error al actualizar estado', type: 'error' });
    }
  }, [leads, addToast, userId, userName]);

  const updateLeadNotes = useCallback(async (id: string, notes: string) => {
    try {
      const lead = leads.find(l => l.id === id);
      if (!lead) return;
      await LeadService.updateLeadNotes(lead, notes);
      addToast({ message: 'Notas guardadas', type: 'success' });

      if (userId && userName) {
        const colName = lead._collection || LeadService.getCollectionName(lead.source);
        await ActivityService.recordActivity(
          lead.id,
          colName,
          userId,
          userName,
          'note_added',
          { note: notes }
        );
      }
    } catch (error) {
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
        for (const lead of leadsToUpdate) {
          const colName = lead._collection || LeadService.getCollectionName(lead.source);
          await ActivityService.recordActivity(
            lead.id,
            colName,
            userId,
            userName,
            'status_change',
            { field: 'status', oldValue: lead.status, newValue: status }
          );
        }
      }

      clearSelection();
    } catch (error) {
      addToast({ message: 'Error en actualización masiva', type: 'error' });
    }
  }, [leads, addToast, clearSelection, userId, userName]);

  const updateLeadTags = useCallback(async (id: string, tags: string[]) => {
    try {
      const lead = leads.find(l => l.id === id);
      if (!lead) return;
      await LeadService.updateLeadTags(lead, tags);
      addToast({ message: 'Etiquetas actualizadas', type: 'success' });

      if (userId && userName) {
        const colName = lead._collection || LeadService.getCollectionName(lead.source);
        const addedTags = tags.filter(t => !(lead.tags || []).includes(t));
        const removedTags = (lead.tags || []).filter(t => !tags.includes(t));

        if (addedTags.length > 0) {
          await ActivityService.recordActivity(lead.id, colName, userId, userName, 'tag_added', { newValue: addedTags });
        }
        if (removedTags.length > 0) {
          await ActivityService.recordActivity(lead.id, colName, userId, userName, 'tag_removed', { oldValue: removedTags });
        }
      }
    } catch (error) {
      addToast({ message: 'Error al actualizar etiquetas', type: 'error' });
    }
  }, [leads, addToast, userId, userName]);

  const assignLead = useCallback(async (id: string, assignedUserId: string) => {
    try {
      const lead = leads.find(l => l.id === id);
      if (!lead) return;
      await LeadService.assignLead(lead, assignedUserId);
      addToast({ message: 'Lead asignado', type: 'success' });

      if (userId && userName) {
        const colName = lead._collection || LeadService.getCollectionName(lead.source);
        await ActivityService.recordActivity(lead.id, colName, userId, userName, 'assigned', { newValue: assignedUserId });
      }
    } catch (error) {
      addToast({ message: 'Error al asignar lead', type: 'error' });
    }
  }, [leads, addToast, userId, userName]);

  return {
    updateLeadStatus,
    updateLeadNotes,
    updateLeadTags,
    assignLead,
    cancelLead,
    bulkCancelLeads,
    bulkStatusUpdate,
  };
}
