/* eslint-disable no-undef */
// Firebase Messaging Service Worker
// Handles background push notifications when the app tab is closed or inactive.

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCkG_tMe-XeJtY9vl3Hk_mFDSUzDmeJ3Qw',
  authDomain: 'serasan-web.firebaseapp.com',
  projectId: 'serasan-web',
  storageBucket: 'serasan-web.firebasestorage.app',
  messagingSenderId: '130939515514',
  appId: '1:130939515514:web:82f695051d1ee05cf301c3',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Lead Manager';
  const options = {
    body: payload.notification?.body || 'Tienes una nueva notificación',
    icon: '/logos/serasan-icon.png',
    badge: '/logos/serasan-icon.png',
    data: payload.data,
  };

  self.registration.showNotification(title, options);
});

// Handle notification click — focus or open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow('/');
    })
  );
});
