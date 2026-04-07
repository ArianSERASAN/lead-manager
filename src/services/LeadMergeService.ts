import { doc, writeBatch, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Lead } from '../types/domain';
import * as ActivityService from './ActivityService';

/**
 * Merge two leads: update the "keep" lead with merged fields, delete the "discard" lead.
 * Records an activity entry on the kept lead.
 */
export async function mergeLeads(
  keepLead: Lead,
  discardLead: Lead,
  mergedFields: Partial<Lead>,
  userId: string,
  userName: string
): Promise<void> {
  const batch = writeBatch(db);
  const collection = keepLead._collection || 'leads';

  // Update the kept lead with merged data
  const updateData: Record<string, unknown> = {
    ...mergedFields,
    updatedAt: serverTimestamp(),
  };

  // Remove internal fields that shouldn't be written to Firestore
  delete updateData.id;
  delete updateData._collection;
  delete updateData.data;
  delete updateData.score;
  delete updateData.scoreBreakdown;
  delete updateData.isStale;

  batch.update(doc(db, collection, keepLead.id), updateData);

  // Delete the discarded lead
  batch.delete(doc(db, collection, discardLead.id));

  await batch.commit();

  // Record activity
  await ActivityService.recordActivity(
    keepLead.id,
    collection,
    userId,
    userName,
    'field_updated',
    {
      field: 'fusión de leads',
      oldValue: `Lead eliminado: ${discardLead.name} (${discardLead.email})`,
      newValue: `Datos fusionados en ${keepLead.name}`,
    }
  );
}

/**
 * Given two leads and field-level choices, compute the merged result.
 * Returns a Partial<Lead> with the chosen values.
 */
export function computeMergedFields(
  leadA: Lead,
  leadB: Lead,
  choices: Record<string, 'a' | 'b'>
): Partial<Lead> {
  const result: Record<string, unknown> = {};

  const mergeableFields = [
    'name', 'email', 'phone', 'company', 'source', 'status',
    'apellidos', 'sector', 'cargo', 'localidad', 'direccion',
    'tipoInmueble', 'superficie', 'referenciaCatastral', 'message',
  ] as const;

  for (const field of mergeableFields) {
    const choice = choices[field] || 'a';
    result[field] = choice === 'a' ? leadA[field] : leadB[field];
  }

  // Merge tags: union of both
  const tagsA = leadA.tags || [];
  const tagsB = leadB.tags || [];
  result.tags = [...new Set([...tagsA, ...tagsB])];

  // Merge notes: concatenate if both exist
  const notesA = leadA.notes || '';
  const notesB = leadB.notes || '';
  if (notesA && notesB) {
    result.notes = `${notesA}\n\n---\n\n${notesB}`;
  } else {
    result.notes = notesA || notesB;
  }

  // Merge stateHistory: concatenate chronologically
  const histA = leadA.stateHistory || [];
  const histB = leadB.stateHistory || [];
  result.stateHistory = [...histA, ...histB].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Merge customFields: union (A takes precedence on conflicts)
  const cfA = leadA.customFields || {};
  const cfB = leadB.customFields || {};
  result.customFields = { ...cfB, ...cfA };

  // Merge attachments
  const attA = leadA.attachments || [];
  const attB = leadB.attachments || [];
  result.attachments = [...attA, ...attB];

  return result as Partial<Lead>;
}
