import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AppNotification } from '../types/domain';

const COLLECTION = 'notifications';

export function subscribeToNotifications(
  userId: string,
  callback: (notifications: AppNotification[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTION),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(30)
  );
  return onSnapshot(q, (snapshot) => {
    const notifs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as AppNotification[];
    callback(notifs);
  });
}

export async function markAsRead(notifId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, notifId), { read: true });
}

export async function markAllRead(notifications: AppNotification[]): Promise<void> {
  const unread = notifications.filter((n) => !n.read);
  if (unread.length === 0) return;
  const batch = writeBatch(db);
  for (const n of unread) {
    batch.update(doc(db, COLLECTION, n.id), { read: true });
  }
  await batch.commit();
}
