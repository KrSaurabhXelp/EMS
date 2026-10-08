importScripts("https://www.gstatic.com/firebasejs/12.5.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.5.0/firebase-messaging-compat.js");

self.addEventListener("install", () => {
    self.skipWaiting();
});

firebase.initializeApp({
    apiKey: "AIzaSyARJkD6lfQ-YYjAazIwwWT0cApgh1G1utg",
    authDomain: "ems-notification-2fb30.firebaseapp.com",
    projectId: "ems-notification-2fb30",
    storageBucket: "ems-notification-2fb30.firebasestorage.app",
    messagingSenderId: "1024694876029",
    appId: "1:1024694876029:web:95c9906672c53c0101fe14"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log("[Service Worker] Received background message ", payload);
    const notificationTitle = payload?.notification?.title || 'EMS Notification';
    const notificationOptions = {
        body: payload?.notification?.body || 'New Notification',
        icon: payload?.notification?.icon || '/favicon.ico'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
