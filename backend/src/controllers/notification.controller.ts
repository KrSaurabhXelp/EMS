import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { FcmToken } from "../entities/FcmToken";
import { Notification } from "../entities/Notification";
import { User } from "../entities/User";
import { Employees } from "../entities/Employees";
import { sendPushNotificationToToken, type PushNotificationPayload } from "../config/firebase.config";

export interface CreateNotificationParams {
    title: string;
    message: string;
    type: "task_assigned" | "task_completed" | "task_updated" | "employee_action" | "general" | string;
    employeeId?: number | null;
    userId?: number | null;
    forRole?: "admin" | "hr" | "admin_and_hr" | "employee" | "all" | string | null;
    senderId?: number | null;
    metadata?: Record<string, any>;
}

export const createAndSendNotification = async (params: CreateNotificationParams) => {
    try {
        const notifRepo = AppDataSource.getRepository(Notification);
        const fcmRepo = AppDataSource.getRepository(FcmToken);
        const userRepo = AppDataSource.getRepository(User);
        const empRepo = AppDataSource.getRepository(Employees);

        // 1. Save Notification entity in DB
        const notif = notifRepo.create({
            title: params.title,
            message: params.message,
            type: params.type,
            employeeId: params.employeeId ?? null,
            userId: params.userId ?? null,
            forRole: params.forRole ?? null,
            metadata: params.metadata ? JSON.stringify(params.metadata) : null,
            isRead: false,
        });
        const savedNotification = await notifRepo.save(notif);

        // 2. Determine target FCM tokens
        let targetTokens: string[] = [];

        // If specific employee target
        if (params.employeeId) {
            const tokensByEmp = await fcmRepo.findBy({ employeeId: params.employeeId, isActive: true });
            targetTokens.push(...tokensByEmp.map((t) => t.token));

            // Also check if employee email corresponds to a user account
            const emp = await empRepo.findOneBy({ employeeId: params.employeeId });
            if (emp) {
                const linkedUser = await userRepo.findOneBy({ email: emp.employeeEmail });
                if (linkedUser) {
                    const tokensByUser = await fcmRepo.findBy({ userId: linkedUser.id, isActive: true });
                    targetTokens.push(...tokensByUser.map((t) => t.token));
                }
            }
        }

        // If specific user target
        if (params.userId) {
            const tokens = await fcmRepo.findBy({ userId: params.userId, isActive: true });
            targetTokens.push(...tokens.map((t) => t.token));
        }

        // Role-based targeting
        if (params.forRole === "admin") {
            const adminUsers = await userRepo.find({ where: { role: "admin" } });
            const adminUserIds = adminUsers.map((u) => u.id);
            if (adminUserIds.length > 0) {
                const adminTokens = await fcmRepo
                    .createQueryBuilder("t")
                    .where("t.userId IN (:...adminUserIds) AND t.isActive = true", { adminUserIds })
                    .getMany();
                targetTokens.push(...adminTokens.map((t) => t.token));
            }
        } else if (params.forRole === "hr") {
            // Notifications for HR are also sent to Admin
            const hrAndAdminUsers = await userRepo.find({
                where: [{ role: "hr" }, { role: "admin" }],
            });
            const userIds = hrAndAdminUsers.map((u) => u.id);
            if (userIds.length > 0) {
                const tokens = await fcmRepo
                    .createQueryBuilder("t")
                    .where("t.userId IN (:...userIds) AND t.isActive = true", { userIds })
                    .getMany();
                targetTokens.push(...tokens.map((t) => t.token));
            }
        } else if (params.forRole === "admin_and_hr") {
            const adminAndHrUsers = await userRepo.find({
                where: [{ role: "admin" }, { role: "hr" }],
            });
            const userIds = adminAndHrUsers.map((u) => u.id);
            if (userIds.length > 0) {
                const tokens = await fcmRepo
                    .createQueryBuilder("t")
                    .where("t.userId IN (:...userIds) AND t.isActive = true", { userIds })
                    .getMany();
                targetTokens.push(...tokens.map((t) => t.token));
            }
        } else if (params.forRole === "employee") {
            const empUsers = await userRepo.find({
                where: [{ role: "user" }, { role: "employee" }],
            });
            const empUserIds = empUsers.map((u) => u.id);
            if (empUserIds.length > 0) {
                const tokens = await fcmRepo
                    .createQueryBuilder("t")
                    .where("t.userId IN (:...empUserIds) AND t.isActive = true", { empUserIds })
                    .getMany();
                targetTokens.push(...tokens.map((t) => t.token));
            }
        } else if (params.forRole === "all") {
            const allTokens = await fcmRepo.findBy({ isActive: true });
            targetTokens.push(...allTokens.map((t) => t.token));
        }

        // Deduplicate tokens
        targetTokens = Array.from(new Set(targetTokens));

        // If senderId provided, exclude the sender's own device tokens
        if (params.senderId) {
            const senderTokens = await fcmRepo.findBy({ userId: params.senderId });
            const senderTokenSet = new Set(senderTokens.map((t) => t.token));
            targetTokens = targetTokens.filter((tok) => !senderTokenSet.has(tok));
        }

        // 3. Dispatch push notifications via Firebase
        if (targetTokens.length > 0) {
            const payload: PushNotificationPayload = {
                title: params.title,
                body: params.message,
                icon: "/favicon.ico",
                data: {
                    type: String(params.type),
                    id: String(savedNotification.id),
                    forRole: params.forRole || "",
                    ...(params.metadata
                        ? Object.fromEntries(
                              Object.entries(params.metadata).map(([k, v]) => [k, String(v)])
                          )
                        : {}),
                },
            };

            await Promise.all(
                targetTokens.map(async (tok) => {
                    const res = await sendPushNotificationToToken(tok, payload);
                    if (
                        !res.success &&
                        typeof res.error === "string" &&
                        (res.error.includes("NotRegistered") || res.error.includes("not a valid"))
                    ) {
                        await fcmRepo.delete({ token: tok }).catch(() => {});
                    }
                    return res;
                })
            );
        }

        return savedNotification;
    } catch (error) {
        console.error("Error in createAndSendNotification:", error);
        return null;
    }
};

