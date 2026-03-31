import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Task, toJSDate } from '../../types/domain';

const COLLECTION = 'leads';

export interface TaskWithLead extends Task {
  leadName?: string;
  leadEmail?: string;
  leadCollection?: string;
}

export interface GroupedTasks {
  overdue: TaskWithLead[];
  today: TaskWithLead[];
  upcoming: TaskWithLead[];
}

export function useAllTasks() {
  const [allTasks, setAllTasks] = useState<TaskWithLead[]>([]);
  const [groupedTasks, setGroupedTasks] = useState<GroupedTasks>({
    overdue: [],
    today: [],
    upcoming: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllTasks = async () => {
      try {
        let allTasksList: TaskWithLead[] = [];

        // Single collection query
        const leadsSnapshot = await getDocs(collection(db, COLLECTION));

        for (const leadDoc of leadsSnapshot.docs) {
          const leadId = leadDoc.id;
          const leadData = leadDoc.data();
          const tasksRef = collection(db, COLLECTION, leadId, 'tasks');

          try {
            const tasksSnapshot = await getDocs(query(tasksRef, orderBy('dueAt', 'asc')));

            const leadTasks: TaskWithLead[] = tasksSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              leadName: leadData.name || leadData.nombre || '—',
              leadEmail: leadData.email || '—',
              leadCollection: COLLECTION
            } as TaskWithLead));

            allTasksList = [...allTasksList, ...leadTasks];
          } catch {
            // Collection might not exist yet, continue
          }
        }

        // Sort by dueAt
        allTasksList.sort((a, b) => {
          const aTime = toJSDate(a.dueAt).getTime();
          const bTime = toJSDate(b.dueAt).getTime();
          return aTime - bTime;
        });

        setAllTasks(allTasksList);

        // Group tasks
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const grouped: GroupedTasks = {
          overdue: [],
          today: [],
          upcoming: []
        };

        allTasksList.forEach(task => {
          if (task.completed) return;

          const dueDate = toJSDate(task.dueAt);
          const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

          if (dueDateOnly < today) {
            grouped.overdue.push(task);
          } else if (dueDateOnly.getTime() === today.getTime()) {
            grouped.today.push(task);
          } else {
            grouped.upcoming.push(task);
          }
        });

        setGroupedTasks(grouped);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching all tasks:', err);
        setLoading(false);
      }
    };

    fetchAllTasks();
  }, []);

  return { allTasks, groupedTasks, loading };
}
