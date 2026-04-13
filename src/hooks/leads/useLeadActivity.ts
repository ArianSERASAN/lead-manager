import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, QueryConstraint } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Activity, LeadCollection } from '../../types/domain';
import { getLeadCollection } from '../../lib/leads';

interface UseLeadActivityResult {
  activities: Activity[];
  loading: boolean;
}

export function useLeadActivity(leadId: string, leadCollection?: LeadCollection | string): UseLeadActivityResult {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!leadId) {
      setActivities([]);
      setLoading(false);
      return;
    }

    const activityRef = collection(
      db,
      getLeadCollection({ _collection: leadCollection as LeadCollection }),
      leadId,
      'activity'
    );
    const activityQuery = query(activityRef, orderBy('timestamp', 'desc') as QueryConstraint);

    const unsubscribe = onSnapshot(activityQuery, (snapshot) => {
      const activityData: Activity[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        leadId,
        ...doc.data(),
      })) as Activity[];

      setActivities(activityData);
      setLoading(false);
    }, (error) => {
      console.error('Error al cargar actividades:', error);
      setActivities([]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [leadCollection, leadId]);

  return { activities, loading };
}