export const saveFcmToken = async (req: Request, res: Response) => {
    try {
        const { token, employeeId, userId } = req.body;

        if (!token) {
            res.status(400).json({ message: "FCM token is required" });
            return;
        }

        const fcmRepo = AppDataSource.getRepository(FcmToken);
        const userRepo = AppDataSource.getRepository(User);
        const empRepo = AppDataSource.getRepository(Employees);

        let resolvedEmpId = employeeId ?? null;
        let resolvedUserId = userId ?? null;

        // If user logged in, find linked employee by email if not passed
        if (resolvedUserId && !resolvedEmpId) {
            const u = await userRepo.findOneBy({ id: resolvedUserId });
            if (u) {
                const emp = await empRepo.findOneBy({ employeeEmail: u.email });
                if (emp) resolvedEmpId = emp.employeeId;
            }
        }

        // Check if token already exists
        let existing = await fcmRepo.findOneBy({ token });

        if (existing) {
            existing.employeeId = resolvedEmpId ?? existing.employeeId;
            existing.userId = resolvedUserId ?? existing.userId;
            existing.isActive = true;
            await fcmRepo.save(existing);
            res.status(200).json({ message: "Token updated successfully", tokenRecord: existing });
            return;
        }

        const newRecord = fcmRepo.create({
            token,
            employeeId: resolvedEmpId,
            userId: resolvedUserId,
            isActive: true,
        });

        await fcmRepo.save(newRecord);
        res.status(201).json({ message: "Token registered successfully", tokenRecord: newRecord });
    } catch (error: any) {
        console.error("Error saving FCM token:", error);
        res.status(500).json({ message: "Failed to save FCM token", error: error?.message || error });
    }
};

