import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Activity, ActivityAction } from '../types/domain';

const COLLECTION = 'leads';

export async function recordActivity(
  leadId: string,
  _leadCollection: string, // kept for API compat, ignored — always uses 'leads'
  actor: string,
  actorName: string,
  action: ActivityAction,
  details: Activity['details']
): Promise<void> {
  try {
    const activityRef = collection(db, COLLECTION, leadId, 'activity');
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
