import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getMessaging, type Messaging } from "firebase-admin/messaging";

import fs from "fs";
import path from "path";

let messagingInstance: Messaging | null = null;

export const getFirebaseAdminMessaging = (): Messaging | null => {
    if (messagingInstance) return messagingInstance;

    try {
        const serviceAccountPath = path.resolve(__dirname, "serviceAccountKey.json");
        if (fs.existsSync(serviceAccountPath)) {
            if (!getApps().length) {
                initializeApp({
                    credential: cert(serviceAccountPath)
                });
            }
            messagingInstance = getMessaging();
            return messagingInstance;
        }

        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY;

        if (!projectId || !clientEmail || !privateKey) {
            console.warn("⚠️ Firebase Admin credentials not set in backend .env");
            return null;
        }

        if (!getApps().length) {
            initializeApp({
                credential: cert({
                    projectId,
                    clientEmail,
                    privateKey: privateKey.replace(/\\n/g, "\n")
                })
            });
        }
        messagingInstance = getMessaging();
        return messagingInstance;
    } catch (error) {
        console.error("Failed to initialize Firebase Admin SDK:", error);
        return null;
    }
};

export interface PushNotificationPayload {
    title: string;
    body: string;
    icon?: string;
    data?: Record<string, string>;
}

export const sendPushNotificationToToken = async (
    token: string,
    payload: PushNotificationPayload
) => {
    const messaging = getFirebaseAdminMessaging();
    if (!messaging) {
        console.warn("Skipping notification: Firebase Admin is not initialized.");
        return { success: false, reason: "Firebase Admin not initialized" };
    }

    try {
        const response = await messaging.send({
            token,
            notification: {
                title: payload.title,
                body: payload.body,
            },
            data: payload.data || {},
            webpush: {
                notification: {
                    title: payload.title,
                    body: payload.body,
                    icon: payload.icon || "/favicon.ico",
                }
            }
        });
        console.log("Push notification sent successfully:", response);
        return { success: true, messageId: response };
    } catch (error: any) {
        console.error("Error sending push notification to token:", error?.message || error);
        return { success: false, error: error?.message || error };
    }
};