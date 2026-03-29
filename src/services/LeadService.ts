import { collection, doc, addDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Lead, LeadStatus, StateChange } from '../types/domain';

// Map source to original collection name (backward compat during transition)
export function getCollectionName(source: string): string {
  switch (source) {
    case 'landing': return 'leads';
    case 'web-download': return 'leads_descargas';
    case 'web-contact': return 'solicitudes_contacto';
    case 'manual': return 'leads'; // New manual leads go to main collection
    default: return 'leads';
  }
}

// Whitelist of fields that can be updated via updateLeadField
const UPDATABLE_FIELDS = new Set([
  'name', 'email', 'phone', 'company', 'source', 'status',
  'notes', 'tags', 'message', 'assignedTo', 'assignedAt',
  'score', 'scoreBreakdown', 'pipelinePosition', 'customFields',
  'enrichment', 'enrichedAt',
  'cancellationReason', 'closedAt', 'closedBy', 'closedByName', 'stateHistory'
]);

export async function createLead(leadData: Partial<Lead>): Promise<string> {
  try {
    const colName = getCollectionName(leadData.source || 'manual');
    const docRef = await addDoc(collection(db, colName), {
      ...leadData,
      status: leadData.status || 'nuevo',
      tags: leadData.tags || [],
      score: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error al crear lead:', error);
    throw new Error('No se pudo crear el lead. Inténtalo de nuevo.');
  }
}

export async function updateLeadField(lead: Lead, field: string, value: unknown): Promise<void> {
  if (!UPDATABLE_FIELDS.has(field)) {
    throw new Error(`El campo "${field}" no se puede actualizar.`);
  }
  try {
    const colName = lead._collection || getCollectionName(lead.source);
    await updateDoc(doc(db, colName, lead.id), {
      [field]: value,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error(`Error al actualizar campo ${field}:`, error);
    throw new Error('No se pudo actualizar el lead. Inténtalo de nuevo.');
  }
}

export async function updateLeadStatus(
  lead: Lead,
  status: LeadStatus,
  actor?: string,
  actorName?: string
): Promise<void> {
  try {
    const colName = lead._collection || getCollectionName(lead.source);
    const updates: Record<string, unknown> = {
      status,
      updatedAt: serverTimestamp(),
      movedToStatusAt: serverTimestamp(),
    };

    // Registrar quién cerró el lead como ganado
    if (status === 'cerrado' && actor) {
      updates.closedAt = serverTimestamp();
      updates.closedBy = actor;
      if (actorName) updates.closedByName = actorName;
    }

    // Añadir entrada al historial de cambios de estado
    if (actor) {
      const stateChange: StateChange = {
        timestamp: new Date().toISOString(),
        actor,
        actorName,
        fromStatus: lead.status,
        toStatus: status,
      };
      updates.stateHistory = arrayUnion(stateChange);
    }

    await updateDoc(doc(db, colName, lead.id), updates);
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    throw new Error('No se pudo cambiar el estado. Inténtalo de nuevo.');
  }
}

/** Soft-cancel: marca el lead como cancelado con motivo, sin borrar de la BD */
export async function cancelLead(
  lead: Lead,
  reason: string,
  actor: string,
  actorName: string
): Promise<void> {
  try {
    const colName = lead._collection || getCollectionName(lead.source);
    const stateChange: StateChange = {
      timestamp: new Date().toISOString(),
      actor,
      actorName,
      fromStatus: lead.status,
      toStatus: 'cancelado',
      reason,
    };
    await updateDoc(doc(db, colName, lead.id), {
      status: 'cancelado',
      cancellationReason: reason,
      closedAt: serverTimestamp(),
      closedBy: actor,
      closedByName: actorName,
      updatedAt: serverTimestamp(),
      stateHistory: arrayUnion(stateChange),
    });
  } catch (error) {
    console.error('Error al cancelar lead:', error);
    throw new Error('No se pudo cancelar el lead. Inténtalo de nuevo.');
  }
}

export async function updateLeadNotes(lead: Lead, notes: string): Promise<void> {
  try {
    const colName = lead._collection || getCollectionName(lead.source);
    await updateDoc(doc(db, colName, lead.id), {
      notes,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error al guardar notas:', error);
    throw new Error('No se pudieron guardar las notas. Inténtalo de nuevo.');
  }
}

export async function updateLeadTags(lead: Lead, tags: string[]): Promise<void> {
  try {
    const colName = lead._collection || getCollectionName(lead.source);
    await updateDoc(doc(db, colName, lead.id), {
      tags,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error al actualizar etiquetas:', error);
    throw new Error('No se pudieron actualizar las etiquetas. Inténtalo de nuevo.');
  }
}

export async function assignLead(lead: Lead, userId: string): Promise<void> {
  try {
    const colName = lead._collection || getCollectionName(lead.source);
    await updateDoc(doc(db, colName, lead.id), {
      assignedTo: userId,
      assignedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error al asignar lead:', error);
    throw new Error('No se pudo asignar el lead. Inténtalo de nuevo.');
  }
}

export async function deleteLeadDoc(lead: Lead): Promise<void> {
  try {
    const colName = lead._collection || getCollectionName(lead.source);
    await deleteDoc(doc(db, colName, lead.id));
  } catch (error) {
    console.error('Error al eliminar lead:', error);
    throw new Error('No se pudo eliminar el lead. Inténtalo de nuevo.');
  }
}

export async function bulkUpdateStatus(leads: Lead[], status: LeadStatus): Promise<void> {
  try {
    const batch = writeBatch(db);
    leads.forEach(lead => {
      const colName = lead._collection || getCollectionName(lead.source);
      batch.update(doc(db, colName, lead.id), {
        status,
        updatedAt: serverTimestamp(),
        movedToStatusAt: serverTimestamp(),
      });
    });
    await batch.commit();
  } catch (error) {
    console.error('Error en actualización masiva:', error);
    throw new Error(`No se pudieron actualizar ${leads.length} leads. Inténtalo de nuevo.`);
  }
}

export async function bulkDeleteLeads(leads: Lead[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    leads.forEach(lead => {
      const colName = lead._collection || getCollectionName(lead.source);
      batch.delete(doc(db, colName, lead.id));
    });
    await batch.commit();
  } catch (error) {
    console.error('Error en eliminación masiva:', error);
    throw new Error(`No se pudieron eliminar ${leads.length} leads. Inténtalo de nuevo.`);
  }
}
