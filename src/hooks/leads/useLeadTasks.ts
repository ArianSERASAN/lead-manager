import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Task } from '../../types/domain';

const COLLECTION = 'leads';

export function useLeadTasks(_leadCollection: string, leadId: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!leadId) {
      setLoading(false);
      return;
    }

    const tasksRef = collection(db, COLLECTION, leadId, 'tasks');
    const q = query(tasksRef, orderBy('dueAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Task));

      setTasks(tasksData);
      setLoading(false);
    }, (err) => {
      console.error('Error al obtener tareas del lead:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [leadId]);

  return { tasks, loading };
}
