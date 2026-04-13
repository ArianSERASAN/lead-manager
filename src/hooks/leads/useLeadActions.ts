import { useCallback } from 'react';
import { Lead, LeadStatus } from '../../types/domain';
import * as LeadService from '../../services/LeadService';
import * as ActivityService from '../../services/ActivityService';
import { getLeadCollection, getLeadKey } from '../../lib/leads';

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
  const findLead = useCallback((leadIdOrKey: string) => (
    leads.find((lead) => lead.id === leadIdOrKey || getLeadKey(lead) === leadIdOrKey)
  ), [leads]);

  const cancelLead = useCallback(async (id: string, reason: string) => {
    const lead = findLead(id);
    if (!lead || !userId || !userName) return;

    try {
      await LeadService.cancelLead(lead, reason, userId, userName);
      addToast({ message: `${lead.name} cancelado`, type: 'success' });

      await ActivityService.recordActivity(
        lead.id,
        getLeadCollection(lead),
        userId,
        userName,
        'cancelled',
        { field: 'status', oldValue: lead.status, newValue: 'cancelado', note: reason }
      );
    } catch {
      addToast({ message: 'Error al cancelar el lead', type: 'error' });
    }
  }, [addToast, findLead, userId, userName]);

  const bulkCancelLeads = useCallback(async (selectedIds: string[], reason: string) => {
    if (selectedIds.length === 0 || !userId || !userName) return;

    try {
      const selectedLeadSet = new Set(selectedIds);
      const leadsToCancel = leads.filter((lead) => selectedLeadSet.has(lead.id) || selectedLeadSet.has(getLeadKey(lead)));
      await Promise.all(leadsToCancel.map((lead) => LeadService.cancelLead(lead, reason, userId, userName)));
      addToast({ message: `${selectedIds.length} leads cancelados`, type: 'success' });

      await Promise.all(leadsToCancel.map((lead) =>
        ActivityService.recordActivity(
          lead.id,
          getLeadCollection(lead),
          userId,
          userName,
          'cancelled',
          { field: 'status', oldValue: lead.status, newValue: 'cancelado', note: reason }
        )
      ));

      clearSelection();
    } catch {
      addToast({ message: 'Error al cancelar los leads', type: 'error' });
    }
  }, [addToast, clearSelection, leads, userId, userName]);

  const updateLeadStatus = useCallback(async (id: string, status: LeadStatus) => {
    try {
      const lead = findLead(id);
      if (!lead) return;

      const previousStatus = lead.status;
      await LeadService.updateLeadStatus(lead, status, userId, userName);

      addToast({
        message: status === 'cerrado' ? 'Cerrado como ganado' : `Estado: ${status}`,
        type: 'undo',
        onUndo: async () => {
          try {
            await LeadService.updateLeadStatus({ ...lead, status } as Lead, previousStatus, userId, userName);
          } catch {}
        },
      });

      if (userId && userName) {
        await ActivityService.recordActivity(
          lead.id,
          getLeadCollection(lead),
          userId,
          userName,
          status === 'cerrado' ? 'closed' : 'status_change',
          { field: 'status', oldValue: lead.status, newValue: status }
        );
      }
    } catch {
      addToast({ message: 'Error al actualizar estado', type: 'error' });
    }
  }, [addToast, findLead, userId, userName]);

  const updateLeadNotes = useCallback(async (id: string, notes: string) => {
    try {
      const lead = findLead(id);
      if (!lead) return;

      const previousNotes = lead.notes || '';
      await LeadService.updateLeadNotes(lead, notes);

      addToast({
        message: 'Notas guardadas',
        type: 'undo',
        onUndo: async () => {
          try {
            await LeadService.updateLeadNotes(lead, previousNotes);
          } catch {}
        },
      });

      if (userId && userName) {
        await ActivityService.recordActivity(
          lead.id,
          getLeadCollection(lead),
          userId,
          userName,
          'note_added',
          { note: notes }
        );
      }
    } catch {
      addToast({ message: 'Error al guardar notas', type: 'error' });
    }
  }, [addToast, findLead, userId, userName]);

  const bulkStatusUpdate = useCallback(async (selectedIds: string[], status: LeadStatus) => {
    if (selectedIds.length === 0 || !status) return;

    try {
      const selectedLeadSet = new Set(selectedIds);
      const leadsToUpdate = leads.filter((lead) => selectedLeadSet.has(lead.id) || selectedLeadSet.has(getLeadKey(lead)));
      await LeadService.bulkUpdateStatus(leadsToUpdate, status);
      addToast({ message: `${selectedIds.length} leads actualizados`, type: 'success' });

      if (userId && userName) {
        await Promise.all(leadsToUpdate.map((lead) =>
          ActivityService.recordActivity(
            lead.id,
            getLeadCollection(lead),
            userId,
            userName,
            'status_change',
            { field: 'status', oldValue: lead.status, newValue: status }
          )
        ));
      }

      clearSelection();
    } catch {
      addToast({ message: 'Error en actualizacion masiva', type: 'error' });
    }
  }, [addToast, clearSelection, leads, userId, userName]);

  const updateLeadTags = useCallback(async (id: string, tags: string[]) => {
    try {
      const lead = findLead(id);
      if (!lead) return;

      const previousTags = [...(lead.tags || [])];
      await LeadService.updateLeadTags(lead, tags);

      addToast({
        message: 'Etiquetas actualizadas',
        type: 'undo',
        onUndo: async () => {
          try {
            await LeadService.updateLeadTags(lead, previousTags);
          } catch {}
        },
      });

      if (userId && userName) {
        const addedTags = tags.filter((tag) => !previousTags.includes(tag));
        const removedTags = previousTags.filter((tag) => !tags.includes(tag));

        if (addedTags.length > 0) {
          await ActivityService.recordActivity(
            lead.id,
            getLeadCollection(lead),
            userId,
            userName,
            'tag_added',
            { newValue: addedTags }
          );
        }

        if (removedTags.length > 0) {
          await ActivityService.recordActivity(
            lead.id,
            getLeadCollection(lead),
            userId,
            userName,
            'tag_removed',
            { oldValue: removedTags }
          );
        }
      }
    } catch {
      addToast({ message: 'Error al actualizar etiquetas', type: 'error' });
    }
  }, [addToast, findLead, userId, userName]);

  const assignLead = useCallback(async (id: string, assignedUserId: string) => {
    try {
      const lead = findLead(id);
      if (!lead) return;

      const previousAssignee = lead.assignedTo;
      await LeadService.assignLead(lead, assignedUserId);

      addToast({
        message: 'Lead asignado',
        type: 'undo',
        onUndo: async () => {
          try {
            if (previousAssignee) {
              await LeadService.assignLead(lead, previousAssignee);
            } else {
              await LeadService.updateLeadField(lead, 'assignedTo', null);
            }
          } catch {}
        },
      });

      if (userId && userName) {
        await ActivityService.recordActivity(
          lead.id,
          getLeadCollection(lead),
          userId,
          userName,
          'assigned',
          { newValue: assignedUserId }
        );
      }
    } catch {
      addToast({ message: 'Error al asignar lead', type: 'error' });
    }
  }, [addToast, findLead, userId, userName]);

  const bulkAssignLeads = useCallback(async (selectedIds: string[], assignToUserId: string) => {
    if (selectedIds.length === 0 || !assignToUserId) return;

    try {
      const selectedLeadSet = new Set(selectedIds);
      const leadsToAssign = leads.filter((lead) => selectedLeadSet.has(lead.id) || selectedLeadSet.has(getLeadKey(lead)));
      await LeadService.bulkAssign(leadsToAssign, assignToUserId);
      addToast({ message: `${selectedIds.length} leads asignados`, type: 'success' });
      clearSelection();
    } catch {
      addToast({ message: 'Error al asignar leads', type: 'error' });
    }
  }, [addToast, clearSelection, leads]);

  const bulkAddTagToLeads = useCallback(async (selectedIds: string[], tag: string) => {
    if (selectedIds.length === 0 || !tag) return;

    try {
      const selectedLeadSet = new Set(selectedIds);
      const leadsToTag = leads.filter((lead) => selectedLeadSet.has(lead.id) || selectedLeadSet.has(getLeadKey(lead)));
      await LeadService.bulkAddTag(leadsToTag, tag);
      addToast({ message: `Etiqueta "${tag}" anadida a ${selectedIds.length} leads`, type: 'success' });
      clearSelection();
    } catch {
      addToast({ message: 'Error al etiquetar leads', type: 'error' });
    }
  }, [addToast, clearSelection, leads]);

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
