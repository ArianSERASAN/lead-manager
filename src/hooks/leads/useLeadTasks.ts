import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Task } from '../../types/domain';

export function useLeadTasks(leadCollection: string, leadId: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!leadId || !leadCollection) {
      setLoading(false);
      return;
    }

    const tasksRef = collection(db, leadCollection, leadId, 'tasks');
    const q = query(tasksRef, orderBy('dueAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Task));

      setTasks(tasksData);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching lead tasks:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [leadId, leadCollection]);

  return { tasks, loading };
}
