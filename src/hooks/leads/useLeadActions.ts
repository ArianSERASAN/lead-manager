import { useState, useCallback, useRef } from 'react';
import { doc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
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
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const timeoutRefs = useRef<Map<string, any>>(new Map());

  const cancelDeletion = useCallback((ids: string | string[]) => {
    const idList = Array.isArray(ids) ? ids : [ids];

    idList.forEach(id => {
      const timeoutId = timeoutRefs.current.get(id);
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutRefs.current.delete(id);
      }
    });

    setPendingDeleteIds(prev => prev.filter(pid => !idList.includes(pid)));
    console.log(`Borrado cancelado para: ${idList.join(', ')}`);
  }, []);

  const deleteLead = useCallback(async (id: string) => {
    const leadToDelete = leads.find(l => l.id === id);
    if (!leadToDelete) return;

    setPendingDeleteIds(prev => [...prev, id]);

    addToast({
      message: `${leadToDelete.name} será borrado...`,
      type: 'undo',
      onUndo: () => cancelDeletion(id)
    });

    const timeout = setTimeout(async () => {
      if (timeoutRefs.current.has(id)) {
        try {
          await LeadService.deleteLeadDoc(leadToDelete);
          timeoutRefs.current.delete(id);
          setPendingDeleteIds(prev => prev.filter(pid => pid !== id));
        } catch (err) {
          console.error("Error deleting lead:", err);
          setPendingDeleteIds(prev => prev.filter(pid => pid !== id));
        }
      }
    }, 5000);

    timeoutRefs.current.set(id, timeout);
  }, [leads, addToast, cancelDeletion]);

  const bulkDelete = useCallback(async (selectedIds: string[]) => {
    if (selectedIds.length === 0) return;

    const idsToProcess = [...selectedIds];
    const leadNames = leads
      .filter(l => idsToProcess.includes(l.id))
      .map(l => l.name)
      .slice(0, 2)
      .join(', ') + (idsToProcess.length > 2 ? '...' : '');

    // Optimistic UI
    setPendingDeleteIds(prev => [...prev, ...idsToProcess]);
    clearSelection();

    addToast({
      message: `${idsToProcess.length} leads serán borrados (${leadNames})`,
      type: 'undo',
      onUndo: () => cancelDeletion(idsToProcess)
    });

    const timeout = setTimeout(async () => {
      // Check if the first ID is still in the pending map (to verify the batch wasn't canceled)
      if (timeoutRefs.current.has(idsToProcess[0])) {
        console.log(`Ejecutando borrado masivo para ${idsToProcess.length} leads...`);
        try {
          const leadsToDelete = leads.filter(l => idsToProcess.includes(l.id));
          await LeadService.bulkDeleteLeads(leadsToDelete);

          idsToProcess.forEach(id => timeoutRefs.current.delete(id));
          setPendingDeleteIds(prev => prev.filter(pid => !idsToProcess.includes(pid)));
        } catch (err) {
          console.error("Error in bulk delete batch:", err);
          setPendingDeleteIds(prev => prev.filter(pid => !idsToProcess.includes(pid)));
        }
      }
    }, 5000);

    idsToProcess.forEach(id => timeoutRefs.current.set(id, timeout));
  }, [leads, addToast, cancelDeletion, clearSelection]);

  const updateLeadStatus = useCallback(async (id: string, status: LeadStatus) => {
    try {
      const lead = leads.find(l => l.id === id);
      if (!lead) return;
      await LeadService.updateLeadStatus(lead, status);
      addToast({ message: `Estado actualizado a ${status}`, type: 'success' });

      // Record activity
      if (userId && userName) {
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

      // Record activity
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

      // Record activity for each lead
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

      // Record activity
      if (userId && userName) {
        const colName = lead._collection || LeadService.getCollectionName(lead.source);
        const addedTags = tags.filter(t => !(lead.tags || []).includes(t));
        const removedTags = (lead.tags || []).filter(t => !tags.includes(t));

        if (addedTags.length > 0) {
          await ActivityService.recordActivity(
            lead.id,
            colName,
            userId,
            userName,
            'tag_added',
            { newValue: addedTags }
          );
        }

        if (removedTags.length > 0) {
          await ActivityService.recordActivity(
            lead.id,
            colName,
            userId,
            userName,
            'tag_removed',
            { oldValue: removedTags }
          );
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

      // Record activity
      if (userId && userName) {
        const colName = lead._collection || LeadService.getCollectionName(lead.source);
        await ActivityService.recordActivity(
          lead.id,
          colName,
          userId,
          userName,
          'assigned',
          { newValue: assignedUserId }
        );
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
    deleteLead,
    bulkStatusUpdate,
    bulkDelete,
    pendingDeleteIds
  };
}
