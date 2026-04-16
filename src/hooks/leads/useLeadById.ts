import { useState, useEffect } from 'react';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Lead, LeadCollection } from '../../types/domain';
import { DEFAULT_LEAD_COLLECTION, LEAD_COLLECTIONS, normalizeLeadSnapshot } from '../../lib/leads';

export function useLeadById(collectionName: string, id: string) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let unsub: (() => void) | null = null;
    let cancelled = false;

    const resolveAndSubscribe = async () => {
      setLoading(true);
      setError(null);

      const candidates = [
        collectionName,
        ...LEAD_COLLECTIONS.filter((c) => c !== collectionName),
      ].filter(Boolean);

      let resolvedCollection: string | null = null;

      for (const candidate of candidates) {
        try {
          const candidateSnapshot = await getDoc(doc(db, candidate, id));
          if (candidateSnapshot.exists()) {
            resolvedCollection = candidate;
            break;
          }
        } catch {
          // Try next collection candidate
        }
      }

      if (!resolvedCollection) {
        if (!cancelled) {
          setError('Lead no encontrado');
          setLead(null);
          setLoading(false);
        }
        return;
      }

      if (cancelled) return;

      unsub = onSnapshot(
        doc(db, resolvedCollection, id),
        (snapshot) => {
          if (!snapshot.exists()) {
            setError('Lead no encontrado');
            setLead(null);
            setLoading(false);
            return;
          }

          setLead(normalizeLeadSnapshot(
            {
              id: snapshot.id,
              data: () => snapshot.data(),
            },
            (resolvedCollection as LeadCollection) || DEFAULT_LEAD_COLLECTION
          ));
          setError(null);
          setLoading(false);
        },
        (err) => {
          setError(err.message);
          setLoading(false);
        }
      );
    };

    void resolveAndSubscribe();

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [collectionName, id]);

  return { lead, loading, error };
}
