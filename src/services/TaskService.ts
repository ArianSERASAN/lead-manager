import { collection, addDoc, updateDoc, deleteDoc, serverTimestamp, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { LeadCollection, Task } from '../types/domain';
import { getLeadCollection } from '../lib/leads';

export async function createTask(
  leadCollection: LeadCollection | string,
  leadId: string,
  task: Omit<Task, 'id' | 'createdAt'>
): Promise<string> {
  try {
    const taskRef = collection(db, getLeadCollection({ _collection: leadCollection as LeadCollection }), leadId, 'tasks');
    const docRef = await addDoc(taskRef, {
      ...task,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error al crear tarea:', error);
    throw new Error('No se pudo crear la tarea. Intentalo de nuevo.');
  }
}

export async function updateTask(
  leadCollection: LeadCollection | string,
  leadId: string,
  taskId: string,
  data: Partial<Task>
): Promise<void> {
  try {
    const taskRef = doc(db, getLeadCollection({ _collection: leadCollection as LeadCollection }), leadId, 'tasks', taskId);
    await updateDoc(taskRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error al actualizar tarea:', error);
    throw new Error('No se pudo actualizar la tarea. Intentalo de nuevo.');
  }
}

export async function deleteTask(
  leadCollection: LeadCollection | string,
  leadId: string,
  taskId: string
): Promise<void> {
  try {
    const taskRef = doc(db, getLeadCollection({ _collection: leadCollection as LeadCollection }), leadId, 'tasks', taskId);
    await deleteDoc(taskRef);
  } catch (error) {
    console.error('Error al eliminar tarea:', error);
    throw new Error('No se pudo eliminar la tarea. Intentalo de nuevo.');
  }
}

export async function completeTask(
  leadCollection: LeadCollection | string,
  leadId: string,
  taskId: string,
  userId: string
): Promise<void> {
  try {
    const taskRef = doc(db, getLeadCollection({ _collection: leadCollection as LeadCollection }), leadId, 'tasks', taskId);
    await updateDoc(taskRef, {
      completed: true,
      completedAt: serverTimestamp(),
      completedBy: userId,
    });
  } catch (error) {
    console.error('Error al completar tarea:', error);
    throw new Error('No se pudo completar la tarea. Intentalo de nuevo.');
  }
}

export async function recordTaskActivity(
  leadId: string,
  leadCollection: LeadCollection | string,
  taskId: string,
  action: 'created' | 'completed' | 'deleted',
  createdBy: string
): Promise<void> {
  try {
    const tasksRef = collection(db, 'tasks');
    await addDoc(tasksRef, {
      leadId,
      leadCollection: getLeadCollection({ _collection: leadCollection as LeadCollection }),
      taskId,
      action,
      createdBy,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error al registrar actividad de tarea:', error);
  }
}
