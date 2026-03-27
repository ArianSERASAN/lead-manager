import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Lead } from '../../types/domain';
import { calculateLeadScore, isLeadStale } from '../../lib/scoring-engine';

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Unify the three collections
    const collections = [
      { name: 'leads', source: 'landing' as const },
      { name: 'leads_descargas', source: 'web-download' as const },
      { name: 'solicitudes_contacto', source: 'web-contact' as const }
    ];

    const unsubscribers: (() => void)[] = [];
    const allLeadsMap: Record<string, Lead[]> = {};

    collections.forEach((colInfo) => {
      // Fetch all documents first to avoid complex Index requirements during MVP
      const q = query(collection(db, colInfo.name));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const colLeads: Lead[] = snapshot.docs.map(doc => {
          const data = doc.data();

          // Fallback for date fields: createdAt or fecha
          const rawDate = data.createdAt || data.fecha || Timestamp.now();

          let unified: Lead = {
            id: doc.id,
            name: data.name || data.nombre || '—',
            email: data.email || '—',
            phone: data.phone || data.telefono || '',
            company: data.company || '',
            source: colInfo.source,
            status: data.status || 'nuevo',
            createdAt: data.createdAt || data.fecha || Timestamp.now(),
            updatedAt: data.updatedAt || rawDate,
            notes: data.notes || data.notas || '',
            tags: data.tags || [],
            score: 0,
            resource: data.recurso || '',
            message: data.mensaje || data.message || '',
            customFields: data.customFields || {},
            data: data,
            _collection: colInfo.name // Track original collection
          };

          // Calculate score and check if stale
          const { score, breakdown } = calculateLeadScore(unified);
          unified.score = score;
          unified.scoreBreakdown = breakdown;
          unified.isStale = isLeadStale(unified);

          return unified;
        });

        allLeadsMap[colInfo.name] = colLeads;

        // Merge and Sort all collections
        const getSeconds = (ts: any) => {
          if (!ts) return 0;
          if (ts.seconds) return ts.seconds;
          if (ts instanceof Date) return Math.floor(ts.getTime() / 1000);
          if (typeof ts === 'string') return Math.floor(new Date(ts).getTime() / 1000);
          return 0;
        };

        const merged = Object.values(allLeadsMap).flat().sort((a, b) => {
          return getSeconds(b.createdAt) - getSeconds(a.createdAt);
        });

        setLeads(merged);
        setLoading(false);
      }, (err) => {
        console.error(`Error in collection ${colInfo.name}:`, err);
      });

      unsubscribers.push(unsubscribe);
    });

    return () => unsubscribers.forEach(unsub => unsub());
  }, []);

  return { leads, loading };
}
