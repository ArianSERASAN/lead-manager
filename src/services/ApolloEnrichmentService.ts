import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Lead, ApolloEnrichment } from '../types/domain';
import { getCollectionName } from './LeadService';
import { getFunctions, httpsCallable } from 'firebase/functions';

// ─── Apollo Enrichment Service ────────────────────────────────────
// Calls the `enrichLead` Cloud Function which handles the Apollo API
// call server-side (to keep the API key secure).

const functions = getFunctions(undefined, 'europe-west1');

export interface EnrichmentResult {
  success: boolean;
  enrichment?: ApolloEnrichment;
  error?: string;
}

/**
 * Enrich a lead via the Cloud Function.
 * The Cloud Function calls Apollo's People Enrichment API and updates Firestore.
 */
export async function enrichLeadViaCloudFunction(lead: Lead): Promise<EnrichmentResult> {
  try {
    const enrichLead = httpsCallable<
      { leadId: string; collection: string },
      EnrichmentResult
    >(functions, 'enrichLead');

    const colName = lead._collection || getCollectionName(lead.source);
    const result = await enrichLead({ leadId: lead.id, collection: colName });

    return result.data;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido al enriquecer lead';
    console.error('Error calling enrichLead Cloud Function:', error);
    return { success: false, error: message };
  }
}

/**
 * Save enrichment data directly to a lead document (used by Cloud Function
 * or for manual testing when the Cloud Function is not yet deployed).
 */
export async function saveEnrichmentToLead(
  lead: Lead,
  enrichment: ApolloEnrichment
): Promise<void> {
  const colName = lead._collection || getCollectionName(lead.source);
  await updateDoc(doc(db, colName, lead.id), {
    enrichment,
    enrichedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    // Also update top-level fields if they were empty
    ...((!lead.phone && enrichment.title) ? {} : {}),
    ...(!lead.company && enrichment.organizationName ? { company: enrichment.organizationName } : {}),
  });
}

/**
 * Check if a lead has already been enriched.
 */
export function isLeadEnriched(lead: Lead): boolean {
  return !!lead.enrichment && !!lead.enrichedAt;
}
