import { useState, useEffect, useCallback } from 'react';
import { isSupported } from 'firebase/messaging';
import { requestNotificationPermission } from '../lib/fcm';

export function useFCM(userId?: string) {
  const [supported, setSupported] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    isSupported().then(setSupported).catch(() => setSupported(false));
    if (typeof Notification !== 'undefined') {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!userId || !supported) return null;
    setLoading(true);
    try {
      const token = await requestNotificationPermission(userId);
      setPermissionStatus(Notification.permission);
      return token;
    } finally {
      setLoading(false);
    }
  }, [userId, supported]);

  return {
    supported,
    permissionStatus,
    loading,
    requestPermission,
  };
}
