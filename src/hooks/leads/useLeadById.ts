import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Lead, LeadCollection } from '../../types/domain';
import { DEFAULT_LEAD_COLLECTION, normalizeLeadSnapshot } from '../../lib/leads';

export function useLeadById(collectionName: string, id: string) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!collectionName || !id) return;

    const unsubscribe = onSnapshot(
      doc(db, collectionName, id),
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
          (collectionName as LeadCollection) || DEFAULT_LEAD_COLLECTION
        ));
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName, id]);

  return { lead, loading, error };
}
