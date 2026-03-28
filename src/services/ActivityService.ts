import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Activity, ActivityAction } from '../types/domain';

export async function recordActivity(
  leadId: string,
  leadCollection: string,
  actor: string,
  actorName: string,
  action: ActivityAction,
  details: Activity['details']
): Promise<void> {
  try {
    // Store activity in a subcollection of the lead
    const activityRef = collection(db, leadCollection, leadId, 'activity');
    await addDoc(activityRef, {
      leadId,
      timestamp: serverTimestamp(),
      actor,
      actorName,
      action,
      details,
    });
  } catch (error) {
    // Activity recording should not block the main operation
    console.error('Error al registrar actividad:', error);
  }
}
