import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { LeadCollection, Task } from '../../types/domain';
import { getLeadCollection } from '../../lib/leads';

export function useLeadTasks(leadCollection: LeadCollection | string, leadId: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!leadId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const tasksRef = collection(db, getLeadCollection({ _collection: leadCollection as LeadCollection }), leadId, 'tasks');
    const tasksQuery = query(tasksRef, orderBy('dueAt', 'asc'));

    const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
      const tasksData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as Task));

      setTasks(tasksData);
      setLoading(false);
    }, (err) => {
      console.error('Error al obtener tareas del lead:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [leadCollection, leadId]);

  return { tasks, loading };
}
