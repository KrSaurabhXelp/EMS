import { Router } from "express";
import {
    saveFcmToken,
    sendTestNotification,
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
} from "../controllers/notification.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();

router.get("/notifications", authenticateToken, getNotifications);
router.patch("/notifications/mark-all-read", authenticateToken, markAllNotificationsAsRead);
router.patch("/notifications/:id/read", authenticateToken, markNotificationAsRead);

router.post("/notifications/save-token", saveFcmToken);
router.post("/notifications/test", sendTestNotification);

export default router;
