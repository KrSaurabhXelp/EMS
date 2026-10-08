import apiClient from "./client";

export interface DashboardStatsResponse {
  counts: {
    employees: number;
    totalTasks: number;
    pending: number;
    inProgress: number;
    completed: number;
  };
  recentEmployees: Array<{
    id: number;
    code: string;
    name: string;
    designation: string;
    email: string;
    mobile: string;
    status: string;
  }>;
  recentTasks: Array<{
    id: number;
    code: string;
    title: string;
    description: string;
    assignedTo: string;
    priority: string;
    dueDate: string;
    status: string;
  }>;
}

export const getDashboardStats = () =>
  apiClient.get<DashboardStatsResponse>("/dashboard/stats");
