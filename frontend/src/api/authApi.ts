import axios from "axios";

const API = "http://192.168.2.237:5000/api";

export interface LoginPayload {
  email: string;
  password: string;
}

export const loginUser = (credentials: LoginPayload) =>
  axios.post(`${API}/auth/login`, credentials);

export const loginAdmin = loginUser;

export const checkAdminExists = () =>
  axios.get<{ exists: boolean }>(`${API}/auth/admin-exists`);
