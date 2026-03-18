import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Lead } from '../types';

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Unify the three collections
    const collections = [
      { name: 'leads', source: 'landing' },
      { name: 'leads_descargas', source: 'web-download' },
      { name: 'solicitudes_contacto', source: 'web-contact' }
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
            source: colInfo.source as any,
            status: data.status || 'nuevo',
            createdAt: data.createdAt || data.fecha || Timestamp.now(),
            resource: data.recurso || '',
            message: data.mensaje || data.message || '',
            data: data
          };

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
