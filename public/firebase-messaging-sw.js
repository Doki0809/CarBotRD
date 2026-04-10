// Firebase Messaging Service Worker
// Uses compat CDN scripts — ES modules are not supported in service workers.

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Hardcoded config — SW has no access to the app module system.
firebase.initializeApp({
  apiKey: "AIzaSyCAkn8JxrTEyJ_fgA8VVbbheTMPm4lCjH4",
  authDomain: "carbot-5d709.firebaseapp.com",
  projectId: "carbot-5d709",
  storageBucket: "carbot-5d709.firebasestorage.app",
  messagingSenderId: "497790785110",
  appId: "1:497790785110:web:09a07aeba43b9505794df7",
  measurementId: "G-WPR5MC5J0L"
});

const messaging = firebase.messaging();

// Background message handler — fires when the app is not in the foreground.
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification ?? {};
  const notificationTitle = title || 'CarBot';
  const notificationOptions = {
    body: body || '',
    icon: '/logoapp.png',
    badge: '/logoapp.png',
    vibrate: [200, 100, 200],
    data: payload.data ?? {},
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
