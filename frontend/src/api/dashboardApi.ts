import axios from "axios";

const API = "http://192.168.2.237:5000/api";

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
  axios.get<DashboardStatsResponse>(`${API}/dashboard/stats`);
