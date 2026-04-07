import { getMessaging, getToken, onMessage, isSupported, type Messaging } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { app } from './firebase';
import { db } from './firebase';

let messagingInstance: Messaging | null = null;

/**
 * Lazily initialize Firebase Messaging.
 * Returns null if not supported (e.g., Firefox private mode, older Safari).
 */
export async function initMessaging(): Promise<Messaging | null> {
  if (messagingInstance) return messagingInstance;

  const supported = await isSupported();
  if (!supported) return null;

  messagingInstance = getMessaging(app);
  return messagingInstance;
}

/**
 * Request notification permission and save FCM token to Firestore.
 * Returns the token string or null if permission denied / not supported.
 */
export async function requestNotificationPermission(userId: string): Promise<string | null> {
  const messaging = await initMessaging();
  if (!messaging) return null;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.error('VITE_FIREBASE_VAPID_KEY no definida en .env');
    return null;
  }

  try {
    const token = await getToken(messaging, { vapidKey });
    if (token) {
      // Save token to user's Firestore doc
      await setDoc(
        doc(db, 'users', userId, 'fcmTokens', token),
        { token, createdAt: serverTimestamp(), userAgent: navigator.userAgent },
        { merge: true }
      );
    }
    return token;
  } catch (err) {
    console.error('Error al obtener token FCM:', err);
    return null;
  }
}

/**
 * Register a callback for foreground messages.
 * Returns an unsubscribe function, or null if messaging not supported.
 */
export async function onForegroundMessage(
  callback: (payload: { title?: string; body?: string }) => void
): Promise<(() => void) | null> {
  const messaging = await initMessaging();
  if (!messaging) return null;

  return onMessage(messaging, (payload) => {
    callback({
      title: payload.notification?.title,
      body: payload.notification?.body,
    });
  });
}
