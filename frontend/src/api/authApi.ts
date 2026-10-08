import apiClient from "./client";

export interface LoginPayload {
  email: string;
  password: string;
}

export const loginUser = (credentials: LoginPayload) =>
  apiClient.post("/auth/login", credentials);

export const loginAdmin = loginUser;

export const checkAdminExists = () =>
  apiClient.get<{ exists: boolean }>("/auth/admin-exists");

