import { create } from "zustand";
import {
  type AppNotification,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  saveFcmToken,
} from "../api/notificationApi";
import { requestNotificationPermission } from "../service/notification.service";

interface NotificationStore {
  isOpen: boolean;
  notifications: AppNotification[];
  unreadCount: number;
  total: number;
  page: number;
  totalPages: number;
  filter: string;
  loading: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  setFilter: (filter: string) => void;
  setPage: (page: number) => void;
  fetchNotifications: (page?: number, filter?: string) => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
  registerFcm: (userId?: number, employeeId?: number) => Promise<void>;
  handleRealtimeNotification: (payload: any) => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  isOpen: false,
  notifications: [],
  unreadCount: 0,
  total: 0,
  page: 1,
  totalPages: 1,
  filter: "All",
  loading: false,

  openDrawer: () => {
    set({ isOpen: true });
    get().fetchNotifications();
  },

  closeDrawer: () => set({ isOpen: false }),

  toggleDrawer: () => {
    const nextState = !get().isOpen;
    set({ isOpen: nextState });
    if (nextState) {
      get().fetchNotifications();
    }
  },

  setFilter: (filter: string) => {
    set({ filter, page: 1 });
    get().fetchNotifications(1, filter);
  },

  setPage: (page: number) => {
    set({ page });
    get().fetchNotifications(page, get().filter);
  },

  fetchNotifications: async (pageArg?: number, filterArg?: string) => {
    const page = pageArg ?? get().page;
    const filter = filterArg ?? get().filter;
    set({ loading: true });

    try {
      const res = await getNotifications({ page, limit: 10, filter });
      set({
        notifications: res.notifications || [],
        total: res.total || 0,
        unreadCount: res.unreadCount || 0,
        page: res.page || 1,
        totalPages: res.totalPages || 1,
      });
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      set({ loading: false });
    }
  },

  markAsRead: async (id: number) => {
    try {
      await markNotificationAsRead(id);
      set((state) => {
        const updated = state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        );
        const wasUnread = state.notifications.find((n) => n.id === id && !n.isRead);
        return {
          notifications: updated,
          unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
        };
      });
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  },

  markAllRead: async () => {
    try {
      await markAllNotificationsAsRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));
    } catch (err) {
      console.error("Failed to mark all notifications read:", err);
    }
  },

  registerFcm: async (userId?: number, employeeId?: number) => {
    try {
      const token = await requestNotificationPermission();
      if (token) {
        await saveFcmToken({ token, userId, employeeId });
        console.log("FCM token registered with backend successfully");
      }
    } catch (err) {
      console.error("Error registering FCM token:", err);
    }
  },

  handleRealtimeNotification: (payload: any) => {
    // When a foreground message is received from Firebase
    const notifData = payload?.notification || {};
    const extraData = payload?.data || {};

    const newNotification: AppNotification = {
      id: extraData.id ? Number(extraData.id) : Date.now(),
      title: notifData.title || "New Notification",
      message: notifData.body || "",
      type: extraData.type || "general",
      isRead: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((state) => ({
      notifications: [newNotification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
      total: state.total + 1,
    }));
  },
}));
