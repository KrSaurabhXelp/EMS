import { getToken, onMessage, deleteToken } from 'firebase/messaging'
import { getFirebaseMessaging } from '../config/firebase.config';


export const requestNotificationPermission = async (forceRefresh = false) => {
    try {
        if (!("Notification" in window)) {
            console.warn("Notifications not supported in this browser");
            return null;
        }

        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
            console.log("Notification permission denied");
            return null;
        }

        const messaging = await getFirebaseMessaging();
        if (!messaging) {
            return null;
        }

        let serviceWorkerRegistration;
        if ("serviceWorker" in navigator) {
            serviceWorkerRegistration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
            // Ensure service worker is updated immediately
            try {
                await serviceWorkerRegistration.update();
            } catch (err) {
                console.warn("Service worker update warning:", err);
            }
        }

        if (forceRefresh) {
            try {
                await deleteToken(messaging);
                console.log("Old cached FCM token deleted.");
            } catch (delErr) {
                console.warn("Could not delete existing token:", delErr);
            }
        }

        const token = await getToken(messaging, {
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
            serviceWorkerRegistration
        });

        console.log("FCM Token:", token);
        return token;
    } catch (error) {
        console.error("Error generating FCM token:", error);
        return null;
    }
}

export const listenForForegroundMessages = async (callback) => {
    try {
        const messaging = await getFirebaseMessaging();
        if (!messaging) {
            return null;
        }
        return onMessage(messaging, (payload) => {
            console.log("Foreground message received:", payload);
            if (callback) {
                callback(payload);
            }
        });
    } catch (error) {
        console.error("Error setting up foreground message listener:", error);
        return null;
    }
}
