import { collection, doc, addDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp, arrayUnion, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Lead, LeadStatus, StateChange } from '../types/domain';
import { DEFAULT_LEAD_COLLECTION, getLeadCollection, LEAD_COLLECTIONS } from '../lib/leads';

const COLLECTION = DEFAULT_LEAD_COLLECTION;

// Whitelist of fields that can be updated via updateLeadField
const UPDATABLE_FIELDS = new Set([
  'name', 'email', 'phone', 'company', 'source', 'status',
  'notes', 'tags', 'message', 'assignedTo', 'assignedAt',
  'score', 'scoreBreakdown', 'pipelinePosition', 'customFields',
  'enrichment', 'enrichedAt',
  'cancellationReason', 'closedAt', 'closedBy', 'closedByName', 'stateHistory',
  'attachments',
  'apellidos', 'sector', 'cargo', 'localidad', 'direccion',
  'tipoInmueble', 'superficie', 'referenciaCatastral',
]);

export async function createLead(leadData: Partial<Lead>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, COLLECTION), {
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
    await updateDoc(doc(db, getLeadCollection(lead), lead.id), {
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
    const updates: Record<string, unknown> = {
      status,
      updatedAt: serverTimestamp(),
      movedToStatusAt: serverTimestamp(),
    };

    if (status === 'cerrado' && actor) {
      updates.closedAt = serverTimestamp();
      updates.closedBy = actor;
      if (actorName) updates.closedByName = actorName;
    }

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

    await updateDoc(doc(db, getLeadCollection(lead), lead.id), updates);
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    throw new Error('No se pudo cambiar el estado. Inténtalo de nuevo.');
  }
}

export async function cancelLead(
  lead: Lead,
  reason: string,
  actor: string,
  actorName: string
): Promise<void> {
  try {
    const stateChange: StateChange = {
      timestamp: new Date().toISOString(),
      actor,
      actorName,
      fromStatus: lead.status,
      toStatus: 'cancelado',
      reason,
    };
    await updateDoc(doc(db, getLeadCollection(lead), lead.id), {
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
    await updateDoc(doc(db, getLeadCollection(lead), lead.id), {
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
    await updateDoc(doc(db, getLeadCollection(lead), lead.id), {
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
    await updateDoc(doc(db, getLeadCollection(lead), lead.id), {
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
    await deleteDoc(doc(db, getLeadCollection(lead), lead.id));
  } catch (error) {
    console.error('Error al eliminar lead:', error);
    throw new Error('No se pudo eliminar el lead. Inténtalo de nuevo.');
  }
}

export async function bulkUpdateStatus(leads: Lead[], status: LeadStatus): Promise<void> {
  try {
    const batch = writeBatch(db);
    leads.forEach(lead => {
      batch.update(doc(db, getLeadCollection(lead), lead.id), {
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
      batch.delete(doc(db, getLeadCollection(lead), lead.id));
    });
    await batch.commit();
  } catch (error) {
    console.error('Error en eliminación masiva:', error);
    throw new Error(`No se pudieron eliminar ${leads.length} leads. Inténtalo de nuevo.`);
  }
}

/**
 * Checks if a lead with the given email already exists.
 * Returns the matching lead or null.
 */
export async function checkDuplicateEmail(email: string): Promise<{ id: string; name: string; status: string } | null> {
  const normalized = email.toLowerCase().trim();
  if (!normalized) return null;

  for (const collectionName of LEAD_COLLECTIONS) {
    const snapshot = await getDocs(query(
      collection(db, collectionName),
      where('email', '==', normalized),
      limit(1)
    ));

    if (!snapshot.empty) {
      const d = snapshot.docs[0];
      const data = d.data();
      return { id: d.id, name: data.name || data.nombre || '\u2014', status: data.status || 'nuevo' };
    }
  }

  return null;
}

export async function bulkAssign(leads: Lead[], userId: string): Promise<void> {
  const BATCH_LIMIT = 499;
  for (let i = 0; i < leads.length; i += BATCH_LIMIT) {
    const chunk = leads.slice(i, i + BATCH_LIMIT);
    const batch = writeBatch(db);
    for (const lead of chunk) {
      batch.update(doc(db, getLeadCollection(lead), lead.id), {
        assignedTo: userId,
        assignedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  }
}

export async function bulkAddTag(leads: Lead[], tag: string): Promise<void> {
  const BATCH_LIMIT = 499;
  for (let i = 0; i < leads.length; i += BATCH_LIMIT) {
    const chunk = leads.slice(i, i + BATCH_LIMIT);
    const batch = writeBatch(db);
    for (const lead of chunk) {
      batch.update(doc(db, getLeadCollection(lead), lead.id), {
        tags: arrayUnion(tag),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  }
}
