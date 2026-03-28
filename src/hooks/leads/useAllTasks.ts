import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Task, toJSDate } from '../../types/domain';
import { getCollectionName } from '../../services/LeadService';

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
        const collections = [
          { name: 'leads', source: 'landing' as const },
          { name: 'leads_descargas', source: 'web-download' as const },
          { name: 'solicitudes_contacto', source: 'web-contact' as const }
        ];

        let allTasksList: TaskWithLead[] = [];

        for (const colInfo of collections) {
          // Get all leads from this collection
          const leadsSnapshot = await getDocs(collection(db, colInfo.name));

          // For each lead, get their tasks
          for (const leadDoc of leadsSnapshot.docs) {
            const leadId = leadDoc.id;
            const leadData = leadDoc.data();
            const tasksRef = collection(db, colInfo.name, leadId, 'tasks');

            try {
              const tasksSnapshot = await getDocs(query(tasksRef, orderBy('dueAt', 'asc')));

              const leadTasks: TaskWithLead[] = tasksSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                leadName: leadData.name || leadData.nombre || '—',
                leadEmail: leadData.email || '—',
                leadCollection: colInfo.name
              } as TaskWithLead));

              allTasksList = [...allTasksList, ...leadTasks];
            } catch (err) {
              // Collection might not exist yet, continue
              console.debug(`No tasks for lead ${leadId}`);
            }
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
          if (task.completed) return; // Skip completed tasks

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
