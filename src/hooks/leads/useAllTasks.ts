import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Task, toJSDate } from '../../types/domain';
import { LEAD_COLLECTIONS } from '../../lib/leads';

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
    upcoming: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllTasks = async () => {
      try {
        const taskGroups = await Promise.all(
          LEAD_COLLECTIONS.map(async (leadCollection) => {
            const leadsSnapshot = await getDocs(collection(db, leadCollection));

            const perLeadResults = await Promise.all(
              leadsSnapshot.docs.map(async (leadDoc) => {
                const leadData = leadDoc.data();
                const tasksRef = collection(db, leadCollection, leadDoc.id, 'tasks');

                try {
                  const tasksSnapshot = await getDocs(query(tasksRef, orderBy('dueAt', 'asc')));
                  return tasksSnapshot.docs.map((taskDoc) => ({
                    id: taskDoc.id,
                    ...taskDoc.data(),
                    leadName: leadData.name || leadData.nombre || '-',
                    leadEmail: leadData.email || '-',
                    leadCollection,
                  } as TaskWithLead));
                } catch {
                  return [] as TaskWithLead[];
                }
              })
            );

            return perLeadResults.flat();
          })
        );

        const allTasksList = taskGroups.flat().sort((a, b) => toJSDate(a.dueAt).getTime() - toJSDate(b.dueAt).getTime());
        setAllTasks(allTasksList);

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const nextGroupedTasks: GroupedTasks = {
          overdue: [],
          today: [],
          upcoming: [],
        };

        allTasksList.forEach((task) => {
          if (task.completed) return;

          const dueDate = toJSDate(task.dueAt);
          const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

          if (dueDateOnly < today) {
            nextGroupedTasks.overdue.push(task);
          } else if (dueDateOnly.getTime() === today.getTime()) {
            nextGroupedTasks.today.push(task);
          } else {
            nextGroupedTasks.upcoming.push(task);
          }
        });

        setGroupedTasks(nextGroupedTasks);
        setLoading(false);
      } catch (err) {
        console.error('Error al obtener todas las tareas:', err);
        setLoading(false);
      }
    };

    fetchAllTasks();
  }, []);

  return { allTasks, groupedTasks, loading };
}
