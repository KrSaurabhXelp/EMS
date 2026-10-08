import apiClient from "./client";

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  type: "task_assigned" | "task_completed" | "general" | string;
  employeeId?: number | null;
  userId?: number | null;
  forRole?: string | null;
  isRead: boolean;
  metadata?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsResponse {
  notifications: AppNotification[];
  total: number;
  unreadCount: number;
  page: number;
  totalPages: number;
}

export interface SaveTokenPayload {
  token: string;
  employeeId?: number;
  userId?: number;
}

export const getNotifications = async (params?: {
  page?: number;
  limit?: number;
  filter?: string;
}): Promise<NotificationsResponse> => {
  const response = await apiClient.get("/notifications", { params });
  return response.data;
};

export const markNotificationAsRead = async (id: number) => {
  const response = await apiClient.patch(`/notifications/${id}/read`);
  return response.data;
};

export const markAllNotificationsAsRead = async () => {
  const response = await apiClient.patch("/notifications/mark-all-read");
  return response.data;
};

export const saveFcmToken = (payload: SaveTokenPayload) =>
  apiClient.post("/notifications/save-token", payload);

export const sendTestPushNotification = (payload: {
  token?: string;
  employeeId?: number;
  title?: string;
  body?: string;
}) => apiClient.post("/notifications/test", payload);
