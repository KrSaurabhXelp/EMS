import apiClient from "./client";

export const getEmployees = async () => {
    const response = await apiClient.get("/employees");
    return response.data;
};

export const createEmployee = async (employee: any) => {
    const response = await apiClient.post("/employees", employee);
    return response.data;
};

export const updateEmployee = async (id: string | number, employee: any) => {
    const response = await apiClient.put(`/employees/${id}`, employee);
    return response.data;
};

export const deleteEmployee = async (id: string | number) => {
    const response = await apiClient.delete(`/employees/${id}`);
    return response.data;
};