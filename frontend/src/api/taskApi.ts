import apiClient from "./client";

export const getTasks = async () => {
    const response = await apiClient.get("/tasks");
    return response.data;
};

export const createTasks = async (task: any) => {
    const response = await apiClient.post("/tasks", task);
    return response.data;
};

export const updateTask = async (id: string | number, task: any) => {
    const response = await apiClient.put(`/tasks/${id}`, task);
    return response.data;
};

export const deleteTask = async (id: string | number) => {
    const response = await apiClient.delete(`/tasks/${id}`);
    return response.data;
};
