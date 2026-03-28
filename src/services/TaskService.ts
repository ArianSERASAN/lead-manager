import { collection, addDoc, updateDoc, deleteDoc, serverTimestamp, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Task } from '../types/domain';

export async function createTask(
  leadCollection: string,
  leadId: string,
  task: Omit<Task, 'id' | 'createdAt'>
): Promise<string> {
  try {
    const taskRef = collection(db, leadCollection, leadId, 'tasks');
    const docRef = await addDoc(taskRef, {
      ...task,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error al crear tarea:', error);
    throw new Error('No se pudo crear la tarea. Inténtalo de nuevo.');
  }
}

export async function updateTask(
  leadCollection: string,
  leadId: string,
  taskId: string,
  data: Partial<Task>
): Promise<void> {
  try {
    const taskRef = doc(db, leadCollection, leadId, 'tasks', taskId);
    await updateDoc(taskRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error al actualizar tarea:', error);
    throw new Error('No se pudo actualizar la tarea. Inténtalo de nuevo.');
  }
}

export async function deleteTask(
  leadCollection: string,
  leadId: string,
  taskId: string
): Promise<void> {
  try {
    const taskRef = doc(db, leadCollection, leadId, 'tasks', taskId);
    await deleteDoc(taskRef);
  } catch (error) {
    console.error('Error al eliminar tarea:', error);
    throw new Error('No se pudo eliminar la tarea. Inténtalo de nuevo.');
  }
}

export async function completeTask(
  leadCollection: string,
  leadId: string,
  taskId: string,
  userId: string
): Promise<void> {
  try {
    const taskRef = doc(db, leadCollection, leadId, 'tasks', taskId);
    await updateDoc(taskRef, {
      completed: true,
      completedAt: serverTimestamp(),
      completedBy: userId
    });
  } catch (error) {
    console.error('Error al completar tarea:', error);
    throw new Error('No se pudo completar la tarea. Inténtalo de nuevo.');
  }
}

// Helper to create a top-level tasks collection for easier querying
export async function recordTaskActivity(
  leadId: string,
  leadCollection: string,
  taskId: string,
  action: 'created' | 'completed' | 'deleted',
  createdBy: string
): Promise<void> {
  try {
    const tasksRef = collection(db, 'tasks');
    await addDoc(tasksRef, {
      leadId,
      leadCollection,
      taskId,
      action,
      createdBy,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error al registrar actividad de tarea:', error);
  }
}
