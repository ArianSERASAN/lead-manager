import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, QueryConstraint } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Activity } from '../../types/domain';

interface UseLeadActivityResult {
  activities: Activity[];
  loading: boolean;
}

export function useLeadActivity(leadId: string, leadCollection: string): UseLeadActivityResult {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!leadId || !leadCollection) {
      setActivities([]);
      setLoading(false);
      return;
    }

    const activityRef = collection(db, leadCollection, leadId, 'activity');
    const q = query(activityRef, orderBy('timestamp', 'desc') as QueryConstraint);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activityData: Activity[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        leadId,
        ...doc.data(),
      })) as Activity[];
      setActivities(activityData);
      setLoading(false);
    }, (error) => {
      console.error('Error loading activities:', error);
      // Handle the case where the subcollection doesn't exist yet
      setActivities([]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [leadId, leadCollection]);

  return { activities, loading };
}
