import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Activity, ActivityAction, LeadCollection } from '../types/domain';
import { getLeadCollection } from '../lib/leads';

export async function recordActivity(
  leadId: string,
  leadCollection: LeadCollection | string,
  actor: string,
  actorName: string,
  action: ActivityAction,
  details: Activity['details']
): Promise<void> {
  try {
    const activityRef = collection(
      db,
      getLeadCollection({ _collection: leadCollection as LeadCollection }),
      leadId,
      'activity'
    );

    await addDoc(activityRef, {
      leadId,
      timestamp: serverTimestamp(),
      actor,
      actorName,
      action,
      details,
    });
  } catch (error) {
    // Activity recording should not block the main operation.
    console.error('Error al registrar actividad:', error);
  }
}