export const getNotifications = async (req: Request, res: Response) => {
    try {
        const currentUser = (req as any).user;
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
        const filter = (req.query.filter as string) || "All";
        const skip = (page - 1) * limit;

        const notifRepo = AppDataSource.getRepository(Notification);
        const qb = notifRepo.createQueryBuilder("n");

        if (currentUser) {
            if (currentUser.role === "admin") {
                // Admin sees all notifications intended for admin, hr, or admin_and_hr, or specific to them
                qb.where("(n.forRole IN ('admin', 'hr', 'admin_and_hr') OR n.userId = :userId)", {
                    userId: currentUser.id,
                });
            } else if (currentUser.role === "hr") {
                // HR sees notifications intended for hr or admin_and_hr, or specific to them
                qb.where("(n.forRole IN ('hr', 'admin_and_hr') OR n.userId = :userId)", {
                    userId: currentUser.id,
                });
            } else {
                // Regular employee/user ONLY sees notifications directly related to them
                const empRepo = AppDataSource.getRepository(Employees);
                const employee = await empRepo.findOneBy({ employeeEmail: currentUser.email });
                if (employee) {
                    qb.where("(n.employeeId = :empId OR n.userId = :userId)", {
                        empId: employee.employeeId,
                        userId: currentUser.id,
                    });
                } else {
                    qb.where("n.userId = :userId", {
                        userId: currentUser.id,
                    });
                }
            }
        }

        // Apply filters
        if (filter.toLowerCase() === "unread") {
            qb.andWhere("n.isRead = :isRead", { isRead: false });
        } else if (filter === "Task Assigned" || filter === "task_assigned") {
            qb.andWhere("n.type = :type", { type: "task_assigned" });
        } else if (filter === "Task Completed" || filter === "task_completed") {
            qb.andWhere("n.type = :type", { type: "task_completed" });
        }

        qb.orderBy("n.createdAt", "DESC");

        // Clone query for unread count
        const unreadQb = notifRepo.createQueryBuilder("n");
        if (currentUser) {
            if (currentUser.role === "admin") {
                unreadQb.where("(n.forRole IN ('admin', 'hr', 'admin_and_hr') OR n.userId = :userId)", {
                    userId: currentUser.id,
                });
            } else if (currentUser.role === "hr") {
                unreadQb.where("(n.forRole IN ('hr', 'admin_and_hr') OR n.userId = :userId)", {
                    userId: currentUser.id,
                });
            } else {
                const empRepo = AppDataSource.getRepository(Employees);
                const employee = await empRepo.findOneBy({ employeeEmail: currentUser.email });
                if (employee) {
                    unreadQb.where("(n.employeeId = :empId OR n.userId = :userId)", {
                        empId: employee.employeeId,
                        userId: currentUser.id,
                    });
                } else {
                    unreadQb.where("n.userId = :userId", {
                        userId: currentUser.id,
                    });
                }
            }
        }
        unreadQb.andWhere("n.isRead = :isRead", { isRead: false });

        const [notifications, total] = await qb.skip(skip).take(limit).getManyAndCount();
        const unreadCount = await unreadQb.getCount();
        const totalPages = Math.ceil(total / limit) || 1;

        res.status(200).json({
            notifications,
            total,
            unreadCount,
            page,
            totalPages,
        });
    } catch (error: any) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ message: "Failed to fetch notifications", error: error?.message || error });
    }
};

export const markNotificationAsRead = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const notifRepo = AppDataSource.getRepository(Notification);
        const notif = await notifRepo.findOneBy({ id });
        if (!notif) {
            res.status(404).json({ message: "Notification not found" });
            return;
        }

        notif.isRead = true;
        await notifRepo.save(notif);
        res.status(200).json({ message: "Notification marked as read", notification: notif });
    } catch (error) {
        console.error("Error marking notification as read:", error);
        res.status(500).json({ message: "Failed to update notification" });
    }
};

export const markAllNotificationsAsRead = async (req: Request, res: Response) => {
    try {
        const currentUser = (req as any).user;
        const notifRepo = AppDataSource.getRepository(Notification);

        const qb = notifRepo
            .createQueryBuilder()
            .update(Notification)
            .set({ isRead: true })
            .where("isRead = :isRead", { isRead: false });

        if (currentUser) {
            if (currentUser.role === "admin") {
                qb.andWhere("(forRole IN ('admin', 'hr', 'admin_and_hr') OR userId = :userId)", {
                    userId: currentUser.id,
                });
            } else if (currentUser.role === "hr") {
                qb.andWhere("(forRole IN ('hr', 'admin_and_hr') OR userId = :userId)", {
                    userId: currentUser.id,
                });
            } else {
                const empRepo = AppDataSource.getRepository(Employees);
                const employee = await empRepo.findOneBy({ employeeEmail: currentUser.email });
                if (employee) {
                    qb.andWhere("(employeeId = :empId OR userId = :userId)", {
                        empId: employee.employeeId,
                        userId: currentUser.id,
                    });
                } else {
                    qb.andWhere("userId = :userId", {
                        userId: currentUser.id,
                    });
                }
            }
        }

        await qb.execute();
        res.status(200).json({ message: "All notifications marked as read" });
    } catch (error: any) {
        console.error("Error marking all notifications as read:", error);
        res.status(500).json({ message: "Failed to mark all as read" });
    }
};

export const sendNotificationToEmployee = async (
    employeeId: number,
    payload: PushNotificationPayload
) => {
    try {
        const fcmRepo = AppDataSource.getRepository(FcmToken);
        const tokens = await fcmRepo.findBy({ employeeId, isActive: true });

        if (!tokens.length) {
            console.log(`No active FCM tokens found for employeeId: ${employeeId}`);
            return { success: false, reason: "No active tokens for this employee" };
        }

        const results = await Promise.all(
            tokens.map((t) => sendPushNotificationToToken(t.token, payload))
        );

        return { success: true, results };
    } catch (error) {
        console.error(`Failed to send notification to employee ${employeeId}:`, error);
        return { success: false, error };
    }
};

export const sendTestNotification = async (req: Request, res: Response) => {
    try {
        const { token, employeeId, title, body } = req.body;

        const payload: PushNotificationPayload = {
            title: title || "Test Notification",
            body: body || "This is a test notification from EMS!",
            icon: "/favicon.ico",
        };

        if (token) {
            const result = await sendPushNotificationToToken(token, payload);
            res.status(200).json({ message: "Test notification dispatched to token", result });
            return;
        }

        if (employeeId) {
            const result = await sendNotificationToEmployee(Number(employeeId), payload);
            res.status(200).json({ message: "Test notification dispatched to employee", result });
            return;
        }

        // Otherwise send to all active tokens
        const fcmRepo = AppDataSource.getRepository(FcmToken);
        const allTokens = await fcmRepo.find({ where: { isActive: true }, take: 10 });

        if (!allTokens.length) {
            res.status(404).json({ message: "No registered FCM tokens found to send test notification" });
            return;
        }

        const results = await Promise.all(
            allTokens.map(async (t) => {
                const res = await sendPushNotificationToToken(t.token, payload);
                if (
                    !res.success &&
                    typeof res.error === "string" &&
                    (res.error.includes("NotRegistered") || res.error.includes("not a valid"))
                ) {
                    await fcmRepo.delete({ id: t.id }).catch(() => {});
                }
                return res;
            })
        );

        res.status(200).json({ message: "Broadcast test notification dispatched", results });
    } catch (error: any) {
        console.error("Error sending test notification:", error);
        res.status(500).json({ message: "Failed to send test notification", error: error?.message || error });
    }
};
